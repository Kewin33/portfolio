from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4
import copy
import logging

from fastapi import APIRouter, Depends, HTTPException
from services.auth_service import require_admin
from pydantic import BaseModel

from services.drive_service import DriveService
import json
from pathlib import Path

router = APIRouter()
_drive_service: DriveService | None = None


DEFAULT_TIMELINE_EVENTS = [
    {
        "id": "default-portfolio-launch",
        "title": "Portfolio Launch",
        "start": "2026-03-01",
        "end": "2026-03-01",
        "description": "Portfolio project is live.",
        "tags": ["release", "portfolio"],
        "deletedAt": None,
    },
    {
        "id": "default-chess-tournament",
        "title": "Chess Tournament",
        "start": "2026-02-10",
        "end": "2026-02-15",
        "description": "Participated in a blitz event.",
        "tags": ["chess", "tournament"],
        "deletedAt": None,
    },
]


def get_drive_service() -> DriveService:
    global _drive_service
    if _drive_service is None:
        _drive_service = DriveService()
    return _drive_service


def reset_drive_service() -> None:
    global _drive_service
    _drive_service = None


class TimelineEventPayload(BaseModel):
    id: Optional[str] = None
    title: str
    start: str
    end: str
    description: Optional[str] = ""
    tags: Optional[list[str]] = None
    deletedAt: Optional[str] = None


class TimelineEventsPayload(BaseModel):
    events: List[TimelineEventPayload]


class TagRenamePayload(BaseModel):
    from_tag: str
    to_tag: str


class TagCreatePayload(BaseModel):
    tag: str
    color: Optional[str] = None


def _tags_meta_path() -> Path:
    # timeline_tags.json stored inside backend for versioned deployment
    repo_root = Path(__file__).resolve().parents[1]
    return repo_root / "data" / "timeline_tags.json"


def _backup_timeline_path() -> Path:
    repo_root = Path(__file__).resolve().parents[1]
    return repo_root / ".." / "planning" / "backups"


def _backup_events(events: list[dict], reason: str) -> str:
    try:
        p = _backup_timeline_path()
        p.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(timezone.utc).isoformat().replace(":", "_")
        safe_reason = "".join(ch for ch in reason if ch.isalnum() or ch in ('-', '_'))[:64]
        fname = f"timeline_backup_{ts}_{safe_reason}.json"
        target = p / fname
        with target.open("w", encoding="utf-8") as fh:
            json.dump(events, fh, ensure_ascii=False, indent=2)
        return str(target)
    except Exception as exc:
        try:
            logging.getLogger(__name__).exception("Failed to write timeline backup: %s", exc)
        except Exception:
            pass
        return ""


def _load_tags_meta() -> dict:
    p = _tags_meta_path().resolve()
    if not p.exists():
        return {}
    try:
        with p.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {}


def _save_tags_meta(mapping: dict):
    p = _tags_meta_path().resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8") as fh:
        json.dump(mapping, fh, ensure_ascii=False, indent=2)


@router.get("/timeline/events")
async def get_timeline_events(
    include_deleted: bool = False,
    tags: Optional[str] = None,
    service: DriveService = Depends(get_drive_service),
):
    try:
        events = service.read_timeline_events()
        if not events:
            events = DEFAULT_TIMELINE_EVENTS
            service.write_timeline_events(events)

        # parse tags query param (comma-separated) into list
        filter_tags: list[str] | None = None
        if tags:
            filter_tags = [t.strip() for t in tags.split(",") if t.strip()]

        def event_visible(ev: dict) -> bool:
            if not include_deleted and ev.get("deletedAt"):
                return False
            if not filter_tags:
                return True
            ev_tags = ev.get("tags") or []
            # match if any tag overlaps (OR semantics)
            return any(t in ev_tags for t in filter_tags)

        visible = [event for event in events if event_visible(event)]
        tag_colors = _load_tags_meta()
        return {"events": visible, "tagColors": tag_colors}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Drive read failed: {exc}")


