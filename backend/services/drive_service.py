import io
import json
import os
import logging
from typing import Any

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload

SCOPES = ["https://www.googleapis.com/auth/drive"]
PORTFOLIO_FOLDER = "portfolio"
TIMELINE_FOLDER = "timeline"
TIMELINE_FILE = "timeline_events.json"


logging.basicConfig(level=logging.DEBUG)


class DriveService:
    def __init__(self):
        self.service = self._build_service()
        self.timeline_folder_id_override = os.getenv("GOOGLE_DRIVE_TIMELINE_FOLDER_ID")
        self.timeline_file_id_override = os.getenv("GOOGLE_DRIVE_TIMELINE_FILE_ID")
        self.shared_root_folder_id = os.getenv("GOOGLE_DRIVE_SHARED_ROOT_FOLDER_ID")
        self.portfolio_folder_id = None
        if not self.timeline_folder_id_override and not self.timeline_file_id_override:
            self.portfolio_folder_id = self._get_or_create_folder(
                PORTFOLIO_FOLDER,
                self.shared_root_folder_id,
            )

    def _build_service(self):
        credentials_path = os.getenv("GOOGLE_DRIVE_CREDENTIALS_PATH")
        candidates = [
            credentials_path,
            os.path.join(
                os.path.dirname(__file__),
                "..",
                "..",
                "planning",
                "master-purpose-459609-m3-4f50d48eaae4.json",
            ),
            os.path.join(
                os.path.dirname(__file__),
                "..",
                "..",
                "planning",
                "client_secret_336033174250-n7dc3gs96v5o9dmsiqjfuscf73umheki.apps.googleusercontent.com.json",
            ),
        ]
        for candidate in candidates:
            if candidate and os.path.exists(candidate):
                creds = Credentials.from_service_account_file(candidate, scopes=SCOPES)
                return build("drive", "v3", credentials=creds)
        raise RuntimeError(
            "No valid Google service account credentials found. "
            "Set GOOGLE_DRIVE_CREDENTIALS_PATH to a service account JSON file."
        )

    def _execute(self, request):
        try:
            return request.execute()
        except HttpError as exc:
            content = ""
            if getattr(exc, "content", None):
                content = exc.content.decode("utf-8", errors="ignore")
            status = getattr(getattr(exc, "resp", None), "status", None)
            raise RuntimeError(
                f"Google Drive API error (status={status}): {content}"
            ) from exc

    def _get_or_create_folder(self, folder_name: str, parent_id: str | None = None) -> str:
        query = (
            f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' "
            "and trashed = false"
        )
        if parent_id:
            query += f" and '{parent_id}' in parents"

        results = self._execute(
            self.service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name)",
                includeItemsFromAllDrives=True,
                supportsAllDrives=True,
            )
        )
        items = results.get("files", [])

        if items:
            return items[0]["id"]

        metadata = {
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        if parent_id:
            metadata["parents"] = [parent_id]

        created = self._execute(
            self.service.files().create(
                body=metadata,
                fields="id",
                supportsAllDrives=True,
            )
        )
        return created["id"]

    def _timeline_folder_id(self) -> str:
        if self.timeline_folder_id_override:
            return self.timeline_folder_id_override
        return self._get_or_create_folder(TIMELINE_FOLDER, self.portfolio_folder_id)

    def _find_file_in_folder(self, file_name: str, folder_id: str) -> dict[str, Any] | None:
        query = f"name = '{file_name}' and '{folder_id}' in parents and trashed = false"
        results = self._execute(
            self.service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name, modifiedTime)",
                includeItemsFromAllDrives=True,
                supportsAllDrives=True,
            )
        )
        files = results.get("files", [])
        return files[0] if files else None

    def _get_file_metadata(self, file_id: str) -> dict[str, Any]:
        return self._execute(
            self.service.files().get(
                fileId=file_id,
                fields="id,name,mimeType,size,description",
                supportsAllDrives=True,
            )
        )

    def _create_empty_timeline_file(self, folder_id: str) -> str:
        metadata = {
            "name": TIMELINE_FILE,
            "parents": [folder_id],
            "mimeType": "application/json",
            "description": "[]",
        }
        created = self._execute(
            self.service.files().create(
                body=metadata,
                fields="id",
                supportsAllDrives=True,
            )
        )
        return created["id"]

    def _read_events_from_metadata(self, file_id: str) -> list[dict[str, Any]]:
        metadata = self._get_file_metadata(file_id)
        description = (metadata.get("description") or "").strip()
        if not description:
            return []
        parsed = json.loads(description)
        return parsed if isinstance(parsed, list) else []

    def _is_storage_quota_error(self, exc: RuntimeError) -> bool:
        message = str(exc)
        return "storageQuotaExceeded" in message or "Service Accounts do not have storage quota" in message

    def _update_metadata_description(self, file_id: str, content: str) -> None:
        self._execute(
            self.service.files().update(
                fileId=file_id,
                body={"description": content},
                fields="id",
                supportsAllDrives=True,
            )
        )

    def _download_text(self, file_id: str) -> str:
        response = self._execute(
            self.service.files().get_media(fileId=file_id, supportsAllDrives=True)
        )
        return response.decode("utf-8") if isinstance(response, bytes) else str(response)

    def read_timeline_events(self) -> list[dict[str, Any]]:
        existing = None
        if self.timeline_file_id_override:
            existing = {"id": self.timeline_file_id_override}
        else:
            folder_id = self._timeline_folder_id()
            existing = self._find_file_in_folder(TIMELINE_FILE, folder_id)
        if not existing:
            return []

        metadata_events: list[dict[str, Any]] | None = None
        try:
            metadata = self._get_file_metadata(existing["id"])
            description = (metadata.get("description") or "").strip()
            if description:
                parsed_desc = json.loads(description)
                if isinstance(parsed_desc, list):
                    metadata_events = parsed_desc
                    if parsed_desc:
                        return parsed_desc
        except Exception:
            metadata_events = None

        try:
            content = self._download_text(existing["id"]).strip()
            if not content:
                return metadata_events or []
            parsed = json.loads(content)
            if isinstance(parsed, list):
                return parsed
            return metadata_events or []
        except Exception:
            return metadata_events or []

    def write_timeline_events(self, events: list[dict[str, Any]]) -> str:
        folder_id = None
        if self.timeline_file_id_override:
            existing = {"id": self.timeline_file_id_override}
        else:
            folder_id = self._timeline_folder_id()
            existing = self._find_file_in_folder(TIMELINE_FILE, folder_id)
            if not existing:
                try:
                    existing = {"id": self._create_empty_timeline_file(folder_id)}
                except RuntimeError as exc:
                    if not self._is_storage_quota_error(exc):
                        raise

        content = json.dumps(events, ensure_ascii=False, indent=2)
        logging.debug("Uploading events: %s", content)
        media = MediaIoBaseUpload(
            io.BytesIO(content.encode("utf-8")),
            mimetype="application/json",
            resumable=False,
        )

        if existing:
            try:
                updated = self._execute(
                    self.service.files().update(
                        fileId=existing["id"],
                        media_body=media,
                        fields="id",
                        supportsAllDrives=True,
                    )
                )
                logging.debug("Updated file ID: %s", updated["id"])
                try:
                    self._update_metadata_description(existing["id"], content)
                except Exception:
                    pass
                return updated["id"]
            except RuntimeError as exc:
                if not self._is_storage_quota_error(exc):
                    raise
                self._update_metadata_description(existing["id"], content)
                return existing["id"]

        metadata = {"name": TIMELINE_FILE, "parents": [folder_id]}
        try:
            created = self._execute(
                self.service.files().create(
                    body=metadata,
                    media_body=media,
                    fields="id",
                    supportsAllDrives=True,
                )
            )
            logging.debug("Created file ID: %s", created["id"])
            try:
                self._update_metadata_description(created["id"], content)
            except Exception:
                pass
            return created["id"]
        except RuntimeError as exc:
            if not self._is_storage_quota_error(exc):
                raise
            fallback_file_id = self._create_empty_timeline_file(folder_id)
            self._update_metadata_description(fallback_file_id, content)
            logging.debug("Fallback file ID: %s", fallback_file_id)
            return fallback_file_id

    def list_files(self, subfolder: str = "") -> list[dict[str, Any]]:
        if not self.portfolio_folder_id:
            return []

        parent_id = self.portfolio_folder_id
        if subfolder:
            parent_id = self._get_or_create_folder(subfolder, parent_id)

        query = f"'{parent_id}' in parents and trashed = false"
        results = self._execute(
            self.service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name, mimeType)",
                includeItemsFromAllDrives=True,
                supportsAllDrives=True,
            )
        )
        return results.get("files", [])

    def upload_file(
        self,
        filename: str,
        content: bytes,
        mime_type: str,
        subfolder: str = "",
    ) -> str:
        if not self.portfolio_folder_id:
            raise RuntimeError(
                "upload_file requires portfolio folder mode. "
                "Set GOOGLE_DRIVE_TIMELINE_FOLDER_ID/FILE_ID only for timeline endpoints."
            )

        parent_id = self.portfolio_folder_id
        if subfolder:
            parent_id = self._get_or_create_folder(subfolder, parent_id)

        metadata = {"name": filename, "parents": [parent_id]}
        media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mime_type, resumable=False)
        uploaded = self._execute(
            self.service.files().create(
                body=metadata,
                media_body=media,
                fields="id",
                supportsAllDrives=True,
            )
        )
        return uploaded["id"]
