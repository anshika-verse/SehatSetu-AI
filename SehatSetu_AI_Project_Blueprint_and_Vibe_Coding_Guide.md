# SEHATSETU AI — Complete Project Blueprint & Vibe-Coding Playbook

**Tagline:** Your Voice. Your Language. Better Healthcare Access.  
**Category:** Multilingual, voice-first healthcare navigation and patient-support platform  
**Competition:** Great Indian AI Internship Challenge — Gnani AI  
**Prepared:** 5 November 2026

---

## 1. Executive summary

**SehatSetu AI is not an AI doctor.** It is a multilingual, voice-first healthcare navigation and patient-support platform. It helps people explain their health concerns in a language they are comfortable with, organises the information they provide, identifies predefined emergency warning signs, explains trusted public-health information in simple language, and prepares a concise summary that a qualified healthcare professional can review.

### The problem

People may struggle to access or understand healthcare information because of:
- Language barriers and natural Hindi-English code-switching.
- Limited digital literacy, especially among some elderly and rural/semi-urban users.
- Difficulty describing symptoms in an organised way.
- Medical terminology that is hard to understand.
- Lack of awareness of verified public-health information and available services.

### The solution

A user can speak instead of typing. SehatSetu:
1. Transcribes the user's audio using Gnani Prisma.
2. Lets the user review/correct the transcript.
3. Collects relevant information through safe follow-up questions.
4. Runs a deterministic, clinically reviewed emergency-warning checklist.
5. Retrieves relevant, approved information from a small, cited knowledge base.
6. Produces a plain-language explanation and a patient-reported consultation summary.
7. Speaks the response using Gnani Timbre.
8. Offers healthcare-resource navigation and appointment assistance where a real provider integration exists.

**The product must never claim to diagnose a disease, prescribe medicines, or replace a clinician.**

---

## 2. Product goals and non-goals

### Goals
- Voice-first interaction with a simple, accessible interface.
- Reliable Hindi/Hinglish experience first; add more languages only after testing actual STT and TTS support.
- Use Gnani speech models as essential parts of the experience.
- Collect and organise patient-reported information without inventing missing details.
- Detect a limited set of predefined emergency red flags and clearly advise urgent human care.
- Explain approved health information with visible source references.
- Prepare a clinician-reviewable summary.
- Demonstrate privacy, consent, safety, and error handling.

### Non-goals
- Autonomous diagnosis.
- Prescriptions, drug selection, dosage, or treatment plans.
- Replacing doctors, nurses, ASHA workers, or emergency services.
- Claiming a hospital/doctor is available without verified live data.
- Claiming an appointment is booked unless a real booking provider confirms it.
- Claiming that the system can detect every emergency or understand every accent perfectly.

---

## 3. Who is the first user?

Start with one clear audience:

**Hindi/Hinglish-speaking adults and caregivers in rural or semi-urban communities who need help explaining a health concern and understanding basic, verified healthcare information.**

Design for:
- Elderly users and people with limited digital literacy.
- Users who prefer speaking over typing.
- Caregivers helping another person.

Do not collect a patient's name, phone number, exact address, or detailed medical history unless a feature genuinely requires it and the user has explicitly consented.

---

## 4. Features — complete product vision

All the features below belong in the product roadmap. They should not all be built as fully live integrations in one rushed coding pass. Build the core journey first, then activate the advanced modules. A visible, honest “coming soon / demo mode” state is better than a fake integration.

### A. Core patient-support features

#### 1. Multilingual voice interaction
- Record from the browser microphone and allow audio upload.
- Send audio to the backend; never expose Gnani API credentials in frontend code.
- Transcribe using Gnani Prisma.
- Display transcript and allow the user to correct it before proceeding.
- Keep the original language/code-mix where the model supports it.
- Generate a response in the selected/supported language.
- Convert the response to audio using Gnani Timbre.
- Provide replay, mute, and text fallback controls.

**Initial language scope:** Hindi and Hinglish. Add one more language (for example, Tamil or Telugu) only after confirming both transcription and voice generation work with the account's current model/version and testing real examples.

#### 2. Smart patient intake / symptom collection
- Ask short, relevant follow-up questions.
- Collect only information needed for a patient-reported summary: main concern, duration, user-described severity, associated symptoms, and relevant missing details.
- Clearly label every value as “reported by user” or “not provided”.
- Never infer age, temperature, diagnosis, or medical history.
- Let the user correct the information.

#### 3. Emergency red-flag safety flow
- Use a small, deterministic rules module based on a clinically reviewed checklist.
- If a configured red flag is present, stop routine intake and show/speak an urgent-care message.
- In India, show 112 as an emergency-call option where appropriate; do not claim the app has contacted emergency services.
- Never make the LLM the only emergency detector.
- Show a clear note that the checklist is limited and cannot rule out an emergency.

Examples to test with clinician-reviewed wording: severe breathing difficulty, severe chest pain, unconsciousness, signs suggestive of stroke, and severe bleeding. Do not build a broad medical triage engine without qualified clinical review.

#### 4. Doctor-ready patient-reported summary
Generate a structured, editable summary:
- Main concern.
- Duration.
- Associated symptoms.
- User-reported severity.
- Answers to follow-up questions.
- Missing/unconfirmed information.
- Emergency warning triggered (if any).
- Sources shown to the user, if information was retrieved.

Label it **“Patient-reported summary — not a diagnosis.”** Allow the user to download or copy it. Sharing should require an explicit user action.

#### 5. Verified health-information explainer (RAG)
- Create a small knowledge base from approved, public, authoritative sources.
- Retrieve relevant passages for a question.
- Ask the language model to explain only what the retrieved material supports.
- Display source title, publisher, and source link.
- If no suitable source is found, say so and recommend asking a qualified professional.
- Keep educational information separate from personalised medical advice.

Suggested sources: WHO, India's Ministry of Health and Family Welfare, National Health Mission, and official government health portals. Check the date, relevance, and reuse conditions of every document before adding it.

#### 6. Voice response
- Generate speech with Gnani Timbre.
- Keep the text answer visible even if TTS fails.
- Show a retry button and a clear error state.
- Do not promise a particular voice, language, or audio format until confirmed in the live API documentation and dashboard.

### B. Advanced modules

#### 7. Medical-report terminology simplifier
- Accept a PDF/image only with user consent.
- Extract text; do not silently invent missing or unreadable values.
- Explain selected medical terms in plain language using approved references.
- Do not diagnose from lab values or tell users to start/stop medication.
- Show extracted text for user confirmation and cite sources.

#### 8. Government healthcare-scheme navigator
- Answer from a curated set of official government sources only.
- Explain scheme purpose, stated eligibility criteria, documents, and official next steps.
- Display the source and last-checked date.
- Say “check eligibility with the official authority”; never guarantee eligibility or benefits.

#### 9. Healthcare-facility and appointment assistance
- Ask for location only when needed and with consent.
- In the first prototype, use clearly labelled sample/demo facility data if no verified live provider API is available.
- For real listings, use a legitimate data source and show when it was last checked.
- Booking is “requested” only after a real provider confirms it. Never fake a booking confirmation.

#### 10. Elderly-friendly mode
- Large microphone and action buttons.
- Large readable text and high contrast.
- Few screens and simple wording.
- Repeat-audio control.
- Text alternative for every spoken response.
- Avoid relying on colour alone to communicate risk.

#### 11. Follow-up organiser
- Let users save a summary locally or to an account only with consent.
- Optional reminder to consult a clinician or follow clinician-provided instructions.
- Do not generate a treatment schedule or medication reminder from the AI's own guess.
- Let users delete saved records.

---

## 5. Recommended build approach and platform

### Best fit for this project: Google Antigravity IDE + local codebase

Use **Google Antigravity as the vibe-coding IDE**, not as the hosting platform. It can inspect a project, plan multi-file changes, edit code, and help run/test the application. It is a good fit because the project needs a real backend, API secrets, safety logic, RAG, and multiple screens—not just a static generated website.

Official Antigravity information:
- https://antigravity.google/
- https://www.antigravity.google/docs/agent/
- https://www.antigravity.google/pricing/

**Recommended stack**
- Frontend: React + Vite + TypeScript.
- Styling: Tailwind CSS (or the project's existing styling system; do not add a second UI framework unnecessarily).
- Backend: Python + FastAPI.
- Speech: Gnani Prisma STT and Gnani Timbre TTS through backend-only adapters.
- Reasoning: use the model/API that is actually available to your account. Do not assume Evon is available as a hosted API. If using Evon weights, verify access, hardware, deployment requirements, and licence first. A separate LLM may be used for the prototype's reasoning, but disclose it and keep Gnani speech models central.
- Database for prototype: SQLite. Move to PostgreSQL only when needed.
- RAG: start with a small curated document set and simple retrieval. Add Chroma/FAISS only if it solves a real need.
- Document extraction: PyMuPDF for PDFs; add image OCR only if needed.
- Tests: pytest for backend; manual browser tests for the end-to-end voice flow.
- Version control: Git + GitHub.

### Why not start with Streamlit?

Streamlit is quick for a Python demo and has a microphone recording widget. It is a valid fallback if time is extremely short. However, React + FastAPI is a better long-term product structure for accessible multi-screen UX, separate frontend/backend, secure API handling, and future integrations.

Streamlit audio input documentation: https://docs.streamlit.io/develop/api-reference/widgets/st.audio_input

### Other vibe-coding options

- **Antigravity:** recommended for this project; use it to build and review the actual codebase.
- **Cursor:** good AI coding IDE alternative if you already use it and have access.
- **Replit:** convenient for browser-based coding and quick deployment, but check current plan/usage limits and secret handling.
- **Lovable/Bolt:** useful for generating a frontend quickly; less suitable as the only environment for a custom Python backend, medical safety rules, and Gnani API integration. You can use one for UI inspiration, but keep the actual source code in GitHub.

Do not switch platforms repeatedly. Pick one IDE and keep the source of truth in one Git repository.

---

## 6. High-level architecture

```text
Browser / React UI
  ├── Microphone recording / audio upload
  ├── Language selection
  ├── Transcript review and correction
  ├── Patient intake conversation
  ├── Summary / sources / resource screens
  └── Audio playback
          |
          | HTTPS requests
          v
FastAPI backend
  ├── Consent and request validation
  ├── Audio validation / size limits
  ├── Gnani Prisma adapter (STT)
  ├── Transcript normalisation
  ├── Patient-intake state manager
  ├── Deterministic emergency rules
  ├── Knowledge retrieval (RAG)
  ├── LLM adapter (strict structured output)
  ├── Summary generator
  ├── Gnani Timbre adapter (TTS)
  ├── Scheme/resource module
  ├── Appointment adapter (demo until real provider exists)
  └── Optional consent-based storage
          |
          v
Response JSON + audio bytes / audio URL
          |
          v
React displays text, risk message, citations, summary and audio
```

### Important API rule

Do not invent Gnani endpoint URLs, headers, request fields, model names, or response formats. Before coding each adapter:
1. Open the current official Gnani API documentation and dashboard.
2. Confirm the exact model/version enabled for the account.
3. Confirm authentication method, endpoint, payload, supported audio format, language options, and response format.
4. Test one small sample in the dashboard or official quick start.
5. Implement from that verified contract.
6. Keep all keys in backend environment variables.

Useful official resources:
- API documentation: https://docs.gnani.ai/api/introduction/introduction
- Gnani platform: https://app.gnani.ai/
- Prisma product details: https://www.gnani.ai/resources/prisma-v3
- Timbre product details: https://www.gnani.ai/text-to-speech-api
- Gnani API service repository: https://github.com/gnani-ai/API-service
- Evon model information: https://huggingface.co/gnani/gnani-evon-v3.3-30B-A3B

The exact model/version available to the competition account may differ from a public product page. Use the account dashboard and competition instructions as the source of truth.

---

## 7. Suggested repository structure

```text
sehatsetu-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/api.ts
│   │   ├── hooks/
│   │   ├── types/
│   │   └── App.tsx
│   ├── package.json
│   └── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── gnani_stt.py
│   │   │   ├── gnani_tts.py
│   │   │   ├── llm_provider.py
│   │   │   ├── intake.py
│   │   │   ├── safety_rules.py
│   │   │   ├── rag.py
│   │   │   ├── report_explainer.py
│   │   │   ├── schemes.py
│   │   │   └── appointments.py
│   │   └── data/
│   │       └── knowledge_base/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── docs/
│   ├── architecture.md
│   ├── safety-and-privacy.md
│   └── test-cases.md
├── .gitignore
├── README.md
└── PROJECT_PLAN.md
```

Keep the structure simple. If the coding agent creates a different but clean structure, do not force a refactor just to match this tree.

---

## 8. Environment and setup

Install:
- Git.
- Python 3.11 or a version supported by the selected libraries.
- Node.js LTS.
- Antigravity IDE.

Create a GitHub repository named `sehatsetu-ai`.

### Backend setup (Windows PowerShell)

```powershell
mkdir sehatsetu-ai
cd sehatsetu-ai
mkdir backend, frontend, docs
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install fastapi uvicorn[standard] python-multipart pydantic-settings requests httpx python-dotenv pytest
pip freeze > requirements.txt
```

If PowerShell blocks activation, use the appropriate Windows virtual-environment activation guidance or run the venv's Python executable directly. Do not disable security settings globally.

### Frontend setup

From the project root:

```powershell
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install lucide-react
```

Add Tailwind only if the agent configures it correctly for the installed Vite version. Avoid installing multiple component libraries.

### Environment files

`backend/.env.example`:

```env
GNANI_API_KEY=
GNANI_STT_BASE_URL=
GNANI_STT_MODEL=
GNANI_TTS_BASE_URL=
GNANI_TTS_MODEL=
LLM_PROVIDER=
LLM_API_KEY=
LLM_BASE_URL=
DATABASE_URL=sqlite:///./sehatsetu.db
```

The exact environment variable names may be adjusted to match the verified Gnani API contract. Do not commit `.env`. Add `.env`, secrets, local databases, uploaded audio, and generated patient data to `.gitignore`.

**Never paste a real API key into a prompt, source file, screenshot, public repository, or frontend environment variable.** Enter it only in a local backend `.env` file or the hosting provider's secret manager.

---

## 9. API design (contract first)

Create backend routes with clear input/output schemas. Exact fields can be adjusted during implementation.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| POST | `/api/stt/transcribe` | Audio → Gnani transcript |
| POST | `/api/intake/turn` | Process one patient conversation turn |
| POST | `/api/safety/check` | Run deterministic red-flag rules |
| POST | `/api/knowledge/ask` | Retrieve approved sources and explain |
| POST | `/api/tts/speak` | Text → Gnani audio |
| POST | `/api/summary/generate` | Create patient-reported summary |
| POST | `/api/report/explain` | Explain selected report terminology |
| GET | `/api/resources/schemes` | Search curated official scheme data |
| GET | `/api/resources/facilities` | Demo or verified facility listing |
| POST | `/api/appointments/request` | Demo request or real provider adapter |

Every route should validate input, return useful errors, and avoid logging raw audio or personal health information by default.

---

## 10. Development phases and priority

The full feature vision is retained, but implementation should be staged so that the main flow works before advanced modules are added.

### Phase 0 — Foundation (first)
- Create repository and frontend/backend skeleton.
- Create `.env.example` and `.gitignore`.
- Add `/api/health`.
- Add a polished, responsive app shell.
- Confirm frontend can call backend.

**Done when:** the app runs locally and health check succeeds.

### Phase 1 — Gnani voice pipeline (highest priority)
- Confirm Prisma and Timbre access in Gnani dashboard.
- Test a short Hindi audio sample.
- Implement backend-only STT adapter.
- Show transcript in UI and allow editing.
- Implement TTS adapter from verified docs.
- Play generated audio in browser.
- Add mock adapter for development when credentials are not present, clearly labelled “Demo mode”.

**Done when:** a user records/sends audio, sees a transcript, gets a response, and hears generated audio. No API keys in browser.

### Phase 2 — Patient intake + safety
- Implement a controlled multi-turn question flow.
- Validate structured data with Pydantic.
- Add deterministic red-flag rules from an approved checklist.
- Emergency response interrupts routine flow.
- Generate patient-reported summary.
- Add tests for normal, incomplete, unclear, and emergency examples.

**Done when:** the same input reliably produces the expected safe flow and summary.

### Phase 3 — Grounded health-information RAG
- Add a small, curated, approved knowledge base.
- Chunk and index documents.
- Retrieve top relevant passages.
- Generate an answer only from retrieved context.
- Show citations and “not found” behaviour.
- Add a clear disclaimer and human-care guidance.

**Done when:** every factual health-information answer has a visible source or clearly says it could not find a reliable source.

### Phase 4 — Advanced features
Build these as separate modules:
- Medical report terminology simplifier.
- Government scheme navigator.
- Facility discovery.
- Appointment assistance.
- Elderly-friendly mode.
- Consent-based history and follow-up organiser.

Use demo/sample data only when clearly labelled. Do not claim live availability or completed booking without a real provider response.

### Phase 5 — Quality, deployment and demo
- Test supported languages and accents.
- Test noisy audio without promising perfect accuracy.
- Test API failure, empty audio, large file, unsupported language, and network timeout.
- Check mobile responsiveness and accessibility.
- Remove secrets and personal data from logs.
- Deploy backend and frontend.
- Record a short demo with synthetic/test data.
- Prepare README, architecture, safety, limitations, and test results.

---

## 11. Low-token vibe-coding workflow

### The rule

Do not ask the coding agent to build the entire application in one huge prompt. It may create inconsistent files, guess API details, overwrite working code, or generate features that look finished but do not work.

Use this loop:
1. Ask it to inspect the repository.
2. Give one bounded task.
3. Ask it to list files it will change.
4. Let it implement only that task.
5. Run the app/tests.
6. Fix errors before moving to the next phase.
7. Commit a working checkpoint.

### Master project instruction (send once)

Copy this into Antigravity's project rules/instructions:

```text
You are the senior engineer for SehatSetu AI, a multilingual voice-first healthcare navigation app.

STACK: React + Vite + TypeScript frontend; Python FastAPI backend; Gnani Prisma STT and Gnani Timbre TTS through backend-only adapters; SQLite for prototype.

NON-NEGOTIABLE:
1. Inspect the existing repository before editing. Preserve working code and existing user files.
2. Never delete, rename, overwrite, or restructure unrelated files. Make the smallest necessary changes.
3. Do not invent Gnani endpoints, headers, payloads, model IDs, or response formats. Read current official docs or ask me for the verified API details. If unavailable, create a clearly labelled mock adapter.
4. Keep all secrets on backend in .env. Never expose keys to React or commit them.
5. This is healthcare navigation, NOT an AI doctor. No diagnosis, prescriptions, dosage, or treatment decisions.
6. Emergency checks must be deterministic rules, not LLM-only. Use approved wording and make limitations clear.
7. RAG answers must use approved sources and show citations. If evidence is missing, say so.
8. Use typed schemas, input validation, useful errors, accessible UI, and tests.
9. Do not add unnecessary packages or duplicate frameworks. Keep code modular and simple.
10. Do not claim a feature or integration works until it has been run and tested.

WORK STYLE:
- Work on one phase/task at a time.
- Before coding, give a 5-line plan and list files to create/change.
- Then implement only the requested task.
- Run relevant tests/build and report exact results.
- Do not make unrelated improvements.
- Keep explanations concise and token-efficient.
```

### Prompt 1 — inspect and plan only

```text
Inspect the repository. Do not edit files. Report the current stack, existing files, missing setup, and the smallest implementation plan for Phase 0. Identify risks and wait for my approval.
```

### Prompt 2 — project skeleton

```text
Implement Phase 0 only: React-Vite-TypeScript frontend, FastAPI backend, /api/health route, frontend-backend connection, responsive app shell, .env.example and .gitignore. Preserve existing files. Do not implement medical or Gnani logic yet. Run frontend build and backend tests; report commands/results.
```

### Prompt 3 — Gnani API verification and adapters

```text
Implement Phase 1 only. First inspect the official Gnani docs and the API details I provide. Do not guess endpoints or payloads. Create backend-only Prisma STT and Timbre TTS adapters, transcript review UI, audio playback, timeouts and clear errors. Add mock mode when credentials are absent. Keep secrets in backend .env. Test each adapter with a small sample or clearly report what cannot be tested.
```

### Prompt 4 — patient intake

```text
Implement smart patient intake only. Create typed structured fields for concern, duration, user-reported severity, associated symptoms and missing information. Ask one short follow-up at a time. Never infer missing facts or diagnose. Add tests for complete, incomplete and unclear answers. Do not change the Gnani adapters.
```

### Prompt 5 — safety rules and summary

```text
Implement the deterministic emergency red-flag module and patient-reported summary. Use only the approved checklist and wording I provide; do not invent clinical rules. Emergency flow must interrupt normal intake. No diagnosis, prescription or dosage. Label the summary as patient-reported and not a diagnosis. Add unit tests for every rule and a non-emergency case.
```

### Prompt 6 — RAG

```text
Implement a small RAG module using only the documents in backend/app/data/knowledge_base. Show source title, publisher and link for every supported answer. If no source supports the answer, say the information was not found. Do not use RAG to diagnose, prescribe or override emergency rules. Add retrieval and citation tests.
```

### Prompt 7 — advanced modules

```text
Implement the advanced modules as separate, disabled-by-default sections: medical report terminology explainer, government scheme navigator, facility discovery, appointment assistance, elderly-friendly mode and consent-based follow-up. Use verified sources or clearly labelled demo data. Never fake a live facility, available slot or confirmed booking. Keep existing core flow unchanged.
```

### Prompt 8 — final audit

```text
Audit the complete app. Do not redesign or rewrite working modules. Run frontend build, backend tests and end-to-end checks. Check secrets, unsafe medical claims, missing citations, broken audio, API errors, mobile layout, consent, and demo labels. Fix only confirmed defects. Return a concise checklist of passed/failed items and remaining limitations.
```

**Token-saving tip:** Send only the prompt for the current phase. Do not paste the entire project brief into every message. Keep the master instruction in project rules and use short task prompts.

---

## 12. Test plan

Use synthetic test scenarios; do not upload real patient data for a public demo.

| Test | Input | Expected behaviour |
|---|---|---|
| Hindi audio | Clear Hindi symptom description | Transcript appears; user can edit |
| Hinglish audio | Hindi-English mixed sentence | Best-effort transcript; uncertainty is visible |
| Unsupported language | Language not enabled | Clear supported-language message |
| Poor audio | Silence/noise | Ask user to retry; no invented transcript |
| Missing details | “I have a headache” | Ask a relevant follow-up |
| Emergency test | Clinician-approved red-flag example | Immediate urgent-care message |
| Normal intake | Non-red-flag example | Continue intake; no diagnosis |
| RAG question | Question covered by approved source | Simple answer with citation |
| Unsupported health question | No relevant source | Say evidence was not found |
| TTS failure | Simulated provider timeout | Text remains visible; retry offered |
| No API key | Local demo mode | Mock clearly labelled; no false claim of live Gnani call |
| Appointment demo | Request a slot without provider | Label as demo/request only; no fake confirmation |

Record actual test results. Never invent accuracy, latency, clinical safety, or user-impact statistics.

---

## 13. UI design requirements

Use a calm, accessible visual system:
- Warm white/light background, restrained teal/green accent, dark readable text.
- Large microphone button and clear recording state.
- Language selector with only tested languages.
- Visible transcript with edit option.
- Clear stages: Speak → Review → Answer → Summary.
- Emergency warning must be visually and verbally clear, not colour-only.
- Audio player with replay and text alternative.
- Large controls and simplified layout for elderly mode.
- Responsive mobile layout.
- No fake patient testimonials, hospital logos, doctor endorsements, or fabricated statistics.

Suggested screens:
1. Welcome / language selection.
2. Voice conversation.
3. Transcript review.
4. Patient information and follow-up.
5. Health information with source citations.
6. Patient-reported summary.
7. Healthcare resources / schemes.
8. Report terminology explainer.
9. Settings, consent and data deletion.

---

## 14. Privacy, safety and responsible AI

This is health-related software. Treat privacy and safety as product requirements.

- Ask permission before recording and explain why audio is processed.
- Do not store raw audio by default.
- Do not store identifiable health information unless necessary and consented to.
- Provide a clear delete/reset option for saved information.
- Use HTTPS in deployment.
- Keep API keys in backend secrets.
- Avoid logging transcripts, audio, names, phone numbers, or health details.
- Use synthetic data in the demo.
- State clearly that the tool is not a substitute for professional care.
- Do not diagnose or prescribe.
- Do not delay emergency care while asking routine questions.
- Use qualified clinical review for emergency rules and health content before real-world use.
- Have a qualified healthcare professional review the demo scripts and red-flag wording before presenting it as clinically validated.

Useful background:
- WHO guidance on safe and ethical AI for health: https://www.who.int/news/item/16-05-2023-who-calls-for-safe-and-ethical-ai-for-health
- India Telemedicine Practice Guidelines: https://egazette.gov.in/WriteReadData/2020/219374.pdf

This project blueprint is an engineering plan, not medical advice or a claim of regulatory approval.

---

## 15. Deployment plan

For a competition demo:
- Frontend: deploy the React build to a static hosting provider.
- Backend: deploy FastAPI to a provider that supports Python web services.
- Add Gnani and LLM credentials only in the backend hosting secret manager.
- Configure CORS to allow only the deployed frontend domain.
- Use HTTPS.
- Use a temporary database or SQLite only for a single-instance demo; use managed PostgreSQL if persistent multi-user data is needed.
- Keep a local demo mode in case the external API is unavailable during judging.

Before public deployment, check current free-tier limits, sleep behaviour, file upload limits, bandwidth, and secret-management support. A sleeping backend or exhausted free quota can break a live demo.

---

## 16. Demo story (about 2–3 minutes)

Use synthetic scenarios and show actual model/API calls where possible.

1. **Opening (15 sec):** “Many people struggle to explain health concerns or understand healthcare information in a language they are comfortable with.”
2. **Voice input (25 sec):** Speak a short Hindi/Hinglish test sentence. Show the real Prisma transcript and edit option.
3. **Smart intake (25 sec):** Show one follow-up question and the structured patient-reported information.
4. **Safety (20 sec):** Run a separate, clearly labelled synthetic emergency test. Show the rule-based urgent-care response. Do not present this as a clinical validation.
5. **RAG (25 sec):** Ask a general health-information question covered by the knowledge base; show the source citation.
6. **TTS (15 sec):** Play the Timbre-generated response.
7. **Summary (20 sec):** Show the patient-reported summary and explain how it can help prepare for a clinician visit.
8. **Close (10 sec):** State the limitations honestly and explain the future plan for more tested Indian languages and verified healthcare integrations.

Do not imply that the app booked an appointment, contacted a doctor, or diagnosed a patient unless the relevant real integration actually did so.

---

## 17. Submission checklist

- [ ] App runs locally from a clean setup.
- [ ] Public demo URL works.
- [ ] Gnani Prisma integration is real and demonstrated.
- [ ] Gnani Timbre integration is real and demonstrated.
- [ ] API keys are not in GitHub or frontend code.
- [ ] README contains setup, architecture, features, limitations and screenshots.
- [ ] `docs/safety-and-privacy.md` explains safeguards.
- [ ] `docs/test-cases.md` records actual tests.
- [ ] Demo video shows the complete working journey.
- [ ] LinkedIn/X post tags the official challenge and required hashtags, as per contest instructions.
- [ ] Submission form is completed before the official deadline.
- [ ] Team/individual eligibility and account-credit rules are checked against the official email.

---

## 18. Final recommendation

Build **SehatSetu AI as one coherent product**, not a collection of disconnected AI demos.

The strongest competition story is:

> “SehatSetu AI uses Indian-language speech technology to help people communicate their health concerns, organise patient-reported information, understand verified healthcare resources, and prepare for a conversation with a qualified healthcare professional.”

Prioritise the complete working voice journey, patient intake, deterministic safety flow, sourced health explainer, summary, and both Gnani speech integrations. Keep the other roadmap features in the product, but activate them only when their data sources and integrations are genuine.

**A small, tested, transparent healthcare-support product is stronger than a large application full of simulated claims.**
