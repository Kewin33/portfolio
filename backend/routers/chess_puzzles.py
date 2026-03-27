from datetime import date, datetime, timezone
import os
import re
from typing import Any, Optional
import requests

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from routers.storage import get_drive_service
from services.auth_service import require_admin, verify_access_token
from services.drive_service import DriveService

router = APIRouter()

PUZZLES_FILE = "chess_puzzles.json"
PROGRESS_FILE = "chess_puzzle_progress.json"
UCI_PATTERN = re.compile(r"^[a-h][1-8][a-h][1-8][qrbn]?$")


class PuzzlePayload(BaseModel):
    id: Optional[str] = None
    title: str = ""
    description: str = ""
    initialFen: str = Field(min_length=1)
    solutionUci: list[str] = Field(default_factory=list)
    solutionTree: list[dict[str, Any]] = Field(default_factory=list)
    roadmapOrder: int = 0
    enabled: bool = True


class AttemptPayload(BaseModel):
    solved: bool


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sanitize_moves(moves: list[str]) -> list[str]:
    normalized: list[str] = []
    for raw in moves:
        move = raw.strip().lower()
        if not UCI_PATTERN.match(move):
            raise HTTPException(status_code=400, detail=f"Invalid UCI move: {raw}")
        normalized.append(move)
    return normalized


