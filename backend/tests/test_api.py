import io
import wave

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def wav_bytes() -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(16000)
        handle.writeframes(b"\x00\x00" * 1600)
    return buffer.getvalue()


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["speech_mode"] in {"demo", "live"}
    assert body["database"]["stores_health_data"] is False


def test_headache_is_not_an_emergency_and_asks_duration() -> None:
    response = client.post("/api/intake/turn", json={"message": "I have a headache", "state": {}})
    body = response.json()
    assert body["emergency"] is False
    assert body["state"]["main_concern"] == "I have a headache"
    assert body["state"]["awaiting"] == "duration"
    assert "diagnos" not in body["assistant_message"].lower()


def test_unsure_duration_is_not_invented() -> None:
    state = {"main_concern": "headache", "awaiting": "duration"}
    response = client.post("/api/intake/turn", json={"message": "I don't know", "state": state})
    body = response.json()
    assert body["state"]["duration"] == "I don't know"
    summary = client.post("/api/summary/generate", json={"state": body["state"]})
    duration = next(item for item in summary.json()["fields"] if item["label"] == "Duration")
    assert duration["source"] == "not_provided"


def test_each_red_flag() -> None:
    samples = {
        "breathing": "I have severe breathing difficulty",
        "chest_pain": "severe chest pain since one hour",
        "unconscious": "he is unconscious",
        "stroke": "sudden face drooping and slurred speech",
        "bleeding": "there is severe bleeding that will not stop",
    }
    for flag, text in samples.items():
        response = client.post("/api/safety/check", json={"text": text})
        body = response.json()
        assert body["emergency"] is True
        assert flag in body["flags"]
        assert "112" in body["message"]


def test_negated_chest_pain_is_not_a_flag() -> None:
    response = client.post("/api/safety/check", json={"text": "no chest pain, only a mild headache"})
    assert response.json()["emergency"] is False


def test_emergency_interrupts_intake() -> None:
    response = client.post(
        "/api/intake/turn",
        json={"message": "mujhe seene mein dard ho raha hai", "state": {"language": "hi"}},
    )
    body = response.json()
    assert body["emergency"] is True
    assert body["state"]["awaiting"] == "concern"
    assert "112" in body["assistant_message"]


def test_summary_label() -> None:
    response = client.post("/api/summary/generate", json={"state": {"main_concern": "bukhar"}})
    body = response.json()
    assert body["title"].startswith("Patient-reported summary")
    assert "not a diagnosis" in body["title"]


def test_knowledge_hit_and_miss() -> None:
    hit = client.post("/api/knowledge/ask", json={"question": "What is dengue?"})
    assert hit.json()["found"] is True
    assert hit.json()["citations"][0]["publisher"] == "World Health Organization"
    miss = client.post("/api/knowledge/ask", json={"question": "Which tablet should I take tonight?"})
    assert miss.json()["found"] is False


def test_report_term_does_not_interpret_a_number() -> None:
    response = client.post("/api/report/explain", json={"term": "Hb 8.2"})
    body = response.json()
    assert body["found"] is True
    assert "does not say whether a result is normal" in body["answer"]


def test_demo_stt_and_tts(monkeypatch) -> None:
    monkeypatch.setattr("app.services.gnani_stt.settings.gnani_api_key", "")
    response = client.post(
        "/api/stt/transcribe",
        files={"audio": ("clip.wav", wav_bytes(), "audio/wav")},
        data={"language": "hi"},
    )
    body = response.json()
    assert response.status_code == 200
    assert body["mode"] == "demo"
    assert body["transcript"] == ""
    assert "DEMO" in body["notice"]

    spoken = client.post("/api/tts/speak", json={"text": "Namaste", "language": "hi"})
    assert spoken.status_code == 200
    assert spoken.headers["x-sehatsetu-speech-mode"] == "demo"
    assert spoken.content[:4] == b"RIFF"


def test_live_stt_uses_documented_contract(monkeypatch) -> None:
    captured: dict = {}

    class FakeResponse:
        status_code = 200
        content = b"{}"

        def json(self) -> dict:
            return {
                "success": True,
                "transcript": "sir mein dard hai",
                "model": "prisma-v3.0",
                "detected_language_code": "hi-IN",
            }

    async def fake_post(self, url, **kwargs):
        captured["url"] = url
        captured["headers"] = kwargs["headers"]
        captured["data"] = kwargs["data"]
        return FakeResponse()

    monkeypatch.setattr("app.services.gnani_stt.settings.gnani_api_key", "test-key")
    monkeypatch.setattr("app.services.gnani_stt.settings.speech_mode", "auto")
    monkeypatch.setattr("httpx.AsyncClient.post", fake_post)

    response = client.post(
        "/api/stt/transcribe",
        files={"audio": ("clip.wav", wav_bytes(), "audio/wav")},
        data={"language": "hinglish"},
    )
    assert response.status_code == 200
    assert response.json()["mode"] == "live"
    assert captured["url"] == "https://api.vachana.ai/stt/v3"
    assert captured["headers"]["X-API-Key-ID"] == "test-key"
    assert captured["data"]["model"] == "prisma-v3.0"
    assert captured["data"]["language_code"] == "hi-IN,en-IN"


def test_appointment_is_not_confirmed() -> None:
    response = client.post(
        "/api/appointments/request",
        json={"facility_name": "DEMO District Hospital", "preferred_time": "tomorrow morning", "consent": True},
    )
    body = response.json()
    assert body["confirmed"] is False
    assert body["status"] == "demo_request_only"


def test_facilities_are_labelled_demo() -> None:
    body = client.get("/api/resources/facilities").json()
    assert body["demo"] is True
    assert "DEMO" in body["facilities"][0]["name"]


def test_health_includes_all_healthcare_modules() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert "gnani" in body
    assert "triage" in body
    assert "medicine" in body
    assert "safety" in body
    assert body["safety"]["agent"] == "SafetyAgent"


def test_safety_agent_red_flags_and_guardrails() -> None:
    # Anaphylaxis emergency detection
    ana = client.post("/api/safety/check", json={"text": "my throat is swelling and I cannot swallow"})
    assert ana.status_code == 200
    assert ana.json()["emergency"] is True
    assert "anaphylaxis" in ana.json()["flags"]

    # Negation check
    neg = client.post("/api/safety/check", json={"text": "no throat swelling, only mild fatigue"})
    assert neg.json()["emergency"] is False

    # Guardrail against prescription / diagnostic assertions
    from app.agents.safety_agent import guard_response
    guarded = guard_response("You have malaria. Take 500mg paracetamol immediately.")
    assert guarded["safe"] is False
    assert "diagnostic_claim_detected" in guarded["violations"]
    assert "dosage_or_prescription_detected" in guarded["violations"]
    assert "licensed clinician" in guarded["sanitized_text"]


