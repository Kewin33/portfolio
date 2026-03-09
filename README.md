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