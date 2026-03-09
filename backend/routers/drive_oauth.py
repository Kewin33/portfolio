import os
import json
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from fastapi.responses import JSONResponse

from .storage import get_drive_service, reset_drive_service

router = APIRouter()

SCOPES = ["https://www.googleapis.com/auth/drive"]
CLIENT_SECRET_FILE = os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "planning",
    "client_secret_336033174250-n7dc3gs96v5o9dmsiqjfuscf73umheki.apps.googleusercontent.com.json",
)
TOKEN_FILE = os.getenv(
    "GOOGLE_OAUTH_TOKEN_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "planning", "oauth_token.json"),
)


def _redirect_uri() -> str:
    return os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:8000/api/auth/drive/callback")


def _configure_oauth_transport() -> None:
    parsed = urlparse(_redirect_uri())
    is_local_http = parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}
    if is_local_http:
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
        return
    os.environ.pop("OAUTHLIB_INSECURE_TRANSPORT", None)


@router.get("/auth/drive/start")
def start_drive_oauth():
    if not os.path.exists(CLIENT_SECRET_FILE):
        raise HTTPException(status_code=500, detail="OAuth client secret file not found")

    _configure_oauth_transport()

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=_redirect_uri(),
    )
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    # Persist the PKCE code_verifier for the returned state so we can
    # set it again in the callback (Google requires the same verifier).
    try:
        verifier_store = os.path.join(os.path.dirname(__file__), "..", "..", "planning", "oauth_verifiers.json")
        data = {}
        if os.path.exists(verifier_store):
            with open(verifier_store, "r", encoding="utf-8") as f:
                data = json.load(f)
        data[state] = getattr(flow, "code_verifier", None)
        with open(verifier_store, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        # non-fatal: continue without verifier persisted
        pass

    return RedirectResponse(authorization_url)


@router.get("/auth/drive/callback")
async def drive_oauth_callback(request: Request):
    if not os.path.exists(CLIENT_SECRET_FILE):
        raise HTTPException(status_code=500, detail="OAuth client secret file not found")

    _configure_oauth_transport()

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=_redirect_uri(),
    )

    callback_url = str(request.url)
    # Extract state from query to retrieve stored code_verifier
    state = request.query_params.get("state")
    if state:
        try:
            verifier_store = os.path.join(os.path.dirname(__file__), "..", "..", "planning", "oauth_verifiers.json")
            if os.path.exists(verifier_store):
                with open(verifier_store, "r", encoding="utf-8") as f:
                    verifiers = json.load(f)
                code_verifier = verifiers.get(state)
                if code_verifier:
                    flow.code_verifier = code_verifier
                    # remove used verifier
                    try:
                        del verifiers[state]
                        with open(verifier_store, "w", encoding="utf-8") as f:
                            json.dump(verifiers, f)
                    except Exception:
                        pass
        except Exception:
            pass

    try:
        flow.fetch_token(authorization_response=callback_url)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to fetch OAuth token",
                "redirect_uri_used": _redirect_uri(),
                "callback_url_received": callback_url,
                "error": str(exc),
            },
        )

    with open(TOKEN_FILE, "w", encoding="utf-8") as token_file:
        token_file.write(flow.credentials.to_json())

    # Drop cached Drive client so the new credentials are used immediately.
    reset_drive_service()

    return {
        "ok": True,
        "message": "OAuth completed. Token saved.",
        "token_path": TOKEN_FILE,
    }


@router.get("/auth/drive/status")
def drive_oauth_status():
    """Dev status: reports active token source and refresh capability."""
    service = get_drive_service()
    status = service.get_token_status()

    if not status.get("configured"):
        fallback = {"oauth_token_present": False, **status}
        if os.path.exists(TOKEN_FILE):
            try:
                with open(TOKEN_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                fallback.update(
                    {
                        "oauth_token_present": True,
                        "source": "file",
                        "client_id": data.get("client_id"),
                        "scopes": data.get("scopes"),
                        "expiry": data.get("expiry"),
                        "has_refresh_token": bool(data.get("refresh_token")),
                    }
                )
            except Exception as exc:
                fallback["error"] = str(exc)
        return JSONResponse(fallback, status_code=200)

    try:
        safe = {
            "oauth_token_present": True,
            "source": status.get("source"),
            "token_path": status.get("token_path"),
            "scopes": status.get("scopes"),
            "expiry": status.get("expiry"),
            "expired": status.get("expired"),
            "valid": status.get("valid"),
            "has_refresh_token": status.get("has_refresh_token"),
        }
        return safe
    except Exception as exc:
        return JSONResponse({"oauth_token_present": False, "error": str(exc)}, status_code=200)
