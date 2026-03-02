# Google Drive Timeline Integration

Diese Doku beschreibt die konsistente Speicherung der Timeline-Daten in Google Drive unter `portfolio/timeline`.

## Speicherort
- Google-Drive-Ordner: `portfolio/timeline`
- Datei: `timeline_events.json`
- Quelle der Wahrheit: **nur Drive** (kein lokales Persistenz-File)

## Credentials
- Backend liest `GOOGLE_DRIVE_CREDENTIALS_PATH`.
- Optional für Service Accounts ohne eigenes Drive-Quota: `GOOGLE_DRIVE_SHARED_ROOT_FOLDER_ID`
  - ID eines freigegebenen Ordners oder Shared-Drive-Ordners, auf den der Service-Account Zugriff hat.
- Alternative ohne Ordner-Erstellung:
  - `GOOGLE_DRIVE_TIMELINE_FOLDER_ID`: vorhandener Zielordner für `timeline_events.json`
  - `GOOGLE_DRIVE_TIMELINE_FILE_ID`: vorhandene JSON-Datei, die direkt gelesen/aktualisiert wird
- Fallbacks im Projekt:
  1. `planning/master-purpose-459609-m3-4f50d48eaae4.json`
  2. `planning/client_secret_336033174250-n7dc3gs96v5o9dmsiqjfuscf73umheki.apps.googleusercontent.com.json`

## Backend API
Basisroute: `/api/storage`

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
- Wenn Media-Upload wegen Service-Account-Quota blockiert wird, nutzt der Service automatisch ein Fallback über Datei-Metadaten (`description`) derselben Datei.

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
- Wenn bei `PUT /timeline/events` ein 403 mit `storageQuotaExceeded` erscheint, muss ein Shared-Drive/Shared-Folder genutzt und `GOOGLE_DRIVE_SHARED_ROOT_FOLDER_ID` gesetzt werden.
- Wenn der Service-Account trotzdem nichts neu anlegen darf: `timeline_events.json` manuell im Zielordner anlegen, die Datei-ID als `GOOGLE_DRIVE_TIMELINE_FILE_ID` setzen; dann erfolgen nur Updates auf dieser Datei.
