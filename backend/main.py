import os
import logging
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from routers import storage, auth
from routers import users, projects, chess, survey, chess_puzzles


def _load_env_file(file_path: Path) -> None:
    if not file_path.exists():
        return
    for raw_line in file_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


backend_dir = Path(__file__).resolve().parent
_load_env_file(backend_dir / ".env")

# Keep runtime logs readable (suppress noisy third-party DEBUG output)
logging.basicConfig(level=logging.INFO, force=True)
logging.getLogger("googleapiclient.discovery").setLevel(logging.WARNING)
logging.getLogger("googleapiclient.discovery_cache").setLevel(logging.WARNING)
logging.getLogger("googleapiclient.http").setLevel(logging.ERROR)
logging.getLogger("google_auth_httplib2").setLevel(logging.WARNING)

app = FastAPI(title="Portfolio Backend", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://portfolio-kewin33-dev.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(storage.router, prefix="/api/storage", tags=["Storage"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(chess.router, prefix="/api/chess", tags=["Chess"])
app.include_router(chess_puzzles.router, prefix="/api/chess", tags=["Chess Puzzles"])
app.include_router(survey.router, prefix="/api/survey", tags=["Survey"])

@app.get("/")
def root():
    return {"message": "Welcome to the Portfolio Backend API"}
