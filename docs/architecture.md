# Architecture

The browser records 16 kHz WAV, shows an editable transcript, and sends text to FastAPI. Gnani credentials never leave the backend.

Intake stores only the words the user typed or approved. Red-flag checks run on every turn before the next question. Knowledge answers are retrieved from `backend/app/data/knowledge_base/sources.json` and always carry the publisher and URL. If nothing matches, the API says so.

SQLite is initialised for the prototype and contains no health columns.
