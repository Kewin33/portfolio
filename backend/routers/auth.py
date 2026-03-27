from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from services.auth_service import verify_google_token, create_access_token
from services.auth_service import verify_access_token
from fastapi import Header
from fastapi.responses import RedirectResponse

from routers.storage import get_drive_service, reset_drive_service
from services.drive_oauth_service import create_authorization_url, exchange_code_for_tokens, persist_oauth_token

router = APIRouter()

class GoogleLoginRequest(BaseModel):
    token: str

@router.post("/google")
async def google_login(req: GoogleLoginRequest):
    user_info = verify_google_token(req.token)
    if not user_info:
        raise HTTPException(status_code=400, detail="Invalid Google token")
    
    # Check if the user is authorized (Friend list) or admin
    # In a real db, we would save the user and check approval status here.
    return {
        "access_token": create_access_token({"sub": user_info["email"]}),
        "token_type": "bearer",
        "email": user_info["email"]
    }

class AdminLoginRequest(BaseModel):
    password: str

@router.post("/admin")
async def admin_login(req: AdminLoginRequest):
    import os
    admin_password = os.getenv("ADMIN_PASSWORD")

    if req.password != admin_password:
        raise HTTPException(status_code=401, detail="Invalid password")

    return {
        "access_token": create_access_token({"sub": "admin", "role": "admin"}),
        "token_type": "bearer",
    }


@router.get("/me")
async def me(authorization: str | None = Header(None)):
    """Return decoded token payload for the current user. Requires Authorization: Bearer <token>."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    token = parts[1]
    try:
        payload = verify_access_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

    # Return safe subset
    return {"email": payload.get("sub"), "role": payload.get("role")}


@router.get("/drive/oauth/status")
@router.get("/drive/status")
async def drive_oauth_status():
    service = get_drive_service()
    return service.get_token_status()


@router.get("/drive/oauth/start")
@router.get("/drive/start")
async def drive_oauth_start(
    redirect_uri: str | None = Query(default=None),
    do_redirect: bool = Query(default=True),
):
    data = create_authorization_url(redirect_uri=redirect_uri)
    if do_redirect:
        return RedirectResponse(url=data["auth_url"], status_code=307)
    return data


@router.get("/drive/oauth/callback")
@router.get("/drive/callback")
async def drive_oauth_callback(code: str, state: str, redirect_uri: str | None = Query(default=None)):
    token_json = exchange_code_for_tokens(code=code, state=state, redirect_uri=redirect_uri)
    persisted = persist_oauth_token(token_json)

    # Recreate DriveService instance so new token env is picked up immediately.
    reset_drive_service()
    service = get_drive_service()
    status = service.get_token_status()

    return {
        "ok": True,
        "message": "Drive OAuth token saved successfully.",
        "has_refresh_token": bool(token_json.get("refresh_token")),
        "expiry": token_json.get("expiry"),
        "persisted": persisted,
        "drive_status": status,
    }
