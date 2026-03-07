from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, Any
from uuid import uuid4
import os
import json
import logging
import hashlib

from services.drive_service import DriveService
from services.auth_service import create_access_token, verify_access_token, require_admin

router = APIRouter()

ADMIN_NOTIFY_EMAIL = os.getenv("ADMIN_NOTIFY_EMAIL", "qingzhi1002@gmail.com")
USERS_FILENAME = "users.json"


def _get_drive() -> DriveService:
    return DriveService()


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()



class RegisterPayload(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class LoginPayload(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(payload: RegisterPayload):
    drive = _get_drive()
    try:
        users = drive.read_json_file(USERS_FILENAME) or []
    except Exception:
        users = []

    for u in users:
        if u.get("email") == payload.email:
            raise HTTPException(status_code=409, detail="User already exists")

    user = {
        "id": str(uuid4()),
        "email": payload.email,
        "password_hash": _hash_password(payload.password),
        "name": payload.name or "",
        "role": "pending",
        "createdAt": None,
    }
    users.append(user)
    drive.write_json_file(USERS_FILENAME, users)




@router.post("/login")
async def login(payload: LoginPayload):
    drive = _get_drive()
    users = drive.read_json_file(USERS_FILENAME) or []
    for u in users:
        if u.get("email") == payload.email:
            if u.get("password_hash") != _hash_password(payload.password):
                raise HTTPException(status_code=401, detail="Invalid credentials")
            if u.get("role") != "friend":
                raise HTTPException(status_code=403, detail="Account not approved")
            token = create_access_token({"sub": payload.email, "role": "friend"})
            return {"access_token": token, "token_type": "bearer", "email": payload.email}
    raise HTTPException(status_code=404, detail="User not found")


# use shared require_admin from services.auth_service


def _is_valid_email(email: str) -> bool:
    import re
    if not email or not isinstance(email, str):
        return False
    # simple regex, not perfect but avoids dependency on email-validator
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return re.match(pattern, email) is not None


@router.post("/approve")
async def approve(email: str, _: Any = Depends(require_admin)):
    drive = _get_drive()
    if not _is_valid_email(email):
        raise HTTPException(status_code=400, detail="Invalid email")
    users = drive.read_json_file(USERS_FILENAME) or []
    changed = False
    for u in users:
        if u.get("email") == email:
            u["role"] = "friend"
            changed = True
            break
    if not changed:
        raise HTTPException(status_code=404, detail="User not found")
    drive.write_json_file(USERS_FILENAME, users)
    return {"ok": True}


@router.patch("/{email}")
async def update_user(email: str, payload: dict, _: Any = Depends(require_admin)):
    """Update user fields (admin only). Accepts JSON body with fields to update, e.g. {"name": "New Name", "role": "friend"}."""
    drive = _get_drive()
    if not _is_valid_email(email):
        raise HTTPException(status_code=400, detail="Invalid email")
    users = drive.read_json_file(USERS_FILENAME) or []
    changed = False
    updated_user = None
    for u in users:
        if u.get("email") == email:
            # Only allow updating specific fields
            for k in ("name", "role"):
                if k in payload:
                    u[k] = payload[k]
            changed = True
            updated_user = u
            break
    if not changed:
        raise HTTPException(status_code=404, detail="User not found")
    drive.write_json_file(USERS_FILENAME, users)
    sanitized = {k: v for k, v in (updated_user or {}).items() if k != "password_hash"}
    return {"ok": True, "user": sanitized}


@router.delete("/{email}")
async def delete_user(email: str, _: Any = Depends(require_admin)):
    """Delete a user by email (admin only)."""
    drive = _get_drive()
    if not _is_valid_email(email):
        raise HTTPException(status_code=400, detail="Invalid email")
    users = drive.read_json_file(USERS_FILENAME) or []
    before = len(users)
    users = [u for u in users if u.get("email") != email]
    if len(users) == before:
        raise HTTPException(status_code=404, detail="User not found")
    drive.write_json_file(USERS_FILENAME, users)
    return {"ok": True}


@router.get("/list")
async def list_users(_: Any = Depends(require_admin)):
    drive = _get_drive()
    users = drive.read_json_file(USERS_FILENAME) or []
    # do not return password hashes
    sanitized = [{k: v for k, v in u.items() if k != "password_hash"} for u in users]
    return {"users": sanitized}


@router.get("/requests")
async def list_requests(_: Any = Depends(require_admin)):
    """Return pending registration requests (admin only)."""
    drive = _get_drive()
    users = drive.read_json_file(USERS_FILENAME) or []
    pending = [u for u in users if u.get("role") == "pending"]
    sanitized = [{k: v for k, v in u.items() if k != "password_hash"} for u in pending]
    return {"requests": sanitized}


@router.post("/global")
async def global_password(payload: dict):
    # expects {"password": "..."}
    pwd = payload.get("password")
    if not pwd:
        raise HTTPException(status_code=400, detail="Missing password")
    expected = os.getenv("GLOBAL_PASSWORD", "topsecret")
    if pwd != expected:
        raise HTTPException(status_code=401, detail="Invalid password")
    token = create_access_token({"sub": "global", "role": "global"})
    return {"access_token": token, "token_type": "bearer"}
