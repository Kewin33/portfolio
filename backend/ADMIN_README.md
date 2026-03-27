# Admin: Projekte verwalten (Backend)

Kurz: Dieses README beschreibt, wie der Admin-Flow für Projekte funktioniert und wie man `projects.json` in Google Drive speichert.

Endpoints (Backend)

- `POST /api/auth/admin` – Admin-Login (BODY: `{ "password": "..." }`). Antwort enthält `access_token` (JWT).
- `GET /api/projects/` – Liste der Projekte (liest `projects.json` aus Google Drive).
- `POST /api/projects/` – Admin: neues Projekt anlegen (JSON payload).
- `PATCH /api/projects/{project_id}` – Admin: Projekt aktualisieren.
- `DELETE /api/projects/{project_id}` – Admin: Projekt löschen.

Kurzes Beispiel (Admin-Token holen & sync):

1) Admin-Token holen (curl / PowerShell):

```bash
curl -X POST http://127.0.0.1:8000/api/auth/admin \
  -H "Content-Type: application/json" \
  -d '{"password":"alexistcool"}'
```

Antwort enthält `access_token`.

Note: Projects are sourced exclusively from Google Drive. There is no local fallback.

Frontend-Admin

- Die Admin-UI wurde in `frontend/src/components/projects/AdminProjects.tsx` angelegt. Sie erwartet, dass ein Admin-Token als `Bearer`-Token in Anfragen verwendet wird. Die Komponente speichert optional das Token in `localStorage` für Bequemlichkeit.
- Die Admin-UI wurde in `frontend/src/components/projects/AdminProjects.tsx` angelegt. Sie erwartet, dass ein Admin-Token als `Bearer`-Token in Anfragen verwendet wird. Die Komponente speichert optional das Token in `localStorage` für Bequemlichkeit.

Projects folder location
------------------------
- Uploaded project images are stored in a Drive folder named `Projects` which will be created under the configured portfolio/timeline folder (see env `GOOGLE_DRIVE_TIMELINE_FOLDER_ID` or `GOOGLE_DRIVE_PORTFOLIO_FOLDER_ID`).
- You can also explicitly set `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` to a pre-existing folder id to use that instead.

Sicherheits-Anmerkungen & Empfehlungen

- Aktuell wird ein JWT in `Authorization: Bearer <token>` erwartet. Wenn das Token in `localStorage` liegt, ist es anfällig für XSS-Angriffe.
- Empfohlenes, sichereres Vorgehen:
  - Setze das Token in einem HttpOnly, Secure Cookie (Server setzt Cookie nach Login). Dadurch ist es für JavaScript nicht lesbar.
  - Implementiere kurzlebige Access Tokens + Refresh Tokens (Refresh in HttpOnly Cookie) auf dem Backend.
  - Oder: Schütze Admin-Routen serverseitig (SSR) und only render Admin UI nachdem Server die Session validiert.

Wenn du möchtest, implementiere ich:

- eine HttpOnly-Cookie-basierte Admin-Login-Flow (Backend + Frontend Anpassungen), oder
- ein kurzes README im Frontend mit Nutzungshinweisen und Beispiel-Screenshots.

Dateien

- Admin UI: `frontend/src/components/projects/AdminProjects.tsx`
- Admin Page: `frontend/src/app/[locale]/projects/admin/page.tsx`
- Neue Router: `backend/routers/projects.py`

Chess Explorer Proxy
--------------------
- `GET /api/chess/explorer/opening?fen=<FEN>&source=masters|lichess|player[&player=<username>]`
- `GET /api/chess/explorer/tablebase?fen=<FEN>`

Optional kannst du einen Lichess Token serverseitig setzen:
- `LICHESS_API_TOKEN=<dein_token>` in `backend/.env`

Wichtig: Den Token niemals im Frontend oder in `NEXT_PUBLIC_*` Variablen speichern.
