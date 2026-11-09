import { useRef } from "react";
import {
  Bot,
  Mic,
  MicOff,
  Send,
  Volume2,
  Square,
  Sparkles,
} from "lucide-react";
import { AssistantAvatar, VoiceWaveform, type AssistantGender } from "./AssistantAvatar";
import type { ChatMessage, IntakeState, Language } from "./types";

export interface AIAssistantPanelProps {
  assistantGender: AssistantGender;
  isSpeaking: boolean;
  recording: boolean;
  seconds: number;
  busy: boolean;
  draft: string;
  setDraft: (d: string) => void;
  messages: ChatMessage[];
  state?: IntakeState;
  language?: Language;
  error: string | null;
  audioUrl?: string | null;
  consent: boolean;
  setConsent: (c: boolean) => void;
  onMic: () => void;
  onSend: (text: string) => void;
  onReplay?: () => void;
  onInterrupt: () => void;
  onSwitchAssistant: () => void;
  onClearChat?: () => void;
}

export function AIAssistantPanel({
  assistantGender,
  isSpeaking,
  recording,
  seconds,
  busy,
  draft,
  setDraft,
  messages,
  error,
  audioUrl,
  consent,
  setConsent,
  onMic,
  onSend,
  onReplay,
  onInterrupt,
  onSwitchAssistant,
  onClearChat,
}: AIAssistantPanelProps) {
  const assistantName = assistantGender === "male" ? "Dr. Aarav" : "Dr. Priya";
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = [
    { label: "🩺 Triage symptoms", text: "Mujhe kal shaam se bukhar aur sirdard hai" },
    { label: "📄 Lab report query", text: "What does elevated hemoglobin or fasting glucose mean?" },
    { label: "💊 Check medicine", text: "Explain paracetamol indications and precautions" },
    { label: "🚑 Nearest hospital", text: "Find nearest emergency hospital in my area" },
  ];

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "720px" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #ebf5f3 0%, #ffffff 100%)",
          borderRadius: "var(--radius-lg)",
          padding: "16px",
          border: "1px solid var(--primary-border)",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AssistantAvatar
              gender={assistantGender}
              size="md"
              isSpeaking={isSpeaking}
              isListening={recording}
            />
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--primary-soft)", color: "var(--primary)", padding: "2px 8px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>
                <span>●</span> {isSpeaking ? "Speaking..." : recording ? "Listening..." : busy ? "Thinking..." : "Ready"}
              </div>
              <h4 style={{ margin: "2px 0 0", fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)" }}>
                {assistantName}
              </h4>
              <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--text-muted)" }}>
                Gnani Prisma STT & Timbre TTS
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <button
              type="button"
              onClick={onSwitchAssistant}
              style={{ padding: "3px 8px", fontSize: "0.72rem", color: "var(--primary)" }}
              title="Switch persona"
            >
              Switch ▾
            </button>
            {isSpeaking && (
              <button
                type="button"
                onClick={onInterrupt}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.72rem",
                  background: "var(--danger)",
                  borderColor: "var(--danger)",
                  color: "#ffffff",
                }}
              >
                <Square size={10} /> Stop
              </button>
            )}
            {onClearChat && (
              <button
                type="button"
                onClick={onClearChat}
                style={{ padding: "2px 6px", fontSize: "0.68rem", color: "var(--text-muted)", border: "none", background: "transparent" }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Reactive Waveform */}
        <div style={{ marginTop: 10 }}>
          <VoiceWaveform active={isSpeaking || recording} color={recording ? "#e11d48" : "#087e75"} bars={16} />
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 10 }}>
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSend(qp.text)}
            style={{
              padding: "4px 8px",
              fontSize: "0.72rem",
              whiteSpace: "nowrap",
              background: "var(--bg-app)",
              borderColor: "var(--border-color)",
              color: "var(--text-main)",
              borderRadius: "10px",
            }}
          >
            <Sparkles size={11} color="#087E75" />
            {qp.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Stream */}
      <div className="chat-container" style={{ flex: 1, minHeight: 180, overflowY: "auto", marginBottom: 12 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <Bot size={32} color="var(--primary)" style={{ opacity: 0.6, marginBottom: 8 }} />
            <div>
              Namaste! I am <strong>{assistantName}</strong>.
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.78rem" }}>
              Speak or type your symptoms, lab report questions, or medicine concerns in Hindi, Hinglish, or English.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.role}`}>
              <div style={{ fontSize: "0.72rem", opacity: 0.8, marginBottom: 2, fontWeight: 700 }}>
                {m.role === "assistant" ? assistantName : "You"}
              </div>
              <div>{m.text}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Consent Checkbox */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: "0.72rem", color: "var(--text-muted)" }}>
        <input
          type="checkbox"
          id="sttConsent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ cursor: "pointer" }}
        />
        <label htmlFor="sttConsent" style={{ cursor: "pointer" }}>
          Consent for Gnani voice processing (transiently processed, never stored)
        </label>
      </div>

      {/* Input Area */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <button
          type="button"
          onClick={onMic}
          className={recording ? "recording" : ""}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            padding: 0,
            background: recording ? "#fee2e2" : "var(--primary-light)",
            borderColor: recording ? "var(--danger)" : "var(--primary-border)",
            color: recording ? "var(--danger)" : "var(--primary)",
            flexShrink: 0,
          }}
          title={recording ? `Recording (${seconds}s)... Click to stop` : "Tap to Speak (Gnani STT)"}
        >
          {recording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <textarea
          rows={2}
          placeholder="Speak or type health query..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (draft.trim() && !busy) {
                onSend(draft.trim());
              }
            }
          }}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            fontSize: "0.86rem",
            resize: "none",
            outline: "none",
          }}
        />

        <button
          type="button"
          className="primary"
          disabled={busy || !draft.trim()}
          onClick={() => onSend(draft.trim())}
          style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", padding: 0, flexShrink: 0 }}
          title="Send query"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Audio Player and Replay */}
      {audioUrl && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-light)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          <span>Spoken by {assistantName}</span>
          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              style={{ padding: "3px 8px", fontSize: "0.72rem", border: "none", color: "var(--primary)", background: "transparent", cursor: "pointer" }}
            >
              <Volume2 size={13} /> Replay
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{ background: "var(--danger-light)", color: "var(--danger)", padding: "6px 10px", borderRadius: 8, fontSize: "0.75rem", marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}
