from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel

from services.auth_service import require_admin, verify_access_token
from services.drive_service import DriveService

router = APIRouter()

SCHEMAS_FILE = "survey_schemas.json"
ALLOWED_ROLES = {"friend", "global", "admin"}


class SaveSchemaPayload(BaseModel):
    filename: str
    data: Any
    oldFilename: Optional[str] = None


def _require_portfolio_access(authorization: str | None = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    token = authorization.split(" ", 1)[1]
    try:
        payload = verify_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    role = payload.get("role")
    if role not in ALLOWED_ROLES and payload.get("sub") != "admin":
        raise HTTPException(status_code=403, detail="Friend/global/admin role required")
    return payload


def _get_drive() -> DriveService:
    return DriveService()


def _load_schema_map(drive: DriveService) -> dict[str, Any]:
    loaded = drive.read_json_file(SCHEMAS_FILE)
    if isinstance(loaded, dict):
        return loaded
    return {}


def _normalize_filename(filename: str) -> str:
    name = (filename or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Missing filename")
    if "/" in name or "\\" in name:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not name.endswith(".json"):
        name = f"{name}.json"
    return name


@router.get("/schemas")
async def list_schemas(
    _auth=Depends(_require_portfolio_access),
    drive: DriveService = Depends(_get_drive),
):
    data = _load_schema_map(drive)
    files = sorted(data.keys(), key=lambda x: x.lower())
    return {"files": files}


@router.get("/schema")
async def load_schema(
    filename: str = Query(...),
    _auth=Depends(_require_portfolio_access),
    drive: DriveService = Depends(_get_drive),
):
    safe_name = _normalize_filename(filename)
    data = _load_schema_map(drive)
    if safe_name not in data:
        raise HTTPException(status_code=404, detail="Schema not found")
    return data[safe_name]


@router.post("/schema")
async def save_schema(
    payload: SaveSchemaPayload,
    _admin=Depends(require_admin),
    drive: DriveService = Depends(_get_drive),
):
    safe_name = _normalize_filename(payload.filename)
    old_name = _normalize_filename(payload.oldFilename) if payload.oldFilename else None

    data = _load_schema_map(drive)
    if old_name and old_name != safe_name:
        data.pop(old_name, None)

    data[safe_name] = payload.data
    drive.write_json_file(SCHEMAS_FILE, data)
    return {"success": True, "file": safe_name}
