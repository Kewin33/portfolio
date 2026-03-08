# API-Routen (Übersicht)

Diese Datei dokumentiert die aktuell in `backend/routers/` vorhandenen Endpunkte. Die Pfade hier sind die im Router definierten Pfade; genaue vollständige Pfade hängen von der Mount-Point-Konfiguration in `main.py` ab (z. B. `/api/...`).

---

## auth.py

- POST `/google`
  - Beschreibung: Google-Login über ein vom Frontend geliefertes ID-Token.
  - Request-Body: `{ "token": "<google-id-token>" }`
  - Antwort: `{ "access_token": "...", "token_type": "bearer", "email": "..." }`
  - Auth: keine

- POST `/admin`
  - Beschreibung: Einfaches Admin-Login mittels Passwort (ENV `ADMIN_PASSWORD` oder Default `alexistcool`).
  - Request-Body: `{ "password": "..." }`
  - Antwort: `{ "access_token": "...", "token_type": "bearer" }`
  - Auth: keine (liefert Admin-Token bei korrektem Passwort)

- GET `/me`
  - Beschreibung: Liefert das decodierte Token-Payload des aktuellen Tokens zurück.
  - Header: `Authorization: Bearer <token>`
  - Antwort: `{ "email": "...", "role": "..." }`
  - Auth: benötigt gültiges Access-Token

---

## drive_oauth.py

- GET `/auth/drive/start`
  - Beschreibung: Startet den Google Drive OAuth-Flow (redirect zur Google-Consent-URL).
  - Verhalten: Erzeugt Flow, persistiert ggf. PKCE-Verifier in `planning/oauth_verifiers.json`, leitet auf die Google-Autorisierungs-URL weiter.
  - Auth: keine

- GET `/auth/drive/callback`
  - Beschreibung: Callback-Endpoint für Google OAuth. Holt Token und speichert Credentials nach `TOKEN_FILE` (standard: `planning/oauth_token.json`).
  - Query-Parameter: `state`, weitere von Google.
  - Antwort: JSON mit `{ "ok": true, "message": "OAuth completed. Token saved.", "token_path": "..." }` oder Fehler.
  - Auth: keine

- GET `/auth/drive/status`
  - Beschreibung: Dev-Status: informiert, ob ein OAuth-Token vorhanden ist und einige nicht-sensible Metadaten (`client_id`, `scopes`, `expiry`).
  - Antwort: `{ "oauth_token_present": true|false, ... }`
  - Auth: keine

Hinweis: Die Datei `planning/client_secret_...json` wird zur Erzeugung des Flows verwendet. Redirect-URI kann über ENV `GOOGLE_OAUTH_REDIRECT_URI` konfiguriert werden.

---

## projects.py

- GET `/`  (Projekt-Liste)
  - Beschreibung: Liest `projects.json` aus Google Drive via `DriveService.read_json_file`.
  - Antwort: `{ "projects": [ ... ] }`
  - Auth: keine (öffentlich)
 
Note: The `sync-local` endpoint has been removed; projects are managed exclusively on Google Drive.

- POST `/`  (Projekt anlegen)
  - Beschreibung: Fügt ein Projekt hinzu. Body entspricht `ProjectPayload` (z. B. `title`, `description`, `image`, `github`, `demo`, `skills`).
  - Body: `ProjectPayload` (Id wird bei Bedarf erzeugt)
  - Auth: Admin
  - Antwort: `{ "ok": true, "file_id": "...", "project": { ... } }`

- PATCH `/{project_id}`  (Projekt aktualisieren)
  - Beschreibung: Aktualisiert ein bestehendes Projekt (merge-Verhalten: eingehende Felder überschreiben vorhandene).
  - Path-Parameter: `project_id`
  - Body: `ProjectPayload`
  - Auth: Admin
  - Antwort: `{ "ok": true, "file_id": "...", "project": { ... } }`

- DELETE `/{project_id}`  (Projekt löschen)
  - Beschreibung: Entfernt ein Projekt aus der Liste und schreibt das neue `projects.json` auf Drive.
  - Path-Parameter: `project_id`
  - Auth: Admin
  - Antwort: `{ "ok": true, "file_id": "..." }`

---

## storage.py

Timeline / Tag / Drive-Storage bezogene Endpunkte:

- GET `/timeline/events`
  - Beschreibung: Liefert Timeline-Events. Optionales Query: `include_deleted` (bool), `tags` (kommagetrennt)
  - Antwort: `{ "events": [...], "tagColors": { ... } }`
  - Auth: keine

- PUT `/timeline/events`
  - Beschreibung: Schreibt/merged eine Liste von Events. Payload: `TimelineEventsPayload` ({"events": [ ... ]}).
  - Auth: Admin
  - Antwort: `{ "ok": true, "file_id": "...", "events": [...], "count_ok": true|false, ... }`