@router.put("/timeline/events")
async def save_timeline_events(
    payload: TimelineEventsPayload,
    _admin=Depends(require_admin),
    service: DriveService = Depends(get_drive_service),
):
    try:
        # Read current events and merge with incoming payload to avoid accidental overwrites
        current_events = service.read_timeline_events() or []

        # build mapping of existing events by id
        existing_by_id: dict[str, dict] = {}
        for ev in current_events:
            if ev.get("id"):
                existing_by_id[ev["id"]] = ev

        result_events: list[dict] = []

        # Process incoming events: update existing or create new
        original_ids = set(existing_by_id.keys())
        num_created = 0
        for event in payload.events:
            item = event.model_dump()
            # ensure id
            if not item.get("id"):
                item["id"] = str(uuid4())
            # normalize tags
            tags_val = item.get("tags")
            if tags_val is None:
                item["tags"] = []
            else:
                item["tags"] = [str(t) for t in tags_val]

            # if event exists, replace fields (preserve any fields not provided?)
            if item["id"] in existing_by_id:
                # merge: prefer incoming fields, but keep unknown existing keys
                merged = {**existing_by_id[item["id"]], **item}
                result_events.append(merged)
                # mark as consumed
                existing_by_id.pop(item["id"], None)
            else:
                num_created += 1
                result_events.append(item)

        # Append any remaining existing events that were not part of the incoming payload
        for leftover in existing_by_id.values():
            result_events.append(leftover)

        # expected_count = current_count + num_created (we do not delete via PUT merge)
        current_count = len(current_events)
        expected_count = current_count + num_created

        file_id = service.write_timeline_events(result_events)
        # verify by reading back
        after = service.read_timeline_events() or []
        actual_count = len(after)
        count_ok = actual_count == expected_count
        response = {"ok": True, "file_id": file_id, "events": result_events, "count_ok": count_ok, "expected_count": expected_count, "actual_count": actual_count}
        if not count_ok:
            # store a backup of the events as read before the write
            try:
                backup_path = _backup_events(current_events, "put_before")
                if backup_path:
                    response["backup_path"] = backup_path
            except Exception:
                pass
        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Drive write failed: {exc}")


@router.patch("/timeline/events/{event_id}/soft-delete")
async def soft_delete_timeline_event(
    event_id: str,
    _admin=Depends(require_admin),
    service: DriveService = Depends(get_drive_service),
):
    try:
        events = service.read_timeline_events() or []
        # keep a copy of the events read from storage before modification
        events_before = copy.deepcopy(events)
        before_count = len(events_before)
        deleted_at = datetime.now(timezone.utc).isoformat()

        found = False
        for event in events:
            if event.get("id") == event_id and not event.get("deletedAt"):
                event["deletedAt"] = deleted_at
                found = True
                break

        if not found:
            raise HTTPException(status_code=404, detail="Timeline event not found")

        file_id = service.write_timeline_events(events)
        # read back to ensure write succeeded and counts match expectation (no change)
        after_events = service.read_timeline_events() or []
        actual_count = len(after_events)
        expected_count = before_count
        count_ok = actual_count == expected_count
        response = {"ok": True, "file_id": file_id, "deletedAt": deleted_at, "count_ok": count_ok, "expected_count": expected_count, "actual_count": actual_count}
        if not count_ok:
            try:
                backup_path = _backup_events(events_before, f"soft-delete_before_{event_id}")
                if backup_path:
                    response["backup_path"] = backup_path
            except Exception:
                pass
        return response
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Drive write failed: {exc}")


@router.patch("/timeline/events/{event_id}/restore")
async def restore_timeline_event(
    event_id: str,
    _admin=Depends(require_admin),
    service: DriveService = Depends(get_drive_service),
):
    try:
        events = service.read_timeline_events() or []
        events_before = copy.deepcopy(events)
        before_count = len(events_before)

        found = False
        for event in events:
            if event.get("id") == event_id and event.get("deletedAt"):
                event["deletedAt"] = None
                found = True
                break

        if not found:
            raise HTTPException(status_code=404, detail="Timeline event not found")

        file_id = service.write_timeline_events(events)
        after_events = service.read_timeline_events() or []
        actual_count = len(after_events)
        expected_count = before_count
        count_ok = actual_count == expected_count
        response = {"ok": True, "file_id": file_id, "count_ok": count_ok, "expected_count": expected_count, "actual_count": actual_count}
        if not count_ok:
            try:
                backup_path = _backup_events(events_before, f"restore_before_{event_id}")
                if backup_path:
                    response["backup_path"] = backup_path
            except Exception:
                pass
        return response
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Drive write failed: {exc}")


