# Google Drive Timeline Integration

Diese Doku beschreibt die konsistente Speicherung der Timeline-Daten in Google Drive unter `portfolio/timeline`.

## Speicherort
- Google-Drive-Ordner: `portfolio/timeline`
- Datei: `timeline_events.json`
- Quelle der Wahrheit: **nur Drive** (kein lokales Persistenz-File)

## Credentials
- Drive-Auth erfolgt per OAuth-Token-JSON in ENV:
  - `GOOGLE_DRIVE_OAUTH_TOKEN_JSON` (muss mindestens `refresh_token`, `client_id`, `client_secret`, `token_uri` enthalten)
- Optional fuer Drive-Ziel:
  - `GOOGLE_DRIVE_TIMELINE_FOLDER_ID`: vorhandener Zielordner fuer `timeline_events.json`
  - `GOOGLE_DRIVE_TIMELINE_FILE_ID`: vorhandene JSON-Datei, die direkt gelesen/aktualisiert wird
- Alternative ohne Ordner-Erstellung:
  - Der per OAuth angemeldete Google-Account muss auf den Zielordner Zugriff haben.

## Backend API
Basisroute: `/api/storage`

### 0) Health / Verbindungstest
- `GET /drive/health`
- Prueft OAuth-Konfiguration und ob API-Zugriff/Ordnerzugriff funktioniert.

### OAuth Setup Flow (neu)
- `GET /api/auth/drive/start` (Alias: `/api/auth/drive/oauth/start`)
  - Startet den Google OAuth Consent Flow.
  - Default Redirect URI: `http://localhost:8000/api/auth/drive/callback`
  - Diese URI muss exakt im Google OAuth Client als Redirect URI eingetragen sein.
- `GET /api/auth/drive/callback` (Alias: `/api/auth/drive/oauth/callback`)
  - Tauscht den Authorization Code gegen Access/Refresh Token.
  - Speichert den Token in `GOOGLE_DRIVE_OAUTH_TOKEN_JSON` (backend `.env`) und `planning/oauth_token.json`.
- `GET /api/auth/drive/status` (Alias: `/api/auth/drive/oauth/status`)
  - Zeigt den aktuellen Drive OAuth Status (`configured`, `expired`, `has_refresh_token`, optional `auth_error`).

### 1) Events laden
- `GET /timeline/events`
- Liefert nur aktive Events (ohne `deletedAt`).

Optional:
- `GET /timeline/events?include_deleted=true`
- Liefert alle Events inkl. soft-gelöschter Einträge.

### 2) Events speichern (konsistent)
- `PUT /timeline/events`
- Body:

```json
{
  "events": [
    {
      "id": "uuid-optional",
      "title": "Titel",
      "start": "2026-03-01",
      "end": "2026-03-01",
      "description": "Text",
      "deletedAt": null
    }
  ]
}
```

Verhalten:
- Backend schreibt die komplette Eventliste nach Drive.
- Fehlende `id` werden serverseitig als UUID ergänzt.
- Falls `timeline_events.json` noch fehlt, wird sie automatisch erzeugt und ihre ID intern verwendet.
- Wenn Media-Upload wegen Quota blockiert wird, nutzt der Service automatisch ein Fallback ueber Datei-Metadaten (`description`) derselben Datei.

### 3) Soft Delete
- `PATCH /timeline/events/{event_id}/soft-delete`
- Setzt `deletedAt` (UTC-ISO-Timestamp) am Event.
- Event bleibt in Drive erhalten, wird aber im Standard-GET ausgefiltert.

## Frontend-Verhalten (`timeline/page.tsx`)
- Beim Laden: `GET /timeline/events`.
- Bei Add/Edit: `PUT /timeline/events`.
- Bei Soft Delete: `PATCH /timeline/events/{id}/soft-delete`.
- Bei leerem Drive-File: Initialdaten werden einmalig per `PUT` geschrieben.

## Hinweis
- Für Produktion `NEXT_PUBLIC_BACKEND_URL` im Frontend setzen (z. B. Render-URL).
- Wenn bei `PUT /timeline/events` ein 403 mit `storageQuotaExceeded` erscheint, muss ein Shared-Drive/Shared-Folder genutzt werden.
- Wenn keine Neuanlage im Zielordner moeglich ist: `timeline_events.json` manuell im Zielordner anlegen und die Datei-ID als `GOOGLE_DRIVE_TIMELINE_FILE_ID` setzen; dann erfolgen nur Updates auf dieser Datei.
