import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import requests

DEFAULT_SCOPE = "https://www.googleapis.com/auth/drive"
DEFAULT_REDIRECT_URI = "http://localhost:8000/api/auth/drive/callback"

_state_store: dict[str, datetime] = {}


def _default_client_secret_path() -> Path:
    return Path(__file__).resolve().parents[2] / "planning" / "client_secret_336033174250-n7dc3gs96v5o9dmsiqjfuscf73umheki.apps.googleusercontent.com.json"


def _load_client_secret_config() -> dict[str, Any]:
    raw_json = os.getenv("GOOGLE_DRIVE_OAUTH_CLIENT_JSON", "").strip()
    if raw_json:
        return json.loads(raw_json)

    path = os.getenv("GOOGLE_DRIVE_OAUTH_CLIENT_PATH", "").strip()
    file_path = Path(path) if path else _default_client_secret_path()
    if not file_path.exists():
        raise RuntimeError(f"OAuth client secret file not found: {file_path}")

    return json.loads(file_path.read_text(encoding="utf-8"))


def _extract_client_block(config: dict[str, Any]) -> dict[str, Any]:
    if "web" in config and isinstance(config["web"], dict):
        return config["web"]
    if "installed" in config and isinstance(config["installed"], dict):
        return config["installed"]
    raise RuntimeError("Invalid OAuth client config: expected top-level 'web' or 'installed' block")


def _cleanup_states() -> None:
    now = datetime.now(timezone.utc)
    expired = [key for key, exp in _state_store.items() if exp <= now]
    for key in expired:
        _state_store.pop(key, None)


def create_authorization_url(redirect_uri: str | None = None) -> dict[str, str]:
    _cleanup_states()
    state = secrets.token_urlsafe(24)
    _state_store[state] = datetime.now(timezone.utc) + timedelta(minutes=10)

    client = _extract_client_block(_load_client_secret_config())
    resolved_redirect_uri = redirect_uri or os.getenv("GOOGLE_DRIVE_OAUTH_REDIRECT_URI", DEFAULT_REDIRECT_URI)

    query = urlencode(
        {
            "client_id": client["client_id"],
            "redirect_uri": resolved_redirect_uri,
            "response_type": "code",
            "scope": DEFAULT_SCOPE,
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
            "state": state,
        }
    )
    return {
        "state": state,
        "redirect_uri": resolved_redirect_uri,
        "auth_url": f"{client['auth_uri']}?{query}",
    }


def exchange_code_for_tokens(code: str, state: str, redirect_uri: str | None = None) -> dict[str, Any]:
    _cleanup_states()
    expires_at = _state_store.pop(state, None)
    if not expires_at:
        raise RuntimeError("Invalid or expired OAuth state. Start login again.")

    client = _extract_client_block(_load_client_secret_config())
    resolved_redirect_uri = redirect_uri or os.getenv("GOOGLE_DRIVE_OAUTH_REDIRECT_URI", DEFAULT_REDIRECT_URI)

    response = requests.post(
        client["token_uri"],
        data={
            "code": code,
            "client_id": client["client_id"],
            "client_secret": client["client_secret"],
            "redirect_uri": resolved_redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=15,
    )

    payload = response.json()
    if response.status_code != 200:
        err = payload.get("error") if isinstance(payload, dict) else response.text
        err_desc = payload.get("error_description") if isinstance(payload, dict) else ""
        raise RuntimeError(f"OAuth token exchange failed: {err} {err_desc}".strip())

    if not payload.get("refresh_token"):
        raise RuntimeError(
            "Google did not return refresh_token. Ensure prompt=consent and revoke old app access once, then retry."
        )

    expiry = datetime.now(timezone.utc) + timedelta(seconds=int(payload.get("expires_in", 3600)))
    token_json = {
        "token": payload.get("access_token"),
        "refresh_token": payload.get("refresh_token"),
        "token_uri": client["token_uri"],
        "client_id": client["client_id"],
        "client_secret": client["client_secret"],
        "scopes": [DEFAULT_SCOPE],
        "expiry": expiry.isoformat().replace("+00:00", "Z"),
    }
    return token_json


def persist_oauth_token(token_json: dict[str, Any]) -> dict[str, str]:
    repo_root = Path(__file__).resolve().parents[2]
    backend_env = repo_root / "backend" / ".env"
    planning_token = repo_root / "planning" / "oauth_token.json"

    payload = json.dumps(token_json, ensure_ascii=False)
    os.environ["GOOGLE_DRIVE_OAUTH_TOKEN_JSON"] = payload

    planning_token.write_text(json.dumps(token_json, ensure_ascii=False, indent=2), encoding="utf-8")

    env_lines: list[str] = []
    if backend_env.exists():
        env_lines = backend_env.read_text(encoding="utf-8").splitlines()

    key = "GOOGLE_DRIVE_OAUTH_TOKEN_JSON"
    replaced = False
    for idx, line in enumerate(env_lines):
        if line.startswith(f"{key}="):
            env_lines[idx] = f"{key}={payload}"
            replaced = True
            break

    if not replaced:
        env_lines.append(f"{key}={payload}")

    backend_env.write_text("\n".join(env_lines) + "\n", encoding="utf-8")

    return {
        "env_path": str(backend_env),
        "token_path": str(planning_token),
    }
