from typing import List, Optional, Any
from uuid import uuid4
import json
import mimetypes
import re
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel

from services.auth_service import verify_access_token, require_admin
from services.drive_service import DriveService
from .storage import get_drive_service

router = APIRouter()

PROJECTS_FILE = "projects.json"


class ProjectPayload(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    image: Optional[str] = None
    github: Optional[str] = None
    demo: Optional[str] = None
    skills: Optional[List[str]] = None
    index: Optional[int] = None
    section: Optional[str] = None
    # allow extra fields
    class Config:
        extra = "allow"


class ProjectOrderItem(BaseModel):
    id: str
    index: int


class ProjectOrderPayload(BaseModel):
    items: List[ProjectOrderItem]


def _normalize_section(value: str | None) -> str:
    return value if value in {"main", "other"} else "main"


def _sort_projects(projects: list[dict]) -> list[dict]:
    section_order = {"main": 0, "other": 1}
    return sorted(
        projects,
        key=lambda p: (
            section_order.get(_normalize_section(p.get("section")), 99),
            int(p.get("index", 10**9)) if str(p.get("index", "")).isdigit() or isinstance(p.get("index"), int) else 10**9,
            str(p.get("title", "")).lower(),
        ),
    )


def _normalize_projects(projects: list[dict]) -> list[dict]:
    normalized = _sort_projects(projects)
    per_section_index: dict[str, int] = {"main": 0, "other": 0}
    for project in normalized:
        section = _normalize_section(project.get("section"))
        project["section"] = section
        project["index"] = per_section_index[section]
        per_section_index[section] += 1
        project["section"] = _normalize_section(project.get("section"))
    return normalized


def _slugify_filename(value: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9]+", "-", (value or "project-image").strip()).strip("-").lower()
    return base or "project-image"


def _extract_drive_file_id(value: str) -> str | None:
    if not value:
        return None
    match = re.search(r"(?:id=|/d/|/file/d/)([a-zA-Z0-9_-]+)", value)
    if match:
        return match.group(1)
    if re.fullmatch(r"[a-zA-Z0-9_-]{10,}", value):
        return value
    return None



@router.post("/upload-image")
async def upload_project_image(
    file: UploadFile = File(...),
    projectTitle: str | None = Form(default=None),
    _admin=Depends(require_admin),
    service: DriveService = Depends(get_drive_service),
):
    """
    Upload an image for a project to Google Drive.
    Returns { ok, url, file_id } where url is the public Drive URL.
    """
    try:
        data = await file.read()
        mime = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "image/jpeg"
        ext = mimetypes.guess_extension(mime) or ""
        safe_name = _slugify_filename(projectTitle or file.filename or "project-image")
        filename = f"{safe_name}{ext}" if ext and not safe_name.endswith(ext) else safe_name
        result = service.upload_image(data, filename, mime)
        return {"ok": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {exc}")


@router.get("/image/{file_id}")
async def project_image(file_id: str, service: DriveService = Depends(get_drive_service)):
    try:
        service.ensure_service()
        meta = service._execute(
            service.service.files().get(
                fileId=file_id,
                fields="mimeType,name",
                supportsAllDrives=True,
            )
        )
        content = service._execute(
            service.service.files().get_media(
                fileId=file_id,
                supportsAllDrives=True,
            )
        )
        media_type = meta.get("mimeType") or "application/octet-stream"
        headers = {"Cache-Control": "public, max-age=86400"}
        return Response(content=content, media_type=media_type, headers=headers)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Image not found: {exc}")


@router.get("/image")
async def project_image_from_url(url: str, service: DriveService = Depends(get_drive_service)):
    file_id = _extract_drive_file_id(url)
    if not file_id:
        raise HTTPException(status_code=400, detail="Invalid drive image url")
    return await project_image(file_id, service)


@router.get("")
@router.get("/")
async def list_projects(service: DriveService = Depends(get_drive_service)):
    try:
        projects = service.read_json_file(PROJECTS_FILE)
        # Explicitly source projects from Drive only. If not present, return empty list.
        if not projects:
            projects = []
        for idx, project in enumerate(projects):
            if project.get("index") is None:
                project["index"] = idx
            project["section"] = _normalize_section(project.get("section"))
        projects = _normalize_projects(projects)
        return {"projects": projects}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read projects: {exc}")


# Note: sync-local removed — projects are now managed exclusively on Google Drive.


@router.post("")
@router.post("/")
async def create_project(project: ProjectPayload, _admin=Depends(require_admin), service: DriveService = Depends(get_drive_service)):
    try:
        projects = service.read_json_file(PROJECTS_FILE) or []
        item = project.model_dump()
        if not item.get("id"):
            item["id"] = str(uuid4())
        if item.get("index") is None:
            section = _normalize_section(item.get("section"))
            item["index"] = sum(1 for p in projects if _normalize_section(p.get("section")) == section)
        item["section"] = _normalize_section(item.get("section"))
        projects.append(item)
        file_id = service.write_json_file(PROJECTS_FILE, _normalize_projects(projects))
        return {"ok": True, "file_id": file_id, "project": item}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create project: {exc}")


@router.patch("/{project_id}")
async def update_project(project_id: str, project: ProjectPayload, _admin=Depends(require_admin), service: DriveService = Depends(get_drive_service)):
    try:
        projects = service.read_json_file(PROJECTS_FILE) or []
        found = False
        updated = None
        for idx, p in enumerate(projects):
            if p.get("id") == project_id:
                merged = {**p, **project.model_dump()}
                if merged.get("index") is None:
                    merged["index"] = p.get("index", idx)
                merged["section"] = _normalize_section(merged.get("section"))
                projects[idx] = merged
                found = True
                updated = merged
                break
        if not found:
            raise HTTPException(status_code=404, detail="Project not found")
        file_id = service.write_json_file(PROJECTS_FILE, _normalize_projects(projects))
        return {"ok": True, "file_id": file_id, "project": updated}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update project: {exc}")


@router.put("/reorder")
async def reorder_projects(payload: ProjectOrderPayload, _admin=Depends(require_admin), service: DriveService = Depends(get_drive_service)):
    try:
        projects = service.read_json_file(PROJECTS_FILE) or []
        order_map = {item.id: item.index for item in payload.items}
        for idx, project in enumerate(projects):
            if project.get("id") in order_map:
                project["index"] = order_map[project["id"]]
            elif project.get("index") is None:
                project["index"] = idx
            project["section"] = _normalize_section(project.get("section"))
        projects = _normalize_projects(projects)
        file_id = service.write_json_file(PROJECTS_FILE, projects)
        return {"ok": True, "file_id": file_id, "projects": projects}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to reorder projects: {exc}")


@router.delete("/{project_id}")
async def delete_project(project_id: str, _admin=Depends(require_admin), service: DriveService = Depends(get_drive_service)):
    try:
        projects = service.read_json_file(PROJECTS_FILE) or []
        before_len = len(projects)
        new_projects = [p for p in projects if p.get("id") != project_id]
        if len(new_projects) == before_len:
            raise HTTPException(status_code=404, detail="Project not found")
        file_id = service.write_json_file(PROJECTS_FILE, _normalize_projects(new_projects))
        return {"ok": True, "file_id": file_id}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {exc}")
