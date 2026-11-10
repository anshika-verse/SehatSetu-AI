<img width="1058" height="634" alt="Screenshot 2026-11-10 102223" src="https://github.com/user-attachments/assets/6cb33899-fe53-4493-9193-00617a18f8d5" />
<img width="1347" height="632" alt="Screenshot 2026-11-10 101817" src="https://github.com/user-attachments/assets/a57fdaaa-6b25-4ce2-ab7c-9086e6cd9d76" />
<img width="1346" height="633" alt="Screenshot 2026-11-10 101658" src="https://github.com/user-attachments/assets/920f5f5a-eb4c-4f7b-87c4-51c8e5869a00" />
# SehatSetu AI

SehatSetu AI helps people describe a health concern , review the transcript, and prepare a patient-reported summary for a qualified clinician. It is not an AI doctor. It does not diagnose, prescribe, or recommend a dose.

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
