import { useState } from "react";
import { AssistantAvatar, type AssistantGender } from "./AssistantAvatar";

interface AssistantSelectorModalProps {
  currentGender: AssistantGender;
  onSelect: (gender: AssistantGender) => void;
  onClose?: () => void;
  isFirstVisit?: boolean;
}

export function AssistantSelectorModal({
  currentGender,
  onSelect,
  onClose,
  isFirstVisit = false,
}: AssistantSelectorModalProps) {
  const [selected, setSelected] = useState<AssistantGender>(currentGender);
  const [remember, setRemember] = useState(true);

  function handleConfirm() {
    if (remember) {
      try {
        localStorage.setItem("sehatsetu_assistant_persona", selected);
      } catch {}
    }
    onSelect(selected);
    if (onClose) onClose();
  }

  return (
    <div className="modal-backdrop" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15, 23, 42, 0.72)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 16,
    }}>
      <div className="assistant-modal-card" style={{
        background: "#ffffff",
        borderRadius: 24,
        padding: "32px 28px",
        maxWidth: 540,
        width: "100%",
        boxShadow: "0 20px 40px -10px rgba(13, 148, 136, 0.3)",
        border: "1px solid rgba(204, 251, 241, 0.8)",
        textAlign: "center",
        animation: "modalFadeIn 0.25s ease-out",
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", background: "#f0fdfa", borderRadius: 20, marginBottom: 12 }}>
          <span style={{ fontSize: 18 }}>🤝</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Personalize Your Care
          </span>
        </div>

        <h2 style={{ fontSize: "1.55rem", color: "#0f172a", marginBottom: 6, fontWeight: 800 }}>
          Which AI assistant would you prefer?
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: 26 }}>
          आप किस AI सहायक से बात करना पसंद करेंगे? You can switch anytime.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Option: Dr. Aarav (Male) */}
          <div
            onClick={() => setSelected("male")}
            style={{
              padding: "20px 14px",
              borderRadius: 18,
              border: selected === "male" ? "2.5px solid #0d9488" : "1.5px solid #e2e8f0",
              background: selected === "male" ? "#f0fdfa" : "#ffffff",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: selected === "male" ? "0 8px 20px -4px rgba(13, 148, 136, 0.25)" : "none",
              position: "relative",
            }}
          >
            {selected === "male" && (
              <span style={{ position: "absolute", top: 10, right: 10, background: "#0d9488", color: "#fff", borderRadius: "50%", width: 20, height: 20, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✓
              </span>
            )}
            <AssistantAvatar gender="male" size="lg" isSpeaking={selected === "male"} />
            <div style={{ marginTop: 8 }}>
              <span style={{ display: "inline-block", fontSize: "0.74rem", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                Male Voice (Deepak)
              </span>
              <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 6, lineHeight: 1.35 }}>
                Clear, composed healthcare guidance in Hindi & Hinglish.
              </p>
            </div>
          </div>

          {/* Option: Dr. Priya (Female) */}
          <div
            onClick={() => setSelected("female")}
            style={{
              padding: "20px 14px",
              borderRadius: 18,
              border: selected === "female" ? "2.5px solid #0d9488" : "1.5px solid #e2e8f0",
              background: selected === "female" ? "#f0fdfa" : "#ffffff",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: selected === "female" ? "0 8px 20px -4px rgba(13, 148, 136, 0.25)" : "none",
              position: "relative",
            }}
          >
            {selected === "female" && (
              <span style={{ position: "absolute", top: 10, right: 10, background: "#0d9488", color: "#fff", borderRadius: "50%", width: 20, height: 20, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✓
              </span>
            )}
            <AssistantAvatar gender="female" size="lg" isSpeaking={selected === "female"} />
            <div style={{ marginTop: 8 }}>
              <span style={{ display: "inline-block", fontSize: "0.74rem", background: "#ccfbf1", color: "#0f766e", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                Female Voice (Nalini)
              </span>
              <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 6, lineHeight: 1.35 }}>
                Empathetic, warm navigation in Hindi & Hinglish.
              </p>
            </div>
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: "0.88rem", color: "#475569", marginBottom: 22, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "#0d9488" }}
          />
          Remember this assistant for my future visits
        </label>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {!isFirstVisit && onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#475569",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="primary"
            onClick={handleConfirm}
            style={{
              padding: "12px 32px",
              borderRadius: 14,
              background: "#0d9488",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.95rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(13, 148, 136, 0.4)",
            }}
          >
            Continue with {selected === "male" ? "Dr. Aarav" : "Dr. Priya"} →
          </button>
        </div>
      </div>
    </div>
  );
}