- PATCH `/timeline/events/{event_id}/soft-delete`
  - Beschreibung: Markiert ein Event per `deletedAt` (soft-delete).
  - Path-Parameter: `event_id`
  - Auth: Admin
  - Antwort: `{ "ok": true, "file_id": "...", "deletedAt": "..." }`

- PATCH `/timeline/events/{event_id}/restore`
  - Beschreibung: Hebt vorheriges soft-delete auf (`deletedAt` -> null).
  - Auth: Admin

- DELETE `/timeline/events/{event_id}`
  - Beschreibung: Löscht ein Event permanent.
  - Auth: Admin

- GET `/drive/quota`
  - Beschreibung: Liefert Drive-Speicher-Quota via `DriveService.get_storage_quota()`.
  - Auth: keine

- GET `/timeline/tags`
  - Beschreibung: Liefert Tag-Liste mit Zählern und (falls vorhanden) Farben aus `planning/timeline_tags.json`.
  - Auth: keine

- POST `/timeline/tags/rename`
  - Beschreibung: Benennt ein Tag in allen Events um. Body: `{ "from_tag": "old", "to_tag": "new" }`.
  - Auth: Admin

Hinweis: Standard-Events (DEFAULT_TIMELINE_EVENTS) werden erzeugt, falls keine Events vorhanden sind. Backups werden bei bestimmten Fehlzuständen unter `planning/backups/` geschrieben.

---

## users.py

- POST `/register`
  - Beschreibung: Registriert einen Nutzer (Status `pending`). Speichert Nutzer in `users.json` (Drive) mit `password_hash`.
  - Body: `RegisterPayload` `{ "email": "...", "password": "...", "name": "..." }`
  - Verhalten: Sendet optional eine Benachrichtigung an Admin (`ADMIN_NOTIFY_EMAIL`) via SMTP oder SendGrid (abhängig von ENV).
  - Auth: keine
  - Antwort: `{ "ok": true, "status": "pending", "email_sent": true|false }`

- POST `/login`
  - Beschreibung: Authentifiziert lokal gespeicherte Nutzer. Nur Nutzer mit `role == "friend"` erhalten ein Token.
  - Body: `LoginPayload` `{ "email": "...", "password": "..." }`
  - Antwort: `{ "access_token": "...", "token_type": "bearer", "email": "..." }`
  - Fehler: 401 bei falschem Passwort, 403 wenn nicht freigeschaltet, 404 wenn nicht gefunden

- POST `/approve`
  - Beschreibung: Setzt `role` eines Benutzers auf `friend` (Admin-Only).
  - Parameter: `email` (als Form/Query-Param bzw. function-arg)
  - Auth: Admin

- GET `/list`
  - Beschreibung: Liefert alle Nutzer (ohne `password_hash`). Admin-Only.

- GET `/requests`
  - Beschreibung: Liefert alle Pending-Registrierungen (Admin-Only).

- POST `/global`
  - Beschreibung: Erlaubt Zugang mittels eines globalen Passworts (`GLOBAL_PASSWORD` ENV). Erwartet Body `{ "password": "..." }`.
  - Antwort: `{ "access_token": "...", "token_type": "bearer" }` bei Erfolg

---

## Sicherheit & Authentifizierung

- Admin-geschützte Endpunkte verwenden die Dependency `require_admin` aus `services.auth_service`.
- Access-Tokens werden mit `create_access_token` erzeugt und mit `verify_access_token` validiert (siehe `services/auth_service.py`).
- Environment-Variablen (wichtige Beispiele):
  - `ADMIN_PASSWORD` – Passwort für `/admin` login
  - `GLOBAL_PASSWORD` – Passwort für `/global` Token
  - `GOOGLE_OAUTH_REDIRECT_URI` – Redirect URI für Google OAuth
  - `GOOGLE_OAUTH_TOKEN_PATH` – Pfad, wo OAuth-Credentials gespeichert werden (default: `planning/oauth_token.json`)
  - `GOOGLE_OAUTH_TOKEN_JSON` – Alternativ: komplettes `authorized_user`-JSON als ENV (wenn gesetzt, wird dieses verwendet statt der Token-Datei)

---

## Dateipfade & Persistenz (Kurzüberblick)

- OAuth client secret: `planning/client_secret_336033174250-....json`
- OAuth token: standardmäßig `planning/oauth_token.json` (ENV `GOOGLE_OAUTH_TOKEN_PATH`)
- Projects are stored and read from Google Drive; there is no local projects.json fallback.
- Timeline tags meta: `planning/timeline_tags.json`
- Timeline backups: `planning/backups/`
- Users/Projects auf Drive: `users.json`, `projects.json` (verwaltet durch `DriveService`)

---
