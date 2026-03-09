import io
import json
import os
import logging
from google.auth.transport.requests import Request as GoogleRequest
from google.auth.exceptions import RefreshError
from typing import Any

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
        # Set GOOGLE_OAUTH_TOKEN_JSON in production (e.g. Render).
        self.token_json = os.getenv("GOOGLE_OAUTH_TOKEN_JSON", "").strip() or None
        self.token_path = os.getenv(
            "GOOGLE_OAUTH_TOKEN_PATH",
            os.path.join(os.path.dirname(__file__), "..", "..", "planning", "oauth_token.json"),
        )
        self.token_source = "env" if self.token_json else None
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
        self.service = None
        self.credentials: Credentials | None = None

    def _load_token_json(self) -> str | None:
        if self.token_json:
            self.token_source = "env"
            return self.token_json

        try:
            if self.token_path and os.path.exists(self.token_path):
                with open(self.token_path, "r", encoding="utf-8") as token_file:
                    self.token_json = token_file.read().strip() or None
                if self.token_json:
                    self.token_source = "file"
                    return self.token_json
        except Exception:
            logging.getLogger(__name__).exception("Failed to read token file")

        return None

    def _persist_token_json(self, token_json: str) -> None:
        self.token_json = token_json
        if self.token_source != "file":
            return
        if not self.token_path:
            return
        try:
            with open(self.token_path, "w", encoding="utf-8") as token_file:
                token_file.write(token_json)
        except Exception:
            logging.getLogger(__name__).warning("Failed to persist refreshed token to file", exc_info=True)

    def get_token_status(self) -> dict[str, Any]:
        token_json = self._load_token_json()
        if not token_json:
            return {
                "configured": False,
                "source": None,
                "token_path": self.token_path,
            }

        try:
            info = json.loads(token_json)
            creds = Credentials.from_authorized_user_info(info, SCOPES)
            expiry = getattr(creds, "expiry", None)
            return {
                "configured": True,
                "source": self.token_source,
                "token_path": self.token_path if self.token_source == "file" else None,
                "has_refresh_token": bool(getattr(creds, "refresh_token", None)),
                "expired": bool(getattr(creds, "expired", False)),
                "valid": bool(getattr(creds, "valid", False)),
                "scopes": list(getattr(creds, "scopes", []) or []),
                "expiry": expiry.isoformat().replace("+00:00", "Z") if expiry else None,
            }
        except Exception as exc:
            return {
                "configured": False,
                "source": self.token_source,
                "token_path": self.token_path if self.token_source == "file" else None,
                "error": str(exc),
            }

    def ensure_service(self):
        if self.service:
            return
        token_json = self._load_token_json()
        if not token_json:
            raise RuntimeError(
                "GOOGLE_OAUTH_TOKEN_JSON not set and no token file found. Please set the authorized-user JSON in the environment or provide a token file."
            )

        try:
            info = json.loads(token_json)
            creds = Credentials.from_authorized_user_info(info, SCOPES)

            # If credentials are expired but have a refresh token, try to refresh them.
            if getattr(creds, "expired", False) and getattr(creds, "refresh_token", None):
                try:
                    creds.refresh(GoogleRequest())
                    refreshed_json = creds.to_json()
                    self._persist_token_json(refreshed_json)
                except RefreshError as re:
                    logging.getLogger(__name__).exception("Failed to refresh credentials: %s", re)
                    raise RuntimeError(
                        "Failed to refresh OAuth credentials (possible invalid_grant). Please re-authorize via the /api/auth/drive/start flow."
                    ) from re

            self.credentials = creds
            self.service = build("drive", "v3", credentials=creds)
        except Exception as exc:
            logging.getLogger(__name__).exception("Failed to load credentials from GOOGLE_OAUTH_TOKEN_JSON or token file")
            raise RuntimeError("Failed to load credentials from GOOGLE_OAUTH_TOKEN_JSON or token file") from exc

    def _build_service(self):
        # try to reuse the same resolution logic as ensure_service
        try:
            self.ensure_service()
            return self.service
        except RuntimeError:
            raise

    def _execute(self, request):
        try:
            return request.execute()
        except HttpError as exc:
            status = getattr(getattr(exc, "resp", None), "status", None)
            message = ""
            if getattr(exc, "content", None):
                message = exc.content.decode("utf-8", errors="ignore")
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
            # if the existing file is not owned by the currently authenticated user,
            # create a new file owned by the OAuth user to avoid service-account quota issues
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
                    #logging.getLogger(__name__).debug("timeline file %s not owned by %s, creating new file", existing, user_email)
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
            if "storageQuotaExceeded" in msg or "Service Accounts do not have storage quota" in msg:
                # fallback: read JSON from file description metadata
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
            if "storageQuotaExceeded" in msg or "Service Accounts do not have storage quota" in msg:
                # try creating a new file owned by the OAuth user; if that fails, fallback to description
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
                    payload_text = payload.decode("utf-8")
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
