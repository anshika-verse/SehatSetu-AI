# SehatSetu AI

SehatSetu AI helps people describe a health concern in Hindi or Hinglish, review the transcript, and prepare a patient-reported summary for a qualified clinician. It is not an AI doctor. It does not diagnose, prescribe, or recommend a dose.

Speech uses the documented Gnani APIs when `GNANI_API_KEY` is set:

- Prisma REST: `POST https://api.vachana.ai/stt/v3`
- Timbre REST: `POST https://api.vachana.ai/api/v1/tts/inference`

Without a key, speech runs in a labelled **DEMO** mode. The demo does not invent a transcript.

## Run locally

Backend, from the project folder:

```powershell
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000
```

If the virtual environment is missing:

```powershell
py -3 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and add a Gnani key only on that machine. Never put the key in frontend code.

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to port 8000.

## Tests

```powershell
backend\.venv\Scripts\python.exe -m pytest backend
cd frontend
npm run build
```

## Limits

- Hindi and Hinglish only.
- Emergency checks are a short phrase list. They cannot rule an emergency out.
- Health explanations come from the local cited files, not from a live medical model.
- Facility listings and appointment requests are DEMO data. A request is never a confirmed booking.
- Raw audio and health details are not written to the database. The SQLite file stores only an app schema marker. Optional reminder text stays in the browser after consent.
