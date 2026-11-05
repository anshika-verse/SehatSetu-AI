# Test cases

Automated coverage lives in `backend/tests/test_api.py`.

| Check | Expected |
|---|---|
| Health | `status` ok, speech `demo` when no key, database stores no health data |
| Headache | No emergency, concern saved, duration asked next |
| Unsure duration | Summary marks duration as not provided |
| Breathing, chest pain, unconscious, stroke signs, severe bleeding | Emergency, message includes 112 |
| "no chest pain" | No emergency |
| Hindi chest-pain phrase during intake | Intake stops on the urgent message |
| Dengue question | WHO citation |
| Medicine request with no source | Not found |
| "Hb 8.2" | Haemoglobin explained, number not judged |
| No API key | STT mode demo and empty transcript; TTS demo WAV |
| Live adapter test | POST body uses documented Prisma URL, model, and language code without calling Gnani |
| Appointment | `confirmed` false |
| Facilities | Names start with DEMO |

Browser checks: home, speak with typed text, summary, information, resources, and larger-text mode.