@router.delete("/timeline/events/{event_id}")
async def delete_timeline_event_permanently(
    event_id: str,
    _admin=Depends(require_admin),
    service: DriveService = Depends(get_drive_service),
):
    try:
        events = service.read_timeline_events() or []
        events_before = copy.deepcopy(events)
        initial_len = len(events_before)
        new_events = [ev for ev in events_before if ev.get("id") != event_id]

        if len(new_events) == initial_len:
            raise HTTPException(status_code=404, detail="Timeline event not found")

        file_id = service.write_timeline_events(new_events)
        after_events = service.read_timeline_events() or []
        actual_count = len(after_events)
        expected_count = initial_len - 1
        count_ok = actual_count == expected_count
        response = {"ok": True, "file_id": file_id, "count_ok": count_ok, "expected_count": expected_count, "actual_count": actual_count}
        if not count_ok:
            try:
                backup_path = _backup_events(events_before, f"permanent_delete_before_{event_id}")
                if backup_path:
                    response["backup_path"] = backup_path
            except Exception:
                pass
        return response
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Drive write failed: {exc}")


@router.get("/drive/quota")
async def drive_quota(service: DriveService = Depends(get_drive_service)):
    try:
        return service.get_storage_quota()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to get quota: {exc}")


@router.get("/timeline/tags")
async def list_timeline_tags(service: DriveService = Depends(get_drive_service)):
    try:
        events = service.read_timeline_events()
        counts: dict[str, int] = {}
        for ev in events:
            for t in ev.get("tags") or []:
                counts[t] = counts.get(t, 0) + 1
        meta = _load_tags_meta()
        tags = [
            {"tag": k, "count": v, "color": meta.get(k)}
            for k, v in sorted(counts.items(), key=lambda x: (-x[1], x[0]))
        ]
        return {"tags": tags}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list tags: {exc}")


@router.post("/timeline/tags/rename")
async def rename_timeline_tag(payload: TagRenamePayload, _admin=Depends(require_admin), service: DriveService = Depends(get_drive_service)):
    try:
        events = service.read_timeline_events()
        changed = False
        for ev in events:
            tags = ev.get("tags") or []
            if payload.from_tag in tags:
                tags = [payload.to_tag if t == payload.from_tag else t for t in tags]
                # dedupe while preserving order
                seen: set[str] = set()
                deduped: list[str] = []
                for t in tags:
                    if t not in seen:
                        deduped.append(t)
                        seen.add(t)
                ev["tags"] = deduped
                changed = True

        if changed:
            service.write_timeline_events(events)
            # update metadata mapping
            meta = _load_tags_meta()
            if payload.from_tag in meta:
                if payload.to_tag not in meta:
                    meta[payload.to_tag] = meta.pop(payload.from_tag)
                else:
                    meta.pop(payload.from_tag, None)
            _save_tags_meta(meta)
        return {"ok": True, "changed": changed}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to rename tag: {exc}")


@router.delete("/timeline/tags/{tag}")
async def delete_timeline_tag(tag: str, _admin=Depends(require_admin), service: DriveService = Depends(get_drive_service)):
    try:
        events = service.read_timeline_events()
        changed = False
        for ev in events:
            tags = ev.get("tags") or []
            new_tags = [t for t in tags if t != tag]
            if len(new_tags) != len(tags):
                ev["tags"] = new_tags
                changed = True

        if changed:
            service.write_timeline_events(events)
            meta = _load_tags_meta()
            if tag in meta:
                meta.pop(tag, None)
                _save_tags_meta(meta)
        return {"ok": True, "deleted": changed}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete tag: {exc}")



@router.post("/timeline/tags")
async def create_or_update_tag(payload: TagCreatePayload, _admin=Depends(require_admin)):
    try:
        if not payload.tag or not payload.tag.strip():
            raise HTTPException(status_code=400, detail="Tag name required")
        name = payload.tag.strip()
        meta = _load_tags_meta()
        if payload.color:
            meta[name] = payload.color.strip()
        else:
            meta.setdefault(name, None)
        _save_tags_meta(meta)
        return {"ok": True, "tag": name, "color": meta.get(name)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create/update tag: {exc}")