def test_triage_unconfigured_status_and_emergency_interception() -> None:
    # Test unconfigured credentials behavior
    response = client.post(
        "/api/triage/evaluate",
        json={"text": "I have had a mild runny nose since yesterday", "language": "hinglish"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "disclaimer" in body
    assert body["status"] in {"credentials_missing", "completed"}

    # Test emergency interception in triage
    emer_res = client.post(
        "/api/triage/evaluate",
        json={"text": "severe chest pain radiating to left arm", "language": "hinglish"},
    )
    assert emer_res.status_code == 200
    emer_body = emer_res.json()
    assert emer_body["status"] == "emergency_detected"
    assert emer_body["triage"]["urgent"] is True


def test_medicine_lookup_endpoint() -> None:
    response = client.post("/api/medicine/lookup", json={"term": "ibuprofen", "language": "hinglish"})
    assert response.status_code == 200
    body = response.json()
    assert body["query"] == "ibuprofen"
    assert "openfda" in body
    assert "rxnorm" in body
    assert "MEDICINE LABEL INFORMATION ONLY" in body["disclaimer"]


def test_nearby_places_endpoint() -> None:
    response = client.post(
        "/api/places/nearby",
        json={
            "latitude": 28.5672,
            "longitude": 77.2100,
            "radius_km": 10.0,
            "category": "hospital",
            "symptoms": "severe chest pain and breathlessness",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["count"] > 0
    assert len(body["facilities"]) > 0
    first = body["facilities"][0]
    assert "name" in first
    assert "distance_km" in first
    assert "directions_url" in first
    # Verify speciality suggestion was made based on symptoms
    assert len(body["suggested_specialities"]) > 0
    assert any("Cardiology" in item["speciality"] for item in body["suggested_specialities"])


def test_reverse_geocode_endpoint() -> None:
    response = client.get("/api/places/reverse-geocode?lat=28.5672&lng=77.2100")
    assert response.status_code == 200
    body = response.json()
    assert "formatted_address" in body
    assert body["formatted_address"] is not None
    assert "provider" in body


def test_language_detection_and_supported_endpoint() -> None:
    # 1. Supported languages list
    sup = client.get("/api/language/supported")
    assert sup.status_code == 200
    langs = sup.json()
    assert len(langs) >= 5
    codes = [item["code"] for item in langs]
    assert "hinglish" in codes
    assert "hi" in codes
    assert "en" in codes

    # 2. Hindi text detection
    hi_res = client.post("/api/language/detect", json={"text": "मुझे पिछले दो दिनों से बहुत तेज़ सिरदर्द हो रहा है"})
    assert hi_res.status_code == 200
    assert hi_res.json()["detected_language"] == "hi"

    # 3. Hinglish code-mixed detection
    hing_res = client.post("/api/language/detect", json={"text": "Doctor mujhe kal shaam se gale me dard aur khasi ho rahi hai"})
    assert hing_res.status_code == 200
    assert hing_res.json()["detected_language"] == "hinglish"
    assert hing_res.json()["is_code_mixed"] is True


def test_intake_full_clinical_dimensions() -> None:
    # Turn 1: Concern -> asks duration
    t1 = client.post("/api/intake/turn", json={"message": "mild headache", "state": {"language": "en"}})
    s1 = t1.json()["state"]
    assert s1["awaiting"] == "duration"

    # Turn 2: Duration -> asks severity
    t2 = client.post("/api/intake/turn", json={"message": "since 2 days", "state": s1})
    s2 = t2.json()["state"]
    assert s2["awaiting"] == "severity"

    # Turn 3: Severity -> asks associated
    t3 = client.post("/api/intake/turn", json={"message": "moderate", "state": s2})
    s3 = t3.json()["state"]
    assert s3["awaiting"] == "associated"

    # Turn 4: Associated -> asks age
    t4 = client.post("/api/intake/turn", json={"message": "slight dizziness", "state": s3})
    s4 = t4.json()["state"]
    assert s4["awaiting"] == "age"

    # Turn 5: Age -> asks medical history
    t5 = client.post("/api/intake/turn", json={"message": "34 years", "state": s4})
    s5 = t5.json()["state"]
    assert s5["awaiting"] == "history"

    # Turn 6: History -> completes intake
    t6 = client.post("/api/intake/turn", json={"message": "no previous conditions or allergies", "state": s5})
    s6 = t6.json()["state"]
    assert s6["awaiting"] == "complete"

    # Build summary and check that age and history are reported
    sum_res = client.post("/api/summary/generate", json={"state": s6})
    sum_data = sum_res.json()
    field_labels = {f["label"]: f["value"] for f in sum_data["fields"]}
    assert "Patient age" in field_labels
    assert field_labels["Patient age"] == "34 years"
    assert "Relevant medical history" in field_labels