def _sanitize_tree(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for raw in nodes:
        move = str(raw.get("moveUci", "")).strip().lower()
        if not UCI_PATTERN.match(move):
            raise HTTPException(status_code=400, detail=f"Invalid tree UCI move: {move}")
        children_raw = raw.get("children", [])
        if not isinstance(children_raw, list):
            children_raw = []
        normalized.append({
            "moveUci": move,
            "children": _sanitize_tree(children_raw),
        })
    return normalized


def _linear_tree_from_moves(moves: list[str]) -> list[dict[str, Any]]:
    root: list[dict[str, Any]] = []
    cursor = root
    for move in moves:
        node = {"moveUci": move, "children": []}
        cursor.append(node)
        cursor = node["children"]
    return root


def _default_puzzle_doc() -> dict[str, Any]:
    return {"version": 1, "updatedAt": _now_iso(), "items": []}


def _load_puzzles(service: DriveService) -> dict[str, Any]:
    data = service.read_json_file(PUZZLES_FILE)
    if not isinstance(data, dict):
        return _default_puzzle_doc()
    if not isinstance(data.get("items"), list):
        data["items"] = []
    if "version" not in data:
        data["version"] = 1
    if "updatedAt" not in data:
        data["updatedAt"] = _now_iso()
    return data


def _save_puzzles(service: DriveService, data: dict[str, Any]) -> str:
    data["updatedAt"] = _now_iso()
    return service.write_json_file(PUZZLES_FILE, data)


def _normalize_item(item: dict[str, Any]) -> dict[str, Any]:
    title_raw = item.get("title")
    description_raw = item.get("description")

    if isinstance(title_raw, dict):
        title = str(title_raw.get("en") or title_raw.get("de") or "")
    else:
        title = str(title_raw or "")

    if isinstance(description_raw, dict):
        description = str(description_raw.get("en") or description_raw.get("de") or "")
    else:
        description = str(description_raw or "")

    return {
        **item,
        "title": title,
        "description": description,
        "solutionTree": item.get("solutionTree") if isinstance(item.get("solutionTree"), list) else _linear_tree_from_moves(item.get("solutionUci") or []),
    }


def _default_progress_doc() -> dict[str, Any]:
    return {"version": 1, "updatedAt": _now_iso(), "users": {}}


def _load_progress(service: DriveService) -> dict[str, Any]:
    data = service.read_json_file(PROGRESS_FILE)
    if not isinstance(data, dict):
        return _default_progress_doc()
    users = data.get("users")
    if not isinstance(users, dict):
        data["users"] = {}
    if "version" not in data:
        data["version"] = 1
    return data


def _save_progress(service: DriveService, data: dict[str, Any]) -> str:
    data["updatedAt"] = _now_iso()
    return service.write_json_file(PROGRESS_FILE, data)


def _get_email_from_header(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        payload = verify_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    email = payload.get("sub")
    if not isinstance(email, str) or not email:
        raise HTTPException(status_code=401, detail="Token missing subject")
    return email


def _progress_snapshot(user_data: dict[str, Any]) -> dict[str, Any]:
    solved_ids = user_data.get("solvedPuzzleIds")
    if not isinstance(solved_ids, list):
        solved_ids = []
    return {
        "totalSolved": int(user_data.get("totalSolved", 0)),
        "lastSolvedDate": user_data.get("lastSolvedDate"),
        "todayPuzzleId": user_data.get("todayPuzzleId"),
        "canSolveToday": True,
        "dailyLimit": 0,
        "solvedPuzzleIds": [str(x) for x in solved_ids],
    }


def _next_numeric_id(items: list[dict[str, Any]]) -> str:
    max_id = 0
    for item in items:
        raw = item.get("id")
        if isinstance(raw, str) and raw.isdigit():
            max_id = max(max_id, int(raw))
    return str(max_id + 1)


@router.get("/puzzles")
async def list_puzzles(
    service: DriveService = Depends(get_drive_service),
):
    data = _load_puzzles(service)
    all_items = [_normalize_item(p) for p in data.get("items", [])]
    items = [p for p in all_items if bool(p.get("enabled", True))]
    items.sort(key=lambda p: int(p.get("roadmapOrder", 0)))
    return {
        "items": items,
        "hasAdminPuzzles": len(all_items) > 0,
        "updatedAt": data.get("updatedAt"),
    }


@router.get("/puzzles/admin")
async def list_puzzles_admin(
    _admin=Depends(require_admin),
    service: DriveService = Depends(get_drive_service),
):
    data = _load_puzzles(service)
    items = [_normalize_item(p) for p in data.get("items", [])]
    items.sort(key=lambda p: int(p.get("roadmapOrder", 0)))
    return {"items": items, "updatedAt": data.get("updatedAt")}


@router.get("/puzzles/{puzzle_id}")
async def get_puzzle(puzzle_id: str, service: DriveService = Depends(get_drive_service)):
    data = _load_puzzles(service)
    for puzzle in [_normalize_item(p) for p in data.get("items", [])]:
        if puzzle.get("id") == puzzle_id and bool(puzzle.get("enabled", True)):
            return puzzle
    raise HTTPException(status_code=404, detail="Puzzle not found")


@router.post("/puzzles")
async def upsert_puzzle(
    payload: PuzzlePayload,
    _admin=Depends(require_admin),
    service: DriveService = Depends(get_drive_service),
):
    doc = _load_puzzles(service)
    items = doc.get("items", [])
    now = _now_iso()
    normalized_moves = _sanitize_moves(payload.solutionUci)
    normalized_tree = _sanitize_tree(payload.solutionTree) if payload.solutionTree else _linear_tree_from_moves(normalized_moves)
    puzzle_id = payload.id or _next_numeric_id(items)

    next_item = {
        "id": puzzle_id,
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "initialFen": payload.initialFen.strip(),
        "solutionUci": normalized_moves,
        "solutionTree": normalized_tree,
        "roadmapOrder": int(payload.roadmapOrder),
        "enabled": bool(payload.enabled),
        "updatedAt": now,
    }

    replaced = False
    for idx, puzzle in enumerate(items):
        if puzzle.get("id") == puzzle_id:
            next_item["createdAt"] = puzzle.get("createdAt", now)
            items[idx] = next_item
            replaced = True
            break

    if not replaced:
        next_item["createdAt"] = now
        items.append(next_item)

    file_id = _save_puzzles(service, doc)
    return {"ok": True, "file_id": file_id, "item": next_item}


class ReorderPayload(BaseModel):
    ids: list[str] = Field(default_factory=list)


@router.post("/puzzles/admin/reorder")
async def reorder_puzzles(
    payload: ReorderPayload,
    _admin=Depends(require_admin),
    service: DriveService = Depends(get_drive_service),
):
    doc = _load_puzzles(service)
    items = doc.get("items", [])
    by_id = {str(item.get("id")): item for item in items}
    ordered_ids = [pid for pid in payload.ids if pid in by_id]
    missing_ids = [pid for pid in by_id.keys() if pid not in ordered_ids]
    final_ids = ordered_ids + missing_ids

    for idx, puzzle_id in enumerate(final_ids, start=1):
        by_id[puzzle_id]["roadmapOrder"] = idx
        by_id[puzzle_id]["updatedAt"] = _now_iso()

    doc["items"] = [by_id[puzzle_id] for puzzle_id in final_ids]
    file_id = _save_puzzles(service, doc)
    return {
        "ok": True,
        "file_id": file_id,
        "items": [_normalize_item(item) for item in doc["items"]],
    }


@router.delete("/puzzles/{puzzle_id}")
async def delete_puzzle(
    puzzle_id: str,
    _admin=Depends(require_admin),
    service: DriveService = Depends(get_drive_service),
):
    doc = _load_puzzles(service)
    items = doc.get("items", [])
    filtered = [p for p in items if p.get("id") != puzzle_id]
    if len(filtered) == len(items):
        raise HTTPException(status_code=404, detail="Puzzle not found")
    doc["items"] = filtered
    file_id = _save_puzzles(service, doc)
    return {"ok": True, "file_id": file_id}


@router.get("/puzzles/progress/me")
async def get_my_progress(
    authorization: Optional[str] = Header(None),
    service: DriveService = Depends(get_drive_service),
):
    if not authorization:
        return _progress_snapshot({})

    email = _get_email_from_header(authorization)
    doc = _load_progress(service)
    users = doc.get("users", {})
    user_data = users.get(email, {})
    return _progress_snapshot(user_data)


@router.post("/puzzles/{puzzle_id}/attempt")
async def register_attempt(
    puzzle_id: str,
    payload: AttemptPayload,
    authorization: Optional[str] = Header(None),
    service: DriveService = Depends(get_drive_service),
):
    if not payload.solved:
        return {"ok": True, "recorded": False, "progress": _progress_snapshot({})}

    if not authorization:
        return {"ok": True, "recorded": False, "progress": _progress_snapshot({})}

    email = _get_email_from_header(authorization)
    doc = _load_progress(service)
    users = doc.get("users", {})
    user_data = users.get(email, {})

    today = date.today()
    today_str = today.isoformat()

    solved_ids = user_data.get("solvedPuzzleIds")
    if not isinstance(solved_ids, list):
        solved_ids = []
    is_new_solve = puzzle_id not in solved_ids
    if is_new_solve:
        solved_ids.append(puzzle_id)
    total = int(user_data.get("totalSolved", 0)) + (1 if is_new_solve else 0)

    next_user_data = {k: v for k, v in user_data.items() if k != "streak"}

    users[email] = {
        **next_user_data,
        "totalSolved": total,
        "lastSolvedDate": today_str,
        "todayPuzzleId": puzzle_id,
        "solvedPuzzleIds": solved_ids,
        "updatedAt": _now_iso(),
    }
    doc["users"] = users
    file_id = _save_progress(service, doc)
    return {
        "ok": True,
        "recorded": True,
        "file_id": file_id,
        "progress": _progress_snapshot(users[email]),
    }


@router.get("/puzzles/infinity/source")
async def get_infinity_source():
    try:
        response = requests.get(
            "https://lichess.org/api/puzzle/daily",
            headers={"Accept": "application/json"},
            timeout=6,
        )
        if response.status_code != 200:
            return {"url": "https://lichess.org/training", "provider": "lichess", "fallback": True}
        payload = response.json() if response.content else {}
        puzzle = payload.get("puzzle") if isinstance(payload, dict) else {}
        puzzle_id = puzzle.get("id") if isinstance(puzzle, dict) else None
        if isinstance(puzzle_id, str) and puzzle_id:
            return {
                "url": f"https://lichess.org/training/{puzzle_id}",
                "provider": "lichess",
                "fallback": False,
            }
    except requests.RequestException:
        pass
    return {"url": "https://lichess.org/training", "provider": "lichess", "fallback": True}


@router.get("/puzzles/infinity/next")
async def get_infinity_next_puzzle():
    token = os.getenv("LICHESS_API_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=500, detail="LICHESS_API_TOKEN is not configured")

    try:
        response = requests.get(
            "https://lichess.org/api/puzzle/next",
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {token}",
            },
            timeout=8,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Lichess request failed: {exc}")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Lichess returned status {response.status_code}")

    payload = response.json() if response.content else {}
    puzzle = payload.get("puzzle") if isinstance(payload, dict) else {}
    game = payload.get("game") if isinstance(payload, dict) else {}

    puzzle_id = puzzle.get("id") if isinstance(puzzle, dict) else None
    fen = game.get("fen") if isinstance(game, dict) else None
    solution = puzzle.get("solution") if isinstance(puzzle, dict) else None
    if not isinstance(puzzle_id, str) or not puzzle_id:
        raise HTTPException(status_code=502, detail="Lichess payload missing puzzle id")
    if not isinstance(fen, str) or not fen:
        raise HTTPException(status_code=502, detail="Lichess payload missing game fen")
    if not isinstance(solution, list):
        raise HTTPException(status_code=502, detail="Lichess payload missing solution line")

    normalized_solution = _sanitize_moves([str(m) for m in solution])
    return {
        "id": f"lichess-{puzzle_id}",
        "title": "Lichess Infinity Puzzle",
        "description": "Fetched live from lichess.org/api/puzzle/next",
        "initialFen": fen,
        "solutionUci": normalized_solution,
        "solutionTree": _linear_tree_from_moves(normalized_solution),
        "roadmapOrder": 999999,
        "enabled": True,
        "source": "lichess",
        "url": f"https://lichess.org/training/{puzzle_id}",
    }