import io
import json
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload

SCOPES = ["https://www.googleapis.com/auth/drive"]
TIMELINE_FILE = "timeline_events.json"
TIMELINE_MIME = "application/json"
USERS_FILE = "users.json"


class DriveService:
    def __init__(self):
        self.oauth_token_json = os.getenv("GOOGLE_DRIVE_OAUTH_TOKEN_JSON", "").strip() or None
        self.oauth_token_path = os.getenv(
            "GOOGLE_DRIVE_OAUTH_TOKEN_PATH",
            os.path.join(os.path.dirname(__file__), "..", "..", "planning", "oauth_token.json"),
        )
        self.token_source: str | None = None
        self.last_oauth_error: str | None = None
        # support both the canonical env var and the older/alternate name used in .env.example
        self.timeline_folder_id = (
            os.getenv("GOOGLE_DRIVE_TIMELINE_FOLDER_ID")
            or os.getenv("GOOGLE_DRIVE_PORTFOLIO_FOLDER_ID")
            or ""
        )
        self.timeline_folder_id = self.timeline_folder_id.strip() or None
        self.timeline_file_id = os.getenv("GOOGLE_DRIVE_TIMELINE_FILE_ID", "").strip() or None
        # Projects folder id (can be set via env). If not set, a folder named "Projects" will be used/created.
        self.projects_folder_id = os.getenv("GOOGLE_DRIVE_PROJECTS_FOLDER_ID", "").strip() or None
        self.storage_mode = os.getenv("GOOGLE_DRIVE_STORAGE_MODE", "auto").strip().lower()
        self.prefer_description_storage = self.storage_mode == "description"
        self.service = None
        self.credentials: Credentials | None = None

    @staticmethod
    def _is_quota_error(message: str) -> bool:
        return "storageQuotaExceeded" in message

    def _load_oauth_token_info(self) -> dict[str, Any] | None:
        if self.oauth_token_json:
            try:
                info = json.loads(self.oauth_token_json)
                self.token_source = "oauth-env"
                return info
            except Exception:
                logging.getLogger(__name__).exception("Failed to parse GOOGLE_DRIVE_OAUTH_TOKEN_JSON")

        try:
            if self.oauth_token_path and os.path.exists(self.oauth_token_path):
                with open(self.oauth_token_path, "r", encoding="utf-8") as fh:
                    info = json.load(fh)
                self.token_source = "oauth-file"
                return info
        except Exception:
            logging.getLogger(__name__).exception("Failed to parse GOOGLE_DRIVE_OAUTH_TOKEN_PATH file")

        return None

    @staticmethod
    def _parse_expiry(expiry_value: Any) -> datetime | None:
        if not expiry_value or not isinstance(expiry_value, str):
            return None
        try:
            value = expiry_value.strip()
            if value.endswith("Z"):
                value = value[:-1] + "+00:00"
            parsed = datetime.fromisoformat(value)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed
        except Exception:
            return None

    @staticmethod
    def _extract_http_error_message(exc: HttpError) -> str:
        if getattr(exc, "content", None):
            try:
                return exc.content.decode("utf-8", errors="ignore")
            except Exception:
                return str(exc)
        return str(exc)

    @staticmethod
    def _format_exception_message(exc: Exception) -> str:
        msg = str(exc).strip()
        return msg or exc.__class__.__name__

    def _build_oauth_credentials(self, info: dict[str, Any]) -> Credentials:
        required_keys = ["refresh_token", "client_id", "client_secret", "token_uri"]
        missing = [key for key in required_keys if not info.get(key)]
        if missing:
            missing_keys = ", ".join(missing)
            raise RuntimeError(f"GOOGLE_DRIVE_OAUTH_TOKEN_JSON is missing required keys: {missing_keys}")

        creds = Credentials(
            token=info.get("token") or None,
            refresh_token=info.get("refresh_token"),
            token_uri=info.get("token_uri"),
            client_id=info.get("client_id"),
            client_secret=info.get("client_secret"),
            scopes=info.get("scopes") or SCOPES,
        )

        parsed_expiry = self._parse_expiry(info.get("expiry"))
        if parsed_expiry is not None:
            # google-auth internals use naive UTC datetimes for expiry comparisons
            if parsed_expiry.tzinfo is not None:
                parsed_expiry = parsed_expiry.astimezone(timezone.utc).replace(tzinfo=None)
            creds.expiry = parsed_expiry

        return creds

    def _rebuild_service(self) -> None:
        if self.credentials is None:
            raise RuntimeError("Google Drive OAuth credentials are not initialized")
        self.service = build("drive", "v3", credentials=self.credentials)

    def _refresh_access_token_if_needed(self, force: bool = False) -> bool:
        if self.credentials is None:
            raise RuntimeError("Google Drive OAuth credentials are not initialized")

        now = datetime.now(timezone.utc)
        expiry = self.credentials.expiry
        if isinstance(expiry, datetime) and expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)

        should_refresh = force or not self.credentials.token
        if isinstance(expiry, datetime) and expiry <= (now + timedelta(seconds=60)):
            should_refresh = True

        if not should_refresh:
            return False

        try:
            self.credentials.refresh(GoogleAuthRequest())
            self.last_oauth_error = None
            return True
        except Exception as exc:
            self.last_oauth_error = self._format_exception_message(exc)
            logging.getLogger(__name__).exception("Failed to refresh Google Drive OAuth access token")
            raise RuntimeError(
                f"Failed to refresh Google Drive OAuth access token: {self.last_oauth_error}"
            ) from exc

    def _normalize_expiry(self, value: datetime | None) -> str | None:
        if not isinstance(value, datetime):
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()

    def get_token_status(self) -> dict[str, Any]:
        oauth_info = self._load_oauth_token_info()
        if oauth_info:
            parsed_expiry = self._parse_expiry(oauth_info.get("expiry"))
            now = datetime.now(timezone.utc)
            status: dict[str, Any] = {
                "configured": True,
                "source": self.token_source,
                "auth_mode": "oauth_refresh_token",
                "client_id": oauth_info.get("client_id"),
                "token_uri": oauth_info.get("token_uri"),
                "scopes": oauth_info.get("scopes") or SCOPES,
                "valid": True,
                "expired": bool(parsed_expiry and parsed_expiry <= now),
                "has_refresh_token": bool(oauth_info.get("refresh_token")),
                "expiry": self._normalize_expiry(parsed_expiry),
            }
            if self.last_oauth_error:
                status["auth_error"] = self.last_oauth_error
            return status

        return {
            "configured": False,
            "source": None,
            "auth_mode": None,
            "expected_env": ["GOOGLE_DRIVE_OAUTH_TOKEN_JSON", "GOOGLE_DRIVE_OAUTH_TOKEN_PATH"],
        }

    def ensure_service(self):
        if self.service and self.credentials:
            if self._refresh_access_token_if_needed(force=False):
                self._rebuild_service()
            return

        oauth_info = self._load_oauth_token_info()
        if not oauth_info:
            raise RuntimeError(
                "No Google Drive OAuth token configured. Set GOOGLE_DRIVE_OAUTH_TOKEN_JSON with refresh_token, client_id, client_secret and token_uri."
            )

        try:
            self.credentials = self._build_oauth_credentials(oauth_info)
            self._refresh_access_token_if_needed(force=not bool(self.credentials.token))
            self._rebuild_service()
            self.last_oauth_error = None
        except Exception as exc:
            root_error = self._format_exception_message(exc)
            self.last_oauth_error = root_error
            logging.getLogger(__name__).exception("Failed to initialize Google Drive OAuth credentials")
            raise RuntimeError(f"Failed to initialize Google Drive OAuth credentials: {root_error}") from exc

    def _build_service(self):
        # try to reuse the same resolution logic as ensure_service
        try:
            self.ensure_service()
            return self.service
        except RuntimeError:
            raise

    def _execute(self, request):
        self.ensure_service()
        try:
            return request.execute()
        except HttpError as exc:
            status = getattr(getattr(exc, "resp", None), "status", None)
            if status == 401:
                self._refresh_access_token_if_needed(force=True)
                try:
                    return request.execute()
                except HttpError as retry_exc:
                    retry_status = getattr(getattr(retry_exc, "resp", None), "status", None)
                    retry_message = self._extract_http_error_message(retry_exc)
                    raise RuntimeError(
                        f"Google Drive API error after OAuth refresh (status={retry_status}): {retry_message}"
                    ) from retry_exc

            message = self._extract_http_error_message(exc)
            raise RuntimeError(f"Google Drive API error (status={status}): {message}") from exc

    def _find_timeline_file(self) -> str | None:
        if self.timeline_file_id:
            return self.timeline_file_id

        # ensure the Drive service / credentials are initialized
        self.ensure_service()

        conditions = [f"name = '{TIMELINE_FILE}'", "trashed = false"]
        if self.timeline_folder_id:
            conditions.append(f"'{self.timeline_folder_id}' in parents")
        query = " and ".join(conditions)

        result = self._execute(
            self.service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name)",
                includeItemsFromAllDrives=True,
                supportsAllDrives=True,
                pageSize=1,
            )
        )
        files = result.get("files", [])
        return files[0]["id"] if files else None

    # Generic helpers for JSON files stored in Drive
    def _find_file_by_name(self, name: str) -> str | None:
        if not name:
            return None
        # ensure the Drive service / credentials are initialized
        self.ensure_service()

        conditions = [f"name = '{name}'", "trashed = false"]
        if self.timeline_folder_id:
            conditions.append(f"'{self.timeline_folder_id}' in parents")
        query = " and ".join(conditions)

        result = self._execute(
            self.service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name)",
                includeItemsFromAllDrives=True,
                supportsAllDrives=True,
                pageSize=1,
            )
        )
        files = result.get("files", [])
        return files[0]["id"] if files else None

    def _get_or_create_folder(self, folder_name: str, parent_id: str | None = None) -> str:
        """Return folder id for folder_name; create if not exists.

        If parent_id is provided, the folder will be searched/created under that parent.
        """
        if not folder_name:
            raise RuntimeError("folder_name required")
        # ensure service
        self.ensure_service()
        # search for folder (optionally under parent)
        conditions = [f"name = '{folder_name}'", "mimeType = 'application/vnd.google-apps.folder'", "trashed = false"]
        if parent_id:
            conditions.append(f"'{parent_id}' in parents")
        q = " and ".join(conditions)
        res = self._execute(
            self.service.files().list(
                q=q,
                spaces="drive",
                fields="files(id, name)",
                includeItemsFromAllDrives=True,
                supportsAllDrives=True,
                pageSize=1,
            )
        )
        files = res.get("files", [])
        if files:
            return files[0]["id"]
        # create folder (optionally under parent)
        metadata: dict[str, Any] = {"name": folder_name, "mimeType": "application/vnd.google-apps.folder"}
        if parent_id:
            metadata["parents"] = [parent_id]
        created = self._execute(
            self.service.files().create(
                body=metadata,
                fields="id,name",
                supportsAllDrives=True,
            )
        )
        return created["id"]

    def read_json_file(self, name: str) -> Any:
        if not name:
            return None
        file_id = self._find_file_by_name(name)
        if not file_id:
            return None
        self.ensure_service()
        try:
            content = self._execute(
                self.service.files().get_media(
                    fileId=file_id,
                    supportsAllDrives=True,
                )
            )
            text = content.decode("utf-8") if isinstance(content, bytes) else str(content)
            if not text.strip():
                return None
            return json.loads(text)
        except RuntimeError as exc:
            # fallback to description field
            try:
                meta = self._execute(
                    self.service.files().get(
                        fileId=file_id,
                        fields="description",
                        supportsAllDrives=True,
                    )
                )
                desc = meta.get("description", "") or ""
                if not desc.strip():
                    return None
                return json.loads(desc)
            except Exception:
                raise

    def write_json_file(self, name: str, data: Any) -> str:
        if not name:
            raise RuntimeError("name is required")
        # find or create
        file_id = self._find_file_by_name(name)
        payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        media = MediaIoBaseUpload(io.BytesIO(payload), mimetype=TIMELINE_MIME, resumable=False)

        if not file_id:
            metadata: dict[str, Any] = {
                "name": name,
                "mimeType": TIMELINE_MIME,
            }
            if self.timeline_folder_id:
                metadata["parents"] = [self.timeline_folder_id]
            self.ensure_service()
            created = self._execute(
                self.service.files().create(
                    body=metadata,
                    media_body=MediaIoBaseUpload(io.BytesIO(payload), mimetype=TIMELINE_MIME, resumable=False),
                    fields="id,size,modifiedTime",
                    supportsAllDrives=True,
                )
            )
            self.timeline_file_id = created["id"]
            return created["id"]

        # update existing
        self.ensure_service()
        updated = self._execute(
            self.service.files().update(
                fileId=file_id,
                media_body=media,
                fields="id,size,modifiedTime",
                supportsAllDrives=True,
            )
        )
        return updated["id"]

    def _create_timeline_file(self) -> str:
        metadata: dict[str, Any] = {
            "name": TIMELINE_FILE,
            "mimeType": TIMELINE_MIME,
        }
        if self.timeline_folder_id:
            metadata["parents"] = [self.timeline_folder_id]

        self.ensure_service()
        if self.prefer_description_storage:
            metadata["description"] = "[]"
            created = self._execute(
                self.service.files().create(
                    body=metadata,
                    fields="id",
                    supportsAllDrives=True,
                )
            )
        else:
            created = self._execute(
                self.service.files().create(
                    body=metadata,
                    media_body=MediaIoBaseUpload(
                        io.BytesIO(b"[]"),
                        mimetype=TIMELINE_MIME,
                        resumable=False,
                    ),
                    fields="id",
                    supportsAllDrives=True,
                )
            )
        return created["id"]

    def _get_or_create_timeline_file(self) -> str:
        existing = self._find_timeline_file()
        if existing:
            # If the existing file owner differs from the active identity, create a new file.
            try:
                self.ensure_service()
                info = self._execute(
                    self.service.files().get(
                        fileId=existing,
                        fields="owners(emailAddress)",
                        supportsAllDrives=True,
                    )
                )
                owners = info.get("owners", []) or []
                # get authenticated user's email
                about = self._execute(self.service.about().get(fields="user"))
                user_email = about.get("user", {}).get("emailAddress")
                owner_emails = [o.get("emailAddress") for o in owners if o.get("emailAddress")]
                if user_email and user_email not in owner_emails:
                    return self._create_timeline_file()
            except Exception:
                # if any metadata check fails, fall back to using the existing file id
                pass
            return existing
        return self._create_timeline_file()

    def read_timeline_events(self) -> list[dict[str, Any]]:
        file_id = self._find_timeline_file()
        if not file_id:
            return []
        self.ensure_service()
        if self.prefer_description_storage:
            meta = self._execute(
                self.service.files().get(
                    fileId=file_id,
                    fields="description",
                    supportsAllDrives=True,
                )
            )
            desc = meta.get("description", "") or ""
            if not desc.strip():
                return []
            parsed = json.loads(desc)
            if not isinstance(parsed, list):
                raise RuntimeError("Timeline description content is not a JSON array")
            return parsed

        try:
            content = self._execute(
                self.service.files().get_media(
                    fileId=file_id,
                    supportsAllDrives=True,
                )
            )
            text = content.decode("utf-8") if isinstance(content, bytes) else str(content)
            if not text.strip():
                return []

            parsed = json.loads(text)
            if not isinstance(parsed, list):
                raise RuntimeError("Timeline file content is not a JSON array")
            return parsed
        except RuntimeError as exc:
            msg = str(exc)
            if self._is_quota_error(msg):
                if self.storage_mode == "media":
                    raise RuntimeError(
                        "Media storage is enforced (GOOGLE_DRIVE_STORAGE_MODE=media) but Drive quota is unavailable for this identity. "
                        "Use a Shared Drive/freigegebenen Ordner with proper permissions, or switch to GOOGLE_DRIVE_STORAGE_MODE=description."
                    ) from exc
                # fallback: read JSON from file description metadata
                self.prefer_description_storage = True
                meta = self._execute(
                    self.service.files().get(
                        fileId=file_id,
                        fields="description",
                        supportsAllDrives=True,
                    )
                )
                desc = meta.get("description", "") or ""
                if not desc.strip():
                    return []
                parsed = json.loads(desc)
                if not isinstance(parsed, list):
                    raise RuntimeError("Timeline description content is not a JSON array")
                return parsed
            raise

    def write_timeline_events(self, events: list[dict[str, Any]]) -> str:
        file_id = self._get_or_create_timeline_file()
        payload = json.dumps(events, ensure_ascii=False, indent=2).encode("utf-8")
        payload_text = payload.decode("utf-8")
        if self.prefer_description_storage:
            self.ensure_service()
            updated = self._execute(
                self.service.files().update(
                    fileId=file_id,
                    body={"description": payload_text},
                    fields="id,size,modifiedTime,description",
                    supportsAllDrives=True,
                )
            )
            self.timeline_file_id = updated["id"]
            return updated["id"]

        media = MediaIoBaseUpload(io.BytesIO(payload), mimetype=TIMELINE_MIME, resumable=False)

        self.ensure_service()
        try:
            updated = self._execute(
                self.service.files().update(
                    fileId=file_id,
                    media_body=media,
                    fields="id,size,modifiedTime",
                    supportsAllDrives=True,
                )
            )
        except RuntimeError as exc:
            msg = str(exc)
            if self._is_quota_error(msg):
                if self.storage_mode == "media":
                    raise RuntimeError(
                        "Media storage is enforced (GOOGLE_DRIVE_STORAGE_MODE=media) but upload quota is unavailable for this identity. "
                        "Move target to Shared Drive/freigegebenen Ordner and ensure the OAuth identity has access."
                    ) from exc
                self.prefer_description_storage = True
                # Try creating a new file; if that fails, fallback to description metadata.
                metadata: dict[str, Any] = {"name": TIMELINE_FILE, "mimeType": TIMELINE_MIME}
                if self.timeline_folder_id:
                    metadata["parents"] = [self.timeline_folder_id]

                try:
                    created = self._execute(
                        self.service.files().create(
                            body=metadata,
                            media_body=MediaIoBaseUpload(io.BytesIO(payload), mimetype=TIMELINE_MIME, resumable=False),
                            fields="id,size,modifiedTime",
                            supportsAllDrives=True,
                        )
                    )
                    updated = created
                except RuntimeError:
                    # fallback to storing JSON in the file description
                    updated = self._execute(
                        self.service.files().update(
                            fileId=file_id,
                            body={"description": payload_text},
                            fields="id,size,modifiedTime,description",
                            supportsAllDrives=True,
                        )
                    )
            else:
                raise
        self.timeline_file_id = updated["id"]
        return updated["id"]

    def upload_image(self, data: bytes, filename: str, mime_type: str = "image/jpeg") -> dict:
        """Upload an image to Google Drive, make it publicly readable, and return its URL + file_id."""
        self.ensure_service()
        metadata: dict[str, Any] = {"name": filename}
        # Put project images into Projects folder under the portfolio/timeline folder if possible
        projects_parent = None
        if self.projects_folder_id:
            projects_parent = self.projects_folder_id
        else:
            try:
                # prefer creating Projects under the configured timeline/portfolio folder
                projects_parent = self._get_or_create_folder("Projects", parent_id=self.timeline_folder_id)
            except Exception:
                # fallback: try creating Projects at root
                try:
                    projects_parent = self._get_or_create_folder("Projects")
                except Exception:
                    projects_parent = None
        if projects_parent:
            metadata["parents"] = [projects_parent]

        media = MediaIoBaseUpload(io.BytesIO(data), mimetype=mime_type, resumable=False)
        created = self._execute(
            self.service.files().create(
                body=metadata,
                media_body=media,
                fields="id,name",
                supportsAllDrives=True,
            )
        )
        file_id = created["id"]

        # Make the file publicly readable
        try:
            self._execute(
                self.service.permissions().create(
                    fileId=file_id,
                    body={"type": "anyone", "role": "reader"},
                    supportsAllDrives=True,
                )
            )
        except Exception:
            pass  # best effort – image may still be accessible via token

        public_url = f"https://drive.google.com/uc?export=view&id={file_id}"
        return {"file_id": file_id, "url": public_url, "name": filename}

    def get_storage_quota(self) -> dict[str, Any]:
        self.ensure_service()
        info = self._execute(self.service.about().get(fields="storageQuota,user"))
        return {
            "user": info.get("user", {}),
            "storageQuota": info.get("storageQuota", {}),
        }
