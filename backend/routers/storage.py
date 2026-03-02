from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from services.drive_service import DriveService

router = APIRouter()
drive_service = None


DEFAULT_TIMELINE_EVENTS = [
    {
        "id": "default-portfolio-launch",
        "title": "Portfolio Launch",
        "start": "2026-03-01",
        "end": "2026-03-01",
        "description": "Portfolio project is live.",
        "deletedAt": None,
    },
    {
        "id": "default-chess-tournament",
        "title": "Chess Tournament",
        "start": "2026-02-10",
        "end": "2026-02-15",
        "description": "Participated in a blitz event.",
        "deletedAt": None,
    },
    {
        "id": "default-music-release",
        "title": "Music Release",
        "start": "2026-01-10",
        "end": "2026-01-20",
        "description": "Released a new track.",
        "deletedAt": None,
    },
]


def get_drive_service() -> DriveService:
    global drive_service
    if drive_service is None:
        drive_service = DriveService()
    return drive_service


class TimelineEventPayload(BaseModel):
    id: Optional[str] = None
    title: str
    start: str
    end: str
    description: Optional[str] = ""
    deletedAt: Optional[str] = None


class TimelineEventsPayload(BaseModel):
    events: List[TimelineEventPayload]

@router.post("/upload")
async def upload_file(folder_name: str, file: UploadFile = File(...)):
    # Simple dependency setup or token validation could go here
    service = get_drive_service()
    content = await file.read()
    file_id = service.upload_file(file.filename, content, file.content_type, folder_name)
    return {"message": "File uploaded successfully", "file_id": file_id}

@router.get("/list")
async def list_files(folder_name: str = "portfolio"):
    service = get_drive_service()
    files = service.list_files(folder_name)
    return {"files": files}


@router.get("/timeline/events")
async def get_timeline_events(include_deleted: bool = False):
    try:
        service = get_drive_service()
        events = service.read_timeline_events()
        if not events:
            events = DEFAULT_TIMELINE_EVENTS
            try:
                service.write_timeline_events(events)
            except Exception:
                pass
        if include_deleted:
            return {"events": events}
        return {"events": [event for event in events if not event.get("deletedAt")]}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Drive read failed ({type(exc).__name__}): {repr(exc)}",
        )


@router.put("/timeline/events")
async def save_timeline_events(payload: TimelineEventsPayload):
    try:
        service = get_drive_service()
        sanitized = []
        for event in payload.events:
            event_dict = event.model_dump()
            if not event_dict.get("id"):
                event_dict["id"] = str(uuid4())
            sanitized.append(event_dict)

        file_id = service.write_timeline_events(sanitized)
        return {"ok": True, "file_id": file_id, "events": sanitized}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Drive write failed ({type(exc).__name__}): {repr(exc)}",
        )


@router.patch("/timeline/events/{event_id}/soft-delete")
async def soft_delete_timeline_event(event_id: str):
    try:
        service = get_drive_service()
        events = service.read_timeline_events()
        deleted_at = datetime.now(timezone.utc).isoformat()

        updated = False
        for event in events:
            if event.get("id") == event_id and not event.get("deletedAt"):
                event["deletedAt"] = deleted_at
                updated = True
                break

        if not updated:
            raise HTTPException(status_code=404, detail="Timeline event not found")

        file_id = service.write_timeline_events(events)
        return {"ok": True, "file_id": file_id, "deletedAt": deleted_at}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Drive write failed ({type(exc).__name__}): {repr(exc)}",
        )
