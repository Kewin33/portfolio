from fastapi import APIRouter, HTTPException, Query
import os
import requests

router = APIRouter()

OPENING_EXPLORER_BASE = "https://explorer.lichess.ovh"
TABLEBASE_URL = "https://tablebase.lichess.ovh/standard"

def _lichess_token_headers() -> dict:
    token = os.getenv("LICHESS_API_TOKEN", "").strip()
    if not token:
        return {"Accept": "application/json"}
    return {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
    }


def _proxy_json_request(url: str, params: dict | None = None) -> dict:
    try:
        response = requests.get(
            url,
            params=params or {},
            headers=_lichess_token_headers(),
            timeout=8,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Explorer request failed: {exc}")

    if response.status_code == 429:
        detail = {
            "message": "Too many requests from upstream (429).",
            "retry_after": response.headers.get("retry-after"),
        }
        raise HTTPException(status_code=429, detail=detail)

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text[:240])

    try:
        return response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Invalid upstream JSON: {exc}")

@router.get("/explorer/opening")
async def opening_explorer(
    fen: str = Query(..., min_length=8),
    source: str = Query("masters", pattern="^(masters|lichess|player)$"),
    player: str | None = Query(default=None),
    color: str = Query("white", pattern="^(white|black)$"),
):
    endpoint = f"{OPENING_EXPLORER_BASE}/{source}"
    params = {"fen": fen}
    if source == "player":
        normalized_player = (player or "").strip()
        if len(normalized_player) < 2:
            raise HTTPException(status_code=400, detail="player query param is required for source=player")
        params["player"] = normalized_player
        params["color"] = color
    return _proxy_json_request(endpoint, params=params)


@router.get("/explorer/tablebase")
async def tablebase_explorer(fen: str = Query(..., min_length=8)):
    return _proxy_json_request(TABLEBASE_URL, params={"fen": fen})
