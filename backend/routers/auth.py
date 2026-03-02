from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from services.auth_service import verify_google_token, create_access_token

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
    admin_password = os.getenv("ADMIN_PASSWORD", "changeme")
    
    if req.password != admin_password:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    return {
        "access_token": create_access_token({"sub": "admin", "role": "admin"}),
        "token_type": "bearer",
    }
