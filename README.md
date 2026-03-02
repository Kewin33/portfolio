# Portfolio: Alexander Chen

Willkommen in meinem Portfolio-Projekt! Dieses Repository enthält sowohl mein Next.js-basiertes Frontend als auch mein FastAPI-basiertes Backend.

## Vorbereitung & Setup

### Frontend (Next.js)
1. `cd frontend`
2. `npm install` oder `yarn install`
3. `npm run dev`
Das Frontend nutzt `next-intl` für die Zweisprachigkeit (DE/EN) und Tailwind CSS für das Styling.

### Backend (FastAPI)
1. `cd backend`
2. `python -m venv venv`
3. `venv\Scripts\activate` (Windows) oder `source venv/bin/activate` (Mac/Linux)
4. `pip install -r requirements.txt`
5. `uvicorn main:app --reload`

## Wie man existierende Next.js Projekte (Frontend) einfach einbindet
Wenn du bereits ein existierendes Tool (z. B. ein Film-Erstellungstool oder ein Studium-PDF-Tool) hast und es in das Portfolio Frontend fusionieren möchtest, hast du zwei ideale Wege:

### Weg 1: Micro-Frontend (via iFrame / API-Proxy) - Empfohlen für große Projekte
Wenn das alte Projekt zu groß ist, um es nativ in Next.js 14/15 Komponenten umzuwandeln:
1. Hoste das andere Tool extern (z.B. auf einem eigenen Vercel-Projekt).
2. Erstelle im Portfolio eine neue Page (z.B. `frontend/app/[locale]/tools/movie-maker/page.tsx`).
3. Binde es mit einem strukturierten `<iframe>` ein, das responsives Styling hat, um es wie nativ wirken zu lassen.
4. Für geteilte Auth nutze JWT-Token in URL-Parametern oder PostMessage zur Kommunikation zwischen Portfolio und Tool.

### Weg 2: Native Migration (Code umziehen) - Empfohlen für kleine bis mittlere Tools
Achte darauf, dass du das "300 Zeilen pro Dateigrenze"-Konzept beibehältst!
1. Kopiere die React-Komponenten (`.tsx`) des Tools in den Ordner `frontend/components/legacy-tools/[dein-tool]/`.
2. Passe die Tailwind-Klassen des alten Tools an das Portfolio-Thema (Grau + Königsblau) an.
3. Erstelle eine neue Page unter `frontend/app/[locale]/[kategorie]/[toolname]/page.tsx` und importiere die migrierte Haupt-Komponente.
4. Achte auf das Template-System: Umschließe das Tool mit der standardmäßigen `<PageLayout>` Komponente des Portfolios.

## Wie man zugehörige Python Backends einbindet
1. Kopiere die Routen/Endpunkte des existierenden Python-Projekts in einen neuen Router im Ordner `backend/routers/`. Zum Beispiel: `backend/routers/movie_maker.py`.
2. Importiere den Router in der `backend/main.py`: `app.include_router(movie_maker.router, prefix="/api/movie")`.
3. Speichere Daten-Transaktionen: Erweitere den Google Drive Storage Handler (`backend/services/drive_service.py`), sodass das neue Tool direkt auf Google Drive speichern kann als wäre es eine DB, aber behalte einfache Interfaces, falls es in Zukunft auf PostgreSQL umgezogen wird.
