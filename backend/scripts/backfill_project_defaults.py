from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.drive_service import DriveService  # noqa: E402

PROJECTS_FILE = "projects.json"


def main() -> None:
    service = DriveService()
    projects = service.read_json_file(PROJECTS_FILE) or []
    changed = False

    for index, project in enumerate(projects):
        if project.get("index") != index:
            project["index"] = index
            changed = True
        if project.get("section") not in {"main", "other"}:
            project["section"] = "main"
            changed = True

    if changed:
      service.write_json_file(PROJECTS_FILE, projects)
      print(f"Updated {len(projects)} projects with default index/section fields.")
    else:
      print("No changes needed.")


if __name__ == "__main__":
    main()