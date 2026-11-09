import { useEffect, useRef, useState } from "react";
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
  type LabParameterItem,
} from "./api";
import { AssistantAvatar, VoiceWaveform, type AssistantGender } from "./AssistantAvatar";
import { AssistantSelectorModal } from "./AssistantSelectorModal";
import { HealthcareNearMe } from "./HealthcareNearMe";
import { Sidebar, type NavScreen } from "./Sidebar";
import { TopBar } from "./TopBar";
import { HealthOverviewCards, type DynamicHealthParameter } from "./HealthOverviewCards";
import { MedicalReportUpload } from "./MedicalReportUpload";
import { MedicalHistorySection } from "./MedicalHistorySection";
import { UpcomingAppointmentsCard } from "./UpcomingAppointmentsCard";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { FindDoctorsView } from "./FindDoctorsView";
import { HelpView } from "./HelpView";
import { WavRecorder } from "./recorder";
import {
  emptyState,
  type ChatMessage,
  type Citation,
  type IntakeState,
  type Language,
  type SummaryField,
} from "./types";
import { AlertCircle, Calendar, ArrowRight, ShieldCheck } from "lucide-react";

export type Screen = NavScreen;

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

  // Personalized Assistant Persona State
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

  // Dynamic Health Parameters (strictly populated from uploaded lab reports and logged readings)
  const [vitals, setVitals] = useState<DynamicHealthParameter[]>(() => {
    try {
      const saved = localStorage.getItem("sehatsetu_dynamic_vitals");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Migration from legacy state if user had actual recorded readings
      const legacy = localStorage.getItem("sehatsetu_vitals");
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (Array.isArray(parsedLegacy)) {
          const validOnly = parsedLegacy.filter(
            (v: any) => v && v.value !== null && v.value !== "" && v.value !== "--" && v.value !== "--/--"
          );
          if (validOnly.length > 0) return validOnly;
        }
      }
    } catch {}
    return [];
  });

  // Conversation & Speech State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [consent, setConsent] = useState(true);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "assistant",
      text:
        assistantGender === "male"
          ? "Namaste! Main Dr. Aarav hoon. Aaj main aapki sehat ke baare mein kya madad kar sakta hoon? Aap bolkar ya likhkar bata sakte hain."
          : "Namaste! Main Dr. Priya hoon. Aaj main aapki sehat ke baare mein kya madad kar sakti hoon? Aap bolkar ya likhkar bata sakte hain.",
    },
  ]);
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

  function parseDateForComparison(dateStr: string | null | undefined): number {
    if (!dateStr || dateStr === "Not recorded" || dateStr === "Not Available" || dateStr === "Recent") return 0;
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) return parsed;
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d).getTime();
      } else if (parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d).getTime();
      }
    }
    return 0;
  }

  function handleUpdateVital(
    id: string,
    val: string,
    date: string,
    source: string = "Manual Log",
    meta?: { name?: string; unit?: string; category?: string; referenceRange?: string }
  ) {
    const newTs = parseDateForComparison(date);
    setVitals((current) => {
      let updated = [...current];
      const existingIdx = updated.findIndex((v) => v.id.toLowerCase() === id.toLowerCase());

      if (existingIdx >= 0) {
        const existing = updated[existingIdx];
        const currentTs = parseDateForComparison(existing.recordedDate);
        const isCurrentNewer =
          existing.value !== null &&
          existing.value !== "--" &&
          existing.value !== "--/--" &&
          currentTs > newTs &&
          newTs > 0;

        if (isCurrentNewer) {
          // preserve in history
          const prevHist = existing.history || [];
          updated[existingIdx] = {
            ...existing,
            history: [
              {
                value: val,
                unit: meta?.unit || existing.unit,
                recordedDate: date,
                source,
                status: "normal",
                statusLabel: "Within Range",
                referenceRange: meta?.referenceRange || existing.referenceRange,
              },
              ...prevHist,
            ],
          };
        } else {
          // update active card
          const prevHist = existing.history || [];
          const hasExisting = existing.value !== null && existing.value !== "--" && existing.value !== "--/--";
          const newHist = hasExisting
            ? [
                {
                  value: existing.value,
                  unit: existing.unit,
                  recordedDate: existing.recordedDate || "Previous",
                  source: existing.source || "Previous",
                  status: existing.status,
                  statusLabel: existing.statusLabel,
                  referenceRange: existing.referenceRange,
                },
                ...prevHist,
              ]
            : prevHist;

          updated[existingIdx] = {
            ...existing,
            value: val,
            unit: meta?.unit || existing.unit,
            recordedDate: date,
            source,
            status: "normal",
            statusLabel: "Within Range",
            referenceRange: meta?.referenceRange || existing.referenceRange,
            history: newHist,
          };
        }
      } else {
        // New parameter created via manual entry
        const newParam: DynamicHealthParameter = {
          id,
          name: meta?.name || id,
          category: meta?.category || "General",
          value: val,
          unit: meta?.unit || "",
          recordedDate: date,
          source,
          status: "normal",
          statusLabel: "Within Range",
          referenceRange: meta?.referenceRange || "",
          history: [],
        };
        updated.push(newParam);
      }

      try {
        localStorage.setItem("sehatsetu_dynamic_vitals", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  function handleSyncVitals(params: LabParameterItem[], date: string, source: string = "Lab Report") {
    if (!params || params.length === 0) return;
    const reportTs = parseDateForComparison(date);

    setVitals((current) => {
      // 1. Process BP: if both systolic and diastolic are in params, combine them
      let incomingList = [...params];
      const sysIndex = incomingList.findIndex(
        (p) => p.parameter_id === "blood_pressure_systolic" || p.name.toLowerCase().includes("systolic")
      );
      const diaIndex = incomingList.findIndex(
        (p) => p.parameter_id === "blood_pressure_diastolic" || p.name.toLowerCase().includes("diastolic")
      );

      if (sysIndex >= 0 && diaIndex >= 0) {
        const sys = incomingList[sysIndex];
        const dia = incomingList[diaIndex];
        const isHigh = sys.status === "high" || dia.status === "high";
        const isLow = sys.status === "low" || dia.status === "low";
        const combinedStatus: "normal" | "high" | "low" = isHigh ? "high" : isLow ? "low" : "normal";
        const statusLabel = isHigh ? "Above Range" : isLow ? "Below Range" : "Within Range";

        const combinedBpItem: LabParameterItem = {
          parameter_id: "blood_pressure",
          name: "Blood Pressure",
          value: `${sys.value}/${dia.value}` as any,
          unit: "mmHg",
          reference_low: 90,
          reference_high: 120,
          reference_range: `${sys.reference_range || "90-120"} / ${dia.reference_range || "60-80"} mmHg`,
          difference_from_range: isHigh ? "Elevated BP" : isLow ? "Low BP" : "Optimal",
          status: combinedStatus,
          status_label: statusLabel,
          is_out_of_range: isHigh || isLow,
          category: "Vital Signs",
          confidence: sys.confidence || dia.confidence || "high",
          description: "Combined systolic and diastolic arterial blood pressure.",
        };

        // Filter out systolic and diastolic, prepend combined
        incomingList = incomingList.filter((_, idx) => idx !== sysIndex && idx !== diaIndex);
        incomingList.unshift(combinedBpItem);
      }

      let updated = [...current];

      for (const item of incomingList) {
        const paramId = item.parameter_id === "blood_pressure" ? "bp" : item.parameter_id;
        const paramName = item.name;
        const validStatus: "normal" | "high" | "low" | "none" =
          item.status === "high" ? "high" : item.status === "low" ? "low" : item.status === "normal" ? "normal" : "none";
        const statusLabel =
          item.status === "high"
            ? "Above Range"
            : item.status === "low"
            ? "Below Range"
            : item.status === "normal"
            ? "Within Range"
            : "Not Available";

        // Match existing parameter by canonical ID or name
        const existingIdx = updated.findIndex((v) => {
          const vId = v.id.toLowerCase();
          const vName = v.name.toLowerCase();
          const pId = paramId.toLowerCase();
          const pName = paramName.toLowerCase();

          if (vId === pId || vName === pName) return true;
          if ((vId === "bp" || vId === "blood_pressure") && (pId === "bp" || pId === "blood_pressure")) return true;
          if (
            (vId === "fasting_blood_glucose" || vId === "glucose") &&
            (pId === "fasting_blood_glucose" || pId === "glucose")
          )
            return true;
          return false;
        });

        if (existingIdx >= 0) {
          const existing = updated[existingIdx];
          const currentTs = parseDateForComparison(existing.recordedDate);
          const isCurrentNewer =
            existing.value !== null &&
            existing.value !== "--" &&
            existing.value !== "--/--" &&
            currentTs > reportTs &&
            reportTs > 0;

          if (isCurrentNewer) {
            // Card has a newer reading: Keep card value as-is, push this older report reading into history
            const prevHist = existing.history || [];
            const isDup = prevHist.some((h) => h.recordedDate === date && String(h.value) === String(item.value));
            if (!isDup) {
              updated[existingIdx] = {
                ...existing,
                history: [
                  {
                    value: item.value,
                    unit: item.unit || existing.unit,
                    recordedDate: date,
                    source,
                    status: validStatus,
                    statusLabel,
                    referenceRange: item.reference_range ?? undefined,
                    differenceFromRange: item.difference_from_range ?? undefined,
                  },
                  ...prevHist,
                ],
              };
            }
          } else {
            // Incoming report is newer or same date: update card value, archive previous card value to history
            const prevHist = existing.history || [];
            const hasExistingVal =
              existing.value !== null &&
              existing.value !== "--" &&
              existing.value !== "--/--";

            const isSameAsCurrent =
              hasExistingVal &&
              existing.recordedDate === date &&
              String(existing.value) === String(item.value);

            const newHist =
              hasExistingVal && !isSameAsCurrent
                ? [
                    {
                      value: existing.value,
                      unit: existing.unit,
                      recordedDate: existing.recordedDate || "Previous",
                      source: existing.source || "Previous",
                      status: existing.status,
                      statusLabel: existing.statusLabel,
                      referenceRange: existing.referenceRange ?? undefined,
                      differenceFromRange: existing.differenceFromRange ?? undefined,
                    },
                    ...prevHist,
                  ]
                : prevHist;

            updated[existingIdx] = {
              ...existing,
              id: paramId,
              name: paramName || existing.name,
              category: item.category || existing.category || "Laboratory Test",
              value: item.value,
              unit: item.unit || existing.unit,
              recordedDate: date,
              source,
              status: validStatus,
              statusLabel,
              referenceRange: item.reference_range || existing.referenceRange || undefined,
              differenceFromRange: item.difference_from_range ?? undefined,
              confidence: item.confidence ?? undefined,
              history: newHist,
            };
          }
        } else {
          // Completely new parameter from report: add as a brand-new card!
          const newParam: DynamicHealthParameter = {
            id: paramId,
            name: paramName,
            category: item.category || "Laboratory Test",
            value: item.value,
            unit: item.unit,
            recordedDate: date,
            source,
            status: validStatus,
            statusLabel,
            referenceRange: item.reference_range ?? undefined,
            differenceFromRange: item.difference_from_range ?? undefined,
            confidence: item.confidence ?? undefined,
            history: [],
          };
          updated.push(newParam);
        }
      }

      try {
        localStorage.setItem("sehatsetu_dynamic_vitals", JSON.stringify(updated));
      } catch {}
      return updated;
    });
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
      setError("Please grant consent for audio processing. Audio is never stored.");
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
      setError("Microphone permission was denied or is unavailable. You can type instead.");
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

  function handleSearch(query: string) {
    const q = query.toLowerCase().trim();
    if (!q) return;
    if (q.includes("doctor") || q.includes("cardiolog") || q.includes("specialist") || q.includes("opd")) {
      setScreen("doctors");
    } else if (q.includes("near") || q.includes("hospital") || q.includes("clinic") || q.includes("pharmacy") || q.includes("lab")) {
      setScreen("nearby");
    } else if (q.includes("report") || q.includes("test") || q.includes("blood") || q.includes("pdf")) {
      setScreen("reports");
    } else if (q.includes("appointment") || q.includes("visit") || q.includes("schedule")) {
      setScreen("appointments");
    } else if (q.includes("medicine") || q.includes("drug") || q.includes("scheme") || q.includes("pmjay")) {
      setScreen("resources");
    } else if (q.includes("help") || q.includes("112") || q.includes("emergency") || q.includes("ambulance")) {
      setScreen("help");
    } else {
      setDraft(query);
      setScreen("home");
    }
  }

  return (
    <div className="app-shell">
      {/* First-visit or on-demand Assistant Selector Modal */}
      {showPersonaModal && (
        <AssistantSelectorModal
          currentGender={assistantGender}
          onSelect={handleSelectPersona}
          onClose={() => setShowPersonaModal(false)}
          isFirstVisit={!localStorage.getItem("sehatsetu_assistant_persona")}
        />
      )}

      {/* Left Sidebar Navigation */}
      <Sidebar
        currentScreen={screen}
        onNavigate={(screenId) => setScreen(screenId)}
        assistantGender={assistantGender}
        onSwitchAssistant={() => setShowPersonaModal(true)}
      />

      {/* Main App Content Wrapper */}
      <div className="main-wrapper">
        {/* Top Header Bar */}
        <TopBar
          language={language}
          onLanguageChange={changeLanguage}
          speechMode={speechMode}
          assistantGender={assistantGender}
          onSwitchAssistant={() => setShowPersonaModal(true)}
          onSearch={handleSearch}
          unreadCount={state.emergency ? 2 : 1}
        />

        {/* Screen Routing */}
        <div style={{ flex: 1, paddingBottom: "40px" }}>
          {/* SCREEN: HOME (PRIMARY DASHBOARD MATCHING REFERENCE SCREENSHOT) */}
          {screen === "home" && (
            <div className="dashboard-grid">
              {/* Centre Column: Overview, Reports, Medical History */}
              <div className="dashboard-center">
                {/* Emergency Flag Banner */}
                {state.emergency && (
                  <div
                    style={{
                      background: "#FEF2F2",
                      border: "1.5px solid #FCA5A5",
                      borderRadius: "16px",
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                      boxShadow: "0 4px 12px rgba(220, 38, 38, 0.1)",
                    }}
                    role="alert"
                  >
                    <AlertCircle size={26} color="#DC2626" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: "1.05rem", color: "#991B1B", display: "block", marginBottom: "4px" }}>
                        🚨 Urgent Medical Attention Warning
                      </strong>
                      <p style={{ margin: 0, fontSize: "0.88rem", color: "#B91C1C", lineHeight: 1.45 }}>
                        A predefined clinical warning sign was identified in what was reported. Please call <strong>112</strong> immediately or visit the nearest emergency trauma center.
                      </p>
                      <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                        <a
                          href="tel:112"
                          style={{
                            background: "#DC2626",
                            color: "#ffffff",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          Call 112 Now
                        </a>
                        <button
                          onClick={() => setScreen("nearby")}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #FCA5A5",
                            color: "#991B1B",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Find Nearest Emergency Room
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personalized Greeting Card */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #EBF5F3 0%, #FFFFFF 100%)",
                    borderRadius: "18px",
                    padding: "22px 26px",
                    border: "1.5px solid #B3E2DA",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                    boxShadow: "0 2px 8px rgba(8, 126, 117, 0.05)",
                  }}
                >
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#087E75", color: "#ffffff", padding: "3px 10px", borderRadius: "12px", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>
                      <span>✨</span> AI Health Companion
                    </div>
                    <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#111827" }}>
                      Welcome to your Health Command Center
                    </h2>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", color: "#4B5563" }}>
                      {assistantName} is here to assist with symptom tracking, verified doctor OPD discovery, and report understanding.
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => setScreen("speak")}
                      style={{
                        background: "#087E75",
                        color: "#ffffff",
                        padding: "10px 18px",
                        borderRadius: "12px",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>🎙️</span> Voice Consultation
                    </button>
                    <button
                      onClick={() => setScreen("nearby")}
                      style={{
                        background: "#ffffff",
                        border: "1.5px solid #087E75",
                        color: "#087E75",
                        padding: "10px 18px",
                        borderRadius: "12px",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>📍</span> Nearby Care
                    </button>
                  </div>
                </div>

                {/* 1. Health Overview Cards */}
                <HealthOverviewCards
                  vitals={vitals}
                  onUpdateVital={handleUpdateVital}
                  onOpenReportUpload={() => setScreen("reports")}
                />

                {/* 2. Medical Report Upload (Center Section) */}
                <MedicalReportUpload
                  language={language}
                  onSyncVitals={handleSyncVitals}
                />

                {/* 3. Medical History (Previous reports, conditions, allergies, consultations) */}
                <MedicalHistorySection
                  onOpenReportUpload={() => setScreen("reports")}
                  onNavigateAppointments={() => setScreen("appointments")}
                />
              </div>

              {/* Right Column: Upcoming Appointments + Dedicated AI Healthcare Assistant */}
              <div className="dashboard-right">
                {/* Right Top: Upcoming Appointments Card */}
                <UpcomingAppointmentsCard
                  onFindDoctors={() => setScreen("doctors")}
                  onNavigateToNearMe={() => setScreen("nearby")}
                />

                {/* Right Bottom: Dedicated AI Healthcare Assistant Panel */}
                <AIAssistantPanel
                  assistantGender={assistantGender}
                  isSpeaking={isSpeaking}
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
                  consent={consent}
                  setConsent={setConsent}
                  onMic={() => void toggleRecording()}
                  onSend={(txt) => void sendText(txt)}
                  onReplay={() => lastSpoken && void play(lastSpoken).catch((err: unknown) => setError(String(err)))}
                  onInterrupt={stopAudio}
                  onSwitchAssistant={() => setShowPersonaModal(true)}
                  onClearChat={() => {
                    setMessages([
                      {
                        role: "assistant",
                        text:
                          assistantGender === "male"
                            ? "Conversation history refreshed. Main Dr. Aarav hoon, batayiye aaj aapki kya seva kar sakta hoon?"
                            : "Conversation history refreshed. Main Dr. Priya hoon, batayiye aaj aapki kya seva kar sakti hoon?",
                      },
                    ]);
                    setState(emptyState(language === "auto" ? "hinglish" : language));
                  }}
                />
              </div>
            </div>
          )}

          {/* SCREEN: APPOINTMENTS */}
          {screen === "appointments" && (
            <div style={{ maxWidth: "1200px", margin: "24px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#111827", margin: 0 }}>
                    Your Appointments & OPD Visits
                  </h2>
                  <p style={{ margin: "4px 0 0 0", color: "#6B7280", fontSize: "0.92rem" }}>
                    Track verified hospital visits, OPD registrations, and telehealth consultations.
                  </p>
                </div>
                <button
                  onClick={() => setScreen("doctors")}
                  style={{
                    background: "#087E75",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Calendar size={18} />
                  Book with Verified Doctor
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: "24px" }}>
                <UpcomingAppointmentsCard
                  onFindDoctors={() => setScreen("doctors")}
                  onNavigateToNearMe={() => setScreen("nearby")}
                />

                {/* State Health & Central OPD Portals Card */}
                <div style={{ background: "#ffffff", borderRadius: "18px", padding: "24px", border: "1px solid #E5E7EB", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <ShieldCheck size={22} color="#087E75" />
                    <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#111827" }}>
                      Official Government Health Portals
                    </h3>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#6B7280", lineHeight: 1.45, marginBottom: "16px" }}>
                    Book direct OPD appointments at AIIMS, Central Govt Hospitals, and state medical colleges without middlemen.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <a
                      href="https://ors.gov.in"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "14px",
                        background: "#F9FAFB",
                        borderRadius: "12px",
                        border: "1px solid #E5E7EB",
                        textDecoration: "none",
                        color: "inherit",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#087E75", fontSize: "0.95rem" }}>ORS (Online Registration System)</strong>
                        <div style={{ fontSize: "0.8rem", color: "#6B7280", marginTop: "2px" }}>
                          AIIMS, Safdarjung, RML, and 300+ Government Hospitals nationwide.
                        </div>
                      </div>
                      <ArrowRight size={18} color="#087E75" />
                    </a>

                    <a
                      href="https://esanjeevani.mohfw.gov.in"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "14px",
                        background: "#F9FAFB",
                        borderRadius: "12px",
                        border: "1px solid #E5E7EB",
                        textDecoration: "none",
                        color: "inherit",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#087E75", fontSize: "0.95rem" }}>eSanjeevani Teleconsultation</strong>
                        <div style={{ fontSize: "0.8rem", color: "#6B7280", marginTop: "2px" }}>
                          Free doctor-to-patient National Telemedicine Service of India.
                        </div>
                      </div>
                      <ArrowRight size={18} color="#087E75" />
                    </a>

                    <a
                      href="https://abha.abdm.gov.in"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "14px",
                        background: "#F9FAFB",
                        borderRadius: "12px",
                        border: "1px solid #E5E7EB",
                        textDecoration: "none",
                        color: "inherit",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#087E75", fontSize: "0.95rem" }}>ABHA (Ayushman Bharat Health Account)</strong>
                        <div style={{ fontSize: "0.8rem", color: "#6B7280", marginTop: "2px" }}>
                          Link your 14-digit digital health ID for seamless doctor records.
                        </div>
                      </div>
                      <ArrowRight size={18} color="#087E75" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN: FIND DOCTORS */}
          {screen === "doctors" && (
            <div style={{ maxWidth: "1300px", margin: "24px auto", padding: "0 24px" }}>
              <FindDoctorsView
                onScheduleAppointment={() => {
                  setScreen("appointments");
                }}
                onNavigateToNearMe={() => setScreen("nearby")}
              />
            </div>
          )}

          {/* SCREEN: HEALTHCARE NEAR ME (LIVE GPS DISCOVERY) */}
          {screen === "nearby" && (
            <div style={{ maxWidth: "1300px", margin: "24px auto", padding: "0 24px" }}>
              <HealthcareNearMe
                currentSymptoms={state.main_concern || ""}
                language={language}
                onBookDemo={() => {
                  setScreen("appointments");
                }}
              />
            </div>
          )}

          {/* SCREEN: MEDICAL REPORTS */}
          {screen === "reports" && (
            <div style={{ maxWidth: "1200px", margin: "24px auto", padding: "0 24px" }}>
              <MedicalReportUpload
                language={language}
                onSyncVitals={handleSyncVitals}
              />
            </div>
          )}

          {/* SCREEN: AI ASSISTANT / CONSULTATION (FULL VIEW) */}
          {screen === "speak" && (
            <div style={{ maxWidth: "1100px", margin: "24px auto", padding: "0 24px" }}>
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
            </div>
          )}

          {/* SCREEN: HEALTH HISTORY */}
          {screen === "history" && (
            <div style={{ maxWidth: "1200px", margin: "24px auto", padding: "0 24px" }}>
              <MedicalHistorySection
                onOpenReportUpload={() => setScreen("reports")}
                onNavigateAppointments={() => setScreen("appointments")}
              />
            </div>
          )}

          {/* SCREEN: CONSULTATION SUMMARY */}
          {screen === "summary" && (
            <div style={{ maxWidth: "1000px", margin: "24px auto", padding: "0 24px" }}>
              <Summary state={state} citations={citations} />
            </div>
          )}

          {/* SCREEN: MEDICINES & SCHEMES (openFDA & PM-JAY) */}
          {screen === "resources" && (
            <div style={{ maxWidth: "1100px", margin: "24px auto", padding: "0 24px" }}>
              <Resources language={language} />
            </div>
          )}

          {/* SCREEN: VERIFIED Q&A */}
          {screen === "info" && (
            <div style={{ maxWidth: "1000px", margin: "24px auto", padding: "0 24px" }}>
              <Information language={language} />
            </div>
          )}

          {/* SCREEN: SETTINGS */}
          {screen === "settings" && (
            <div style={{ maxWidth: "1000px", margin: "24px auto", padding: "0 24px" }}>
              <Settings
                elderly={elderly}
                setElderly={setElderly}
                assistantGender={assistantGender}
                onSwitchAssistant={() => setShowPersonaModal(true)}
              />
            </div>
          )}

          {/* SCREEN: HELP & HELPLINES */}
          {screen === "help" && (
            <div style={{ maxWidth: "1200px", margin: "24px auto", padding: "0 24px" }}>
              <HelpView onNavigate={(navId) => setScreen(navId as Screen)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Full-height Conversational Intake View with Animated Avatar, Voice Waveform & Chat
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
