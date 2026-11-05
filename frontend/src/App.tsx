import { useEffect, useMemo, useRef, useState } from "react";
import {
  askKnowledge,
  detectLanguage,
  explainTerm,
  generateSummary,
  getHealth,
  getSchemes,
  intakeTurn,
  lookupMedicine,
  speak,
  transcribe,
} from "./api";
import { AssistantAvatar, VoiceWaveform, type AssistantGender } from "./AssistantAvatar";
import { AssistantSelectorModal } from "./AssistantSelectorModal";
import { HealthcareNearMe } from "./HealthcareNearMe";
import { WavRecorder } from "./recorder";
import {
  emptyState,
  type ChatMessage,
  type Citation,
  type IntakeState,
  type Language,
  type SummaryField,
} from "./types";

type Screen = "home" | "speak" | "nearby" | "summary" | "info" | "resources" | "settings";

const recorder = new WavRecorder();

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return (localStorage.getItem("sehatsetu_user_language") as Language) || "hinglish";
    } catch {
      return "hinglish";
    }
  });
  const [elderly, setElderly] = useState(false);
  const [speechMode, setSpeechMode] = useState<"live" | "demo" | "unknown">("unknown");

  // Personalized Assistant State
  const [assistantGender, setAssistantGender] = useState<AssistantGender>(() => {
    try {
      const saved = localStorage.getItem("sehatsetu_assistant_persona");
      if (saved === "male" || saved === "female") return saved;
    } catch {}
    return "female";
  });
  const [showPersonaModal, setShowPersonaModal] = useState<boolean>(() => {
    try {
      return !localStorage.getItem("sehatsetu_assistant_persona");
    } catch {
      return false;
    }
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<IntakeState>(emptyState("hinglish"));
  const [citations, setCitations] = useState<Citation[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMode, setAudioMode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSpoken, setLastSpoken] = useState("");

  const currentPlayerRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket for real-time conversation streaming
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/conversation`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "turn_response") {
            setState(data.state);
            if (data.citations) {
              setCitations((curr) => [...curr, ...data.citations]);
            }
            setMessages((curr) => [
              ...curr,
              { role: "assistant", text: data.assistant_message, citations: data.citations },
            ]);
            setDraft("");
            setBusy(false);
            if (data.audio_base64) {
              void play(data.assistant_message, data.audio_base64);
            }
          }
        } catch (e) {
          console.warn("WebSocket parse error:", e);
        }
      };

      ws.onerror = () => {
        // Silent fallback to REST
      };
    } catch (e) {
      console.warn("WebSocket initialization skipped:", e);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.elderly = elderly ? "true" : "false";
  }, [elderly]);

  useEffect(() => {
    getHealth()
      .then((health) => setSpeechMode(health.speech_mode))
      .catch(() => setSpeechMode("unknown"));
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const nav = useMemo(
    () =>
      [
        ["home", "🏥 Dashboard"],
        ["speak", "🎙️ AI Consultation"],
        ["nearby", "📍 Healthcare Near Me"],
        ["summary", "📋 Health Summary"],
        ["resources", "💊 Medicines & Schemes"],
        ["info", "🔍 Verified Q&A"],
        ["settings", "⚙️ Comfort & Reminders"],
      ] as const,
    [],
  );

  function changeLanguage(next: Language) {
    setLanguage(next);
    try {
      localStorage.setItem("sehatsetu_user_language", next);
    } catch {}
    if (next !== "auto") {
      setState((current) => ({ ...current, language: next }));
    }
  }

  function handleSelectPersona(gender: AssistantGender) {
    setAssistantGender(gender);
    try {
      localStorage.setItem("sehatsetu_assistant_persona", gender);
    } catch {}
  }

  function stopAudio() {
    if (currentPlayerRef.current) {
      currentPlayerRef.current.pause();
      currentPlayerRef.current.currentTime = 0;
      currentPlayerRef.current = null;
    }
    setIsSpeaking(false);
  }

  async function play(text: string, customAudioB64?: string) {
    stopAudio();
    setLastSpoken(text);
    setIsSpeaking(true);
    try {
      let audioBlob: Blob;
      let mode = "live";

      if (customAudioB64) {
        const byteCharacters = atob(customAudioB64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        audioBlob = new Blob([byteArray], { type: "audio/wav" });
      } else {
        const langToUse = language === "auto" ? state.language : language;
        const result = await speak(text.slice(0, 1500), langToUse, assistantGender);
        audioBlob = result.audio;
        mode = result.mode;
      }

      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setAudioMode(mode);

      const player = new Audio(url);
      currentPlayerRef.current = player;
      player.onended = () => {
        setIsSpeaking(false);
        currentPlayerRef.current = null;
      };
      player.onerror = () => {
        setIsSpeaking(false);
        currentPlayerRef.current = null;
      };
      await player.play().catch(() => {
        setIsSpeaking(false);
      });
    } catch (e) {
      setIsSpeaking(false);
      throw e;
    }
  }

  async function sendText(text: string) {
    const message = text.trim();
    if (!message) return;
    setBusy(true);
    setError(null);
    setMessages((current) => [...current, { role: "user", text: message }]);

    let langToUse = language;
    // Auto-detect language if enabled or on first message
    if (language === "auto") {
      try {
        const det = await detectLanguage(message);
        if (det.confidence >= 0.6) {
          langToUse = det.detected_language;
          setState((curr) => ({ ...curr, language: det.detected_language }));
        } else {
          langToUse = state.language || "hinglish";
        }
      } catch {
        langToUse = state.language || "hinglish";
      }
    }

    // Try WebSocket turn if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: "turn",
          message,
          state: { ...state, language: langToUse },
          gender: assistantGender,
        })
      );
      return;
    }

    // REST Fallback
    try {
      const turn = await intakeTurn(message, { ...state, language: langToUse });
      setState(turn.state);
      setCitations((current) => [...current, ...turn.citations]);
      setMessages((current) => [
        ...current,
        { role: "assistant", text: turn.assistant_message, citations: turn.citations },
      ]);
      setDraft("");
      try {
        await play(turn.assistant_message);
      } catch (ttsError) {
        setError(
          ttsError instanceof Error ? ttsError.message : "Voice playback failed. Text is still shown.",
        );
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording() {
    setError(null);
    if (!consent) {
      setError("Allow audio processing before recording. Audio is sent for transcription and is not stored.");
      return;
    }
    if (recording) {
      setRecording(false);
      const blob = await recorder.stop();
      setBusy(true);
      try {
        const langToUse = language === "auto" ? "hinglish" : language;
        const result = await transcribe(blob, langToUse);
        setSpeechMode(result.mode);
        setDraft(result.transcript);
        if (result.notice) setError(result.notice);
      } catch (recordError) {
        setError(recordError instanceof Error ? recordError.message : "Transcription failed.");
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      await recorder.start(setSeconds);
      setRecording(true);
      setSeconds(0);
    } catch {
      setError("Microphone permission is required, or this browser blocked recording. You can type instead.");
    }
  }

  function handleRetryRecording() {
    stopAudio();
    setDraft("");
    setError(null);
    void toggleRecording();
  }

  useEffect(() => {
    if (!recording) return;
    if (seconds < 28) return;
    void toggleRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording]);

  const assistantName = assistantGender === "male" ? "Dr. Aarav" : "Dr. Priya";

  return (
    <div className="app">
      {/* First-visit or on-demand Assistant Selector Modal */}
      {showPersonaModal && (
        <AssistantSelectorModal
          currentGender={assistantGender}
          onSelect={handleSelectPersona}
          onClose={() => setShowPersonaModal(false)}
          isFirstVisit={!localStorage.getItem("sehatsetu_assistant_persona")}
        />
      )}

      {/* Top Header Bar */}
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 22,
              boxShadow: "0 4px 12px rgba(13, 148, 136, 0.35)",
            }}
          >
            🩺
          </div>
          <div>
            <p className="eyebrow">Multilingual Healthcare Navigation</p>
            <h1 style={{ margin: 0, fontSize: "1.65rem", fontWeight: 800 }}>SehatSetu AI</h1>
            <p className="tagline">Your Voice. Your Language. Better Healthcare Access.</p>
          </div>
        </div>

        <div className="top-controls" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Active Assistant Pill & Switcher */}
          <div
            onClick={() => setShowPersonaModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px",
              background: "#f0fdfa",
              border: "1.5px solid #99f6e4",
              borderRadius: 20,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            title="Click to switch between Dr. Aarav and Dr. Priya"
          >
            <AssistantAvatar gender={assistantGender} size="sm" isSpeaking={isSpeaking} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f766e" }}>{assistantName}</div>
              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Switch Assistant ▾</div>
            </div>
          </div>

          <label style={{ margin: 0 }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b" }}>Language</span>
            <select
              value={language}
              onChange={(event) => changeLanguage(event.target.value as Language)}
              style={{ padding: "6px 10px", minHeight: 38 }}
            >
              <option value="auto">✨ Auto-Detect</option>
              <option value="hinglish">Hinglish (हिंग्लिश)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="en">English (India)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
            </select>
          </label>

          <span className={`badge ${speechMode === "live" ? "live" : "demo"}`}>
            {speechMode === "live" ? "⚡ Gnani Live" : speechMode === "demo" ? "DEMO Mode" : "Checking"}
          </span>
        </div>
      </header>

      {/* Emergency Red-Flag Banner */}
      {state.emergency && (
        <section className="emergency" role="alert">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>🚨</span>
            <strong style={{ fontSize: "1.1rem" }}>Urgent Medical Attention Needed</strong>
          </div>
          <p style={{ margin: 0 }}>
            A predefined warning sign was detected in what you reported. Call <strong>112</strong> or visit the nearest
            emergency hospital now. This app does not dispatch emergency services.
          </p>
        </section>
      )}

      {/* Main Layout Navigation & Content */}
      <div className="layout">
        <nav className="nav" aria-label="Main Sections">
          {nav.map(([id, label]) => (
            <button
              key={id}
              className={screen === id ? "active" : ""}
              onClick={() => setScreen(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        <main>
          {screen === "home" && (
            <Home
              onOpen={setScreen}
              speechMode={speechMode}
              assistantGender={assistantGender}
              onSwitchAssistant={() => setShowPersonaModal(true)}
            />
          )}

          {screen === "speak" && (
            <Speak
              assistantGender={assistantGender}
              isSpeaking={isSpeaking}
              consent={consent}
              setConsent={setConsent}
              recording={recording}
              seconds={seconds}
              busy={busy}
              draft={draft}
              setDraft={setDraft}
              messages={messages}
              state={state}
              language={language}
              error={error}
              audioUrl={audioUrl}
              audioMode={audioMode}
              onMic={() => void toggleRecording()}
              onSend={() => void sendText(draft)}
              onReplay={() => lastSpoken && void play(lastSpoken).catch((err: unknown) => setError(String(err)))}
              onInterrupt={stopAudio}
              onRetry={handleRetryRecording}
              onSwitchAssistant={() => setShowPersonaModal(true)}
            />
          )}

          {screen === "nearby" && (
            <HealthcareNearMe
              currentSymptoms={state.main_concern || ""}
              language={language}
              onBookDemo={() => {
                setScreen("resources");
              }}
            />
          )}

          {screen === "summary" && <Summary state={state} citations={citations} />}

          {screen === "info" && <Information language={language} />}

          {screen === "resources" && <Resources language={language} />}

          {screen === "settings" && (
            <Settings
              elderly={elderly}
              setElderly={setElderly}
              assistantGender={assistantGender}
              onSwitchAssistant={() => setShowPersonaModal(true)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * Dashboard UI (Follows Reference Image 2: Clean Healthcare White & Teal Theme)
 */
function Home({
  onOpen,
  speechMode,
  assistantGender,
  onSwitchAssistant,
}: {
  onOpen: (screen: Screen) => void;
  speechMode: string;
  assistantGender: AssistantGender;
  onSwitchAssistant: () => void;
}) {
  const assistantName = assistantGender === "male" ? "Dr. Aarav" : "Dr. Priya";

  return (
    <section className="dashboard-view">
      {/* Hero Card */}
      <div
        className="hero-card"
        style={{
          background: "linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)",
          borderRadius: 22,
          padding: "28px",
          marginBottom: 24,
          border: "1px solid #ccfbf1",
          boxShadow: "0 6px 20px -4px rgba(13, 148, 136, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div style={{ maxWidth: 600 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#0d9488",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            <span>✨</span> Intelligent Healthcare Navigation {speechMode === "live" ? "• Gnani Voice Live" : ""}
          </div>
          <h2 style={{ fontSize: "1.85rem", color: "#0f172a", marginBottom: 8, fontWeight: 800 }}>
            {assistantName} is ready to guide you.
          </h2>
          <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.5, marginBottom: 20 }}>
            Speak in Hindi or Hinglish to describe your symptoms, discover nearby hospitals, check medicine details,
            and prepare a doctor-ready consultation summary.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="primary"
              onClick={() => onOpen("speak")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: 14,
                fontSize: "0.95rem",
              }}
            >
              <span>🎙️</span> Start Voice Consultation
            </button>
            <button
              type="button"
              onClick={() => onOpen("nearby")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
                borderRadius: 14,
                fontSize: "0.95rem",
                border: "1.5px solid #0d9488",
                color: "#0f766e",
              }}
            >
              <span>📍</span> Healthcare Near Me
            </button>
          </div>
        </div>

        {/* 3D Character Showcase Card */}
        <div
          onClick={onSwitchAssistant}
          style={{
            background: "#ffffff",
            padding: "20px 24px",
            borderRadius: 20,
            border: "1.5px solid #99f6e4",
            boxShadow: "0 4px 16px rgba(13, 148, 136, 0.12)",
            textAlign: "center",
            cursor: "pointer",
          }}
          title="Click to switch assistant"
        >
          <AssistantAvatar gender={assistantGender} size="lg" />
          <div style={{ marginTop: 10, fontSize: "0.82rem", color: "#0d9488", fontWeight: 700 }}>
            Switch Assistant ▾
          </div>
        </div>
      </div>

      {/* 112 Emergency Card */}
      <div
        style={{
          background: "#fff1f2",
          border: "1.5px solid #fecdd3",
          borderRadius: 16,
          padding: "14px 20px",
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🚨</span>
          <div>
            <strong style={{ color: "#9f1239", fontSize: "0.95rem" }}>
              Medical Emergency? Call 112 immediately.
            </strong>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#be123c" }}>
              SehatSetu AI is for preparation and navigation only. It does not provide urgent clinical intervention.
            </p>
          </div>
        </div>
        <a
          href="tel:112"
          style={{
            background: "#e11d48",
            color: "#ffffff",
            padding: "8px 18px",
            borderRadius: 12,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "0.85rem",
          }}
        >
          Call 112 Now
        </a>
      </div>

      {/* 4 Interactive Healthcare Service Cards */}
      <h3 style={{ fontSize: "1.25rem", color: "#0f172a", marginBottom: 14 }}>Core Healthcare Services</h3>
      <div className="cards" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* Card 1 */}
        <button
          type="button"
          onClick={() => onOpen("speak")}
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 18,
            padding: "20px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#f0fdfa", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            🎙️
          </div>
          <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>AI Voice Intake & Consultation</strong>
          <span style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.4 }}>
            Talk naturally with {assistantName} in Hindi or Hinglish. Structured symptom collection with Gnani Prisma STT & Timbre TTS.
          </span>
          <span style={{ fontSize: "0.82rem", color: "#0d9488", fontWeight: 700, marginTop: "auto" }}>
            Begin Consultation →
          </span>
        </button>

        {/* Card 2 */}
        <button
          type="button"
          onClick={() => onOpen("nearby")}
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 18,
            padding: "20px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#f0fdfa", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            📍
          </div>
          <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>Healthcare Near Me</strong>
          <span style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.4 }}>
            GPS-based discovery of 24x7 hospitals, clinics, diagnostic labs, and medical stores with real driving directions.
          </span>
          <span style={{ fontSize: "0.82rem", color: "#0d9488", fontWeight: 700, marginTop: "auto" }}>
            Locate Nearby Care →
          </span>
        </button>

        {/* Card 3 */}
        <button
          type="button"
          onClick={() => onOpen("resources")}
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 18,
            padding: "20px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#f0fdfa", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            💊
          </div>
          <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>Verified Medicine Labels</strong>
          <span style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.4 }}>
            Search openFDA & NIH RxNorm regulatory drug labels for active ingredients, indications, and official warnings.
          </span>
          <span style={{ fontSize: "0.82rem", color: "#0d9488", fontWeight: 700, marginTop: "auto" }}>
            Lookup Medicine Details →
          </span>
        </button>

        {/* Card 4 */}
        <button
          type="button"
          onClick={() => onOpen("summary")}
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 18,
            padding: "20px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#f0fdfa", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            📋
          </div>
          <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>Patient-Reported Summary</strong>
          <span style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.4 }}>
            Generate an organized health summary of what you reported to share with your qualified clinician or doctor.
          </span>
          <span style={{ fontSize: "0.82rem", color: "#0d9488", fontWeight: 700, marginTop: "auto" }}>
            View Health Summary →
          </span>
        </button>
      </div>

      {/* Safety & Guardrail Badges Footer */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          padding: "16px 20px",
          background: "#f8fafc",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <div style={{ fontSize: "0.8rem", color: "#475569" }}>
            <strong>100% Non-Diagnostic</strong>
            <div>Clinician-reviewed safety rules</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div style={{ fontSize: "0.8rem", color: "#475569" }}>
            <strong>Privacy Preserved</strong>
            <div>No audio or health data stored in DB</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🌐</span>
          <div style={{ fontSize: "0.8rem", color: "#475569" }}>
            <strong>Official Data Sources</strong>
            <div>openFDA, WHO, RxNorm & Gov Schemes</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Premium Conversational View with Animated 3D Avatar, Voice Waveform & Chat
 */
function Speak(props: {
  assistantGender: AssistantGender;
  isSpeaking: boolean;
  consent: boolean;
  setConsent: (value: boolean) => void;
  recording: boolean;
  seconds: number;
  busy: boolean;
  draft: string;
  setDraft: (value: string) => void;
  messages: ChatMessage[];
  state: IntakeState;
  language: Language;
  error: string | null;
  audioUrl: string | null;
  audioMode: string | null;
  onMic: () => void;
  onSend: () => void;
  onReplay: () => void;
  onInterrupt: () => void;
  onRetry: () => void;
  onSwitchAssistant: () => void;
}) {
  const assistantName = props.assistantGender === "male" ? "Dr. Aarav" : "Dr. Priya";

  const intakeSteps = [
    { id: "concern", label: "1. Symptom" },
    { id: "duration", label: "2. Duration" },
    { id: "severity", label: "3. Severity" },
    { id: "associated", label: "4. Associated" },
    { id: "age", label: "5. Age" },
    { id: "history", label: "6. History" },
    { id: "complete", label: "7. Summary" },
  ];

  return (
    <section className="speak-view">
      {/* Assistant Persona & Voice Waveform Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)",
          borderRadius: 22,
          padding: "24px",
          marginBottom: 16,
          border: "1.5px solid #ccfbf1",
          boxShadow: "0 4px 16px rgba(13, 148, 136, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <AssistantAvatar
            gender={props.assistantGender}
            size="lg"
            isSpeaking={props.isSpeaking}
            isListening={props.recording}
          />
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ccfbf1", color: "#0f766e", padding: "2px 8px", borderRadius: 12, fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase" }}>
              <span>●</span> {props.isSpeaking ? "Speaking..." : props.recording ? "Listening..." : "Ready to assist"}
            </div>
            <h2 style={{ fontSize: "1.45rem", color: "#0f172a", margin: "6px 0 2px", fontWeight: 800 }}>
              Consultation with {assistantName}
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Speak or type in your language. Your responses help construct a doctor-ready summary.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={props.onSwitchAssistant}
                style={{
                  padding: "4px 12px",
                  fontSize: "0.78rem",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Switch to {props.assistantGender === "male" ? "Dr. Priya (Female)" : "Dr. Aarav (Male)"}
              </button>

              {props.isSpeaking && (
                <button
                  type="button"
                  onClick={props.onInterrupt}
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    padding: "4px 12px",
                    borderRadius: 10,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span>⏹️</span> Interrupt Speaking
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Voice Waveform Visualizer */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, marginBottom: 4 }}>
            Voice Waveform Activity
          </div>
          <VoiceWaveform active={props.isSpeaking || props.recording} color={props.recording ? "#ef4444" : "#0d9488"} bars={18} />
        </div>
      </div>

      {/* Clinical Intake Step Indicator */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {intakeSteps.map((step) => {
          const isCurrent = props.state.awaiting === step.id;
          const isDone =
            (step.id === "concern" && props.state.main_concern) ||
            (step.id === "duration" && props.state.duration) ||
            (step.id === "severity" && props.state.severity) ||
            (step.id === "associated" && props.state.associated_symptoms) ||
            (step.id === "age" && props.state.age) ||
            (step.id === "history" && props.state.relevant_history);

          return (
            <span
              key={step.id}
              style={{
                fontSize: "0.76rem",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 10,
                background: isCurrent ? "#0d9488" : isDone ? "#ecfdf5" : "#f1f5f9",
                color: isCurrent ? "#ffffff" : isDone ? "#059669" : "#64748b",
                border: isCurrent ? "1px solid #0d9488" : isDone ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
              }}
            >
              {isDone && !isCurrent ? "✓ " : ""}
              {step.label}
            </span>
          );
        })}
      </div>

      {/* Consent Checkbox */}
      <label className="check" style={{ marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={props.consent}
          onChange={(event) => props.setConsent(event.target.checked)}
        />
        I consent to send this recording to Gnani Prisma STT for transcription. Audio is processed transiently and never stored.
      </label>

      {/* Microphone Interaction Row */}
      <div
        className="mic-row"
        style={{
          background: "#ffffff",
          padding: "20px 24px",
          borderRadius: 20,
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          marginBottom: 18,
        }}
      >
        <button
          className={`mic ${props.recording ? "recording" : ""}`}
          type="button"
          onClick={props.onMic}
          aria-pressed={props.recording}
        >
          {props.recording ? `Stop (${props.seconds}s)` : "Tap to Speak"}
        </button>
        <div>
          <strong style={{ fontSize: "1.05rem", color: "#0f172a", display: "block", marginBottom: 4 }}>
            {props.recording ? "Recording your voice... (Auto-stops at 28s)" : "Press the microphone to speak, or type below"}
          </strong>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            Describe your concern in your own words (e.g. "Mujhe kal shaam se bukhar aur sirdard hai").
          </p>
        </div>
      </div>

      {/* Editable Transcript Input */}
      <label>
        Speech Transcript & Input (Editable before sending)
        <textarea
          value={props.draft}
          onChange={(event) => props.setDraft(event.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (props.draft.trim() && !props.busy) {
                props.onSend();
              }
            }
          }}
          rows={3}
          placeholder="Your speech transcript will appear here. You can edit any word or type directly..."
        />
      </label>

      <div className="actions" style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="primary"
          disabled={props.busy || !props.draft.trim()}
          onClick={props.onSend}
        >
          {props.busy ? "Processing..." : "Send Message →"}
        </button>
        {props.draft.trim() && (
          <button type="button" onClick={props.onRetry} disabled={props.busy}>
            🔄 Re-record Voice
          </button>
        )}
        <button type="button" onClick={props.onReplay} disabled={!props.audioUrl}>
          🔊 Replay Voice
        </button>
        {props.isSpeaking && (
          <button
            type="button"
            onClick={props.onInterrupt}
            style={{
              background: "#ef4444",
              color: "#ffffff",
              border: "none",
              padding: "10px 16px",
              borderRadius: 12,
              fontWeight: 700,
            }}
          >
            ⏹️ Stop Speaking
          </button>
        )}
      </div>

      {props.error && <p className="notice">{props.error}</p>}

      {props.audioUrl && (
        <div className="player" style={{ background: "#f8fafc", padding: "10px 16px", borderRadius: 14, marginBottom: 16 }}>
          <audio controls src={props.audioUrl} />
          <span style={{ fontSize: "0.8rem", color: "#0f766e", fontWeight: 600 }}>
            {props.audioMode === "demo" ? "DEMO tone" : `Spoken by ${assistantName} (Gnani Timbre)`}
          </span>
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="chat" aria-live="polite">
        {props.messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={message.role}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {message.role === "assistant" && (
                <AssistantAvatar gender={props.assistantGender} size="sm" />
              )}
              <strong style={{ color: message.role === "user" ? "#0f766e" : "#0f172a" }}>
                {message.role === "user" ? "You" : assistantName}
              </strong>
            </div>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{message.text}</p>
            {message.citations?.map((citation) => (
              <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 8, fontSize: "0.82rem" }}>
                📖 {citation.title} — {citation.publisher}
              </a>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * Health Summary Component
 */
function Summary({ state, citations }: { state: IntakeState; citations: Citation[] }) {
  const [fields, setFields] = useState<SummaryField[]>([]);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const summary = await generateSummary(state, citations);
      setFields(summary.fields);
      setText(summary.text);
      setTitle(summary.title);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Summary could not be created.");
    }
  }

  return (
    <section>
      <h2>Patient-Reported Consultation Summary</h2>
      <p className="lead">
        This document only organises what you reported. It does not contain an AI diagnosis or prescription. Share it
        with a licensed clinician.
      </p>
      <button type="button" className="primary" onClick={() => void load()}>
        Generate Consultation Summary
      </button>
      {error && <p className="notice">{error}</p>}
      {fields.length > 0 && (
        <article>
          <h3>{title}</h3>
          <dl>
            {fields.map((field) => (
              <div key={field.label}>
                <dt>{field.label}</dt>
                <dd>
                  {field.value} <small>({field.source.replace(/_/g, " ")})</small>
                </dd>
              </div>
            ))}
          </dl>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: "14px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            {text}
          </pre>
        </article>
      )}
    </section>
  );
}

/**
 * Verified Q&A Component
 */
function Information({ language }: { language: Language }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [found, setFound] = useState<boolean | null>(null);
  const [sources, setSources] = useState<Citation[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setError(null);
    try {
      const result = await askKnowledge(question, language);
      setAnswer(result.answer);
      setFound(result.found);
      setSources(result.citations);
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "The question could not be sent.");
    }
  }

  return (
    <section>
      <h2>Verified Healthcare Knowledge Q&A</h2>
      <p>Answers are retrieved directly from WHO and official public health guidelines with full citations.</p>
      <label>
        Question
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          placeholder="e.g. What is dengue? or What are tuberculosis symptoms?"
        />
      </label>
      <button
        type="button"
        className="primary"
        disabled={question.trim().length < 2}
        onClick={() => void ask()}
      >
        Find Verified Source
      </button>
      {error && <p className="notice">{error}</p>}
      {found !== null && (
        <article className="assistant">
          <h3>{found ? "From the Verified Source" : "No Matching Source"}</h3>
          <p>{answer}</p>
          {sources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 6 }}>
              🔗 {source.title} — {source.publisher}, checked {source.last_checked}
            </a>
          ))}
        </article>
      )}
    </section>
  );
}

/**
 * Resources Component: Schemes, Medicine Label Lookup & Report Explanation
 */
function Resources({ language }: { language: Language }) {
  const [schemes, setSchemes] = useState<Awaited<ReturnType<typeof getSchemes>> | null>(null);
  const [term, setTerm] = useState("");
  const [termAnswer, setTermAnswer] = useState("");
  const [drugQuery, setDrugQuery] = useState("");
  const [drugResult, setDrugResult] = useState<Awaited<ReturnType<typeof lookupMedicine>> | null>(null);
  const [drugBusy, setDrugBusy] = useState(false);
  const [drugError, setDrugError] = useState<string | null>(null);

  useEffect(() => {
    void getSchemes().then(setSchemes);
  }, []);

  async function handleDrugSearch() {
    if (!drugQuery.trim()) return;
    setDrugBusy(true);
    setDrugError(null);
    try {
      const res = await lookupMedicine(drugQuery.trim(), language);
      setDrugResult(res);
    } catch (e) {
      setDrugError(e instanceof Error ? e.message : "Medicine lookup failed.");
    } finally {
      setDrugBusy(false);
    }
  }

  return (
    <section>
      <h2>Medicines, Medical Terms, & Government Schemes</h2>

      {/* Medicine Label Lookup (openFDA / RxNorm) */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 18,
          padding: "22px",
          border: "1.5px solid #ccfbf1",
          boxShadow: "0 4px 16px rgba(13, 148, 136, 0.06)",
          marginBottom: 26,
        }}
      >
        <h3 style={{ fontSize: "1.2rem", color: "#0f172a", marginBottom: 6 }}>
          💊 Verified Medicine Information (openFDA / RxNorm)
        </h3>
        <p style={{ fontSize: "0.88rem", color: "#475569", marginBottom: 14 }}>
          Search official regulatory package labels for active substances, approved uses, and warnings.
        </p>
        <div style={{ display: "flex", gap: 10, maxWidth: 640 }}>
          <input
            value={drugQuery}
            onChange={(event) => setDrugQuery(event.target.value)}
            placeholder="e.g. Paracetamol, Metformin, Ibuprofen, Amoxicillin"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="primary"
            disabled={drugQuery.trim().length < 2 || drugBusy}
            onClick={() => void handleDrugSearch()}
          >
            {drugBusy ? "Searching..." : "Lookup Label"}
          </button>
        </div>
        {drugError && <p className="notice">{drugError}</p>}
        {drugResult && (
          <article className="assistant" style={{ marginTop: 16 }}>
            <h4>
              {drugResult.openfda.found
                ? `Label: ${drugResult.openfda.generic_name || drugResult.openfda.term}`
                : `Result for '${drugResult.query}'`}
            </h4>
            {drugResult.openfda.brand_names && drugResult.openfda.brand_names.length > 0 && (
              <p>
                <strong>Brand names:</strong> {drugResult.openfda.brand_names.join(", ")}
              </p>
            )}
            {drugResult.openfda.purpose && (
              <p>
                <strong>Purpose / Indications:</strong> {drugResult.openfda.purpose}
              </p>
            )}
            {drugResult.openfda.warnings_summary && (
              <p>
                <strong>Label Warnings:</strong> {drugResult.openfda.warnings_summary}
              </p>
            )}
            {drugResult.rxnorm.concepts && drugResult.rxnorm.concepts.length > 0 && (
              <p>
                <strong>Standardized Concepts (RxNorm):</strong>{" "}
                {drugResult.rxnorm.concepts.map((c) => c.name).join("; ")}
              </p>
            )}
            <p className="notice" style={{ fontSize: "0.82rem", margin: "10px 0 0" }}>
              {drugResult.disclaimer}
            </p>
          </article>
        )}
      </div>

      {/* Lab Report Terminology Explainer */}
      <div style={{ marginBottom: 28 }}>
        <h3>Lab Report Glossary</h3>
        <p style={{ fontSize: "0.88rem", color: "#475569" }}>
          Understand words printed on lab reports without diagnosing individual test numbers.
        </p>
        <div style={{ display: "flex", gap: 10, maxWidth: 540 }}>
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="e.g. HbA1c, Platelets, Bilirubin"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() =>
              void explainTerm(term, language)
                .then((result) => setTermAnswer(result.answer))
                .catch(() => setTermAnswer("That term could not be explained."))
            }
          >
            Explain Word
          </button>
        </div>
        {termAnswer && <p style={{ background: "#f8fafc", padding: "12px", borderRadius: 10, marginTop: 10 }}>{termAnswer}</p>}
      </div>

      {/* Government Health Schemes */}
      <div>
        <h3>Government Schemes (AB-PMJAY & ABHA)</h3>
        <p>{schemes?.notice}</p>
        {schemes?.schemes.map((scheme) => (
          <article key={scheme.url}>
            <h4>{scheme.title}</h4>
            <p>{scheme.summary}</p>
            <a href={scheme.url} target="_blank" rel="noreferrer">
              Official Portal: {scheme.publisher}, checked {scheme.last_checked} ↗
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * Settings & Comfort
 */
function Settings({
  elderly,
  setElderly,
  assistantGender,
  onSwitchAssistant,
}: {
  elderly: boolean;
  setElderly: (value: boolean) => void;
  assistantGender: AssistantGender;
  onSwitchAssistant: () => void;
}) {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(localStorage.getItem("sehatsetu.reminder") ?? "");
  const [allow, setAllow] = useState(false);

  function save() {
    if (!allow) return;
    const payload = JSON.stringify({ note, savedAt: new Date().toISOString() });
    localStorage.setItem("sehatsetu.reminder", payload);
    setSaved(payload);
  }

  function clear() {
    localStorage.removeItem("sehatsetu.reminder");
    setSaved("");
    setNote("");
  }

  const assistantName = assistantGender === "male" ? "Dr. Aarav (Male)" : "Dr. Priya (Female)";

  return (
    <section>
      <h2>Comfort & Assistant Preferences</h2>

      {/* Assistant Persona Switcher */}
      <div style={{ background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: 16, padding: "18px 22px", marginBottom: 24 }}>
        <h3 style={{ fontSize: "1.1rem", color: "#0f766e", marginBottom: 6 }}>Active AI Assistant</h3>
        <p style={{ fontSize: "0.88rem", color: "#475569", margin: "0 0 12px" }}>
          Currently talking with <strong>{assistantName}</strong>.
        </p>
        <button type="button" className="primary" onClick={onSwitchAssistant}>
          Change Assistant Persona
        </button>
      </div>

      <label className="check">
        <input type="checkbox" checked={elderly} onChange={(event) => setElderly(event.target.checked)} />
        Larger text and buttons (Accessibility Mode)
      </label>

      <p style={{ marginTop: 20 }}>Personal reminder note (stored locally only in this browser):</p>
      <label>
        Reminder note
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Example: Ask the doctor about headache frequency."
        />
      </label>
      <label className="check">
        <input type="checkbox" checked={allow} onChange={(event) => setAllow(event.target.checked)} />
        I consent to store this reminder on this device only.
      </label>
      <div className="actions">
        <button type="button" className="primary" disabled={!allow || !note.trim()} onClick={save}>
          Save Reminder
        </button>
        <button type="button" onClick={clear}>
          Delete Saved Note
        </button>
      </div>
      {saved && <p style={{ background: "#f8fafc", padding: "10px", borderRadius: 8, marginTop: 12 }}>Saved: {saved}</p>}
    </section>
  );
}
