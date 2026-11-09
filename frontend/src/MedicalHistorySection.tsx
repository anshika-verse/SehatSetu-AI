import { useState } from "react";
import {
  Clock,
  FileText,
  HeartCrack,
  Pill,
  CalendarCheck,
} from "lucide-react";

export type HealthHistoryState = {
  conditions: string[];
  allergies: string[];
  medications: string[];
  consultations: Array<{ date: string; provider: string; reason: string }>;
};

export interface MedicalHistorySectionProps {
  reportCount?: number;
  onOpenReportUpload: () => void;
  onNavigateAppointments?: () => void;
}

export function MedicalHistorySection({
  reportCount = 0,
  onOpenReportUpload,
  onNavigateAppointments,
}: MedicalHistorySectionProps) {
  const [history, setHistory] = useState<HealthHistoryState>(() => {
    try {
      const raw = localStorage.getItem("sehatsetu_medical_history");
      return raw
        ? JSON.parse(raw)
        : {
            conditions: [],
            allergies: [],
            medications: [],
            consultations: [],
          };
    } catch {
      return {
        conditions: [],
        allergies: [],
        medications: [],
        consultations: [],
      };
    }
  });

  const [modalType, setModalType] = useState<"condition" | "allergy" | "medication" | "consultation" | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [consultationDoc, setConsultationDoc] = useState("");
  const [consultationReason, setConsultationReason] = useState("");
  const [consultationDate, setConsultationDate] = useState(() => new Date().toISOString().split("T")[0]);

  function persistHistory(updated: HealthHistoryState) {
    setHistory(updated);
    try {
      localStorage.setItem("sehatsetu_medical_history", JSON.stringify(updated));
    } catch {}
  }

  function handleAddCondition() {
    if (!inputVal.trim()) return;
    persistHistory({ ...history, conditions: [...history.conditions, inputVal.trim()] });
    setInputVal("");
    setModalType(null);
  }

  function handleAddAllergy() {
    if (!inputVal.trim()) return;
    persistHistory({ ...history, allergies: [...history.allergies, inputVal.trim()] });
    setInputVal("");
    setModalType(null);
  }

  function handleAddMedication() {
    if (!inputVal.trim()) return;
    persistHistory({ ...history, medications: [...history.medications, inputVal.trim()] });
    setInputVal("");
    setModalType(null);
  }

  function handleAddConsultation() {
    if (!consultationDoc.trim()) return;
    persistHistory({
      ...history,
      consultations: [
        ...history.consultations,
        {
          date: consultationDate,
          provider: consultationDoc.trim(),
          reason: consultationReason.trim() || "Follow-up",
        },
      ],
    });
    setConsultationDoc("");
    setConsultationReason("");
    setModalType(null);
  }

  function removeCondition(index: number) {
    persistHistory({
      ...history,
      conditions: history.conditions.filter((_, i) => i !== index),
    });
  }

  function removeAllergy(index: number) {
    persistHistory({
      ...history,
      allergies: history.allergies.filter((_, i) => i !== index),
    });
  }

  function removeMedication(index: number) {
    persistHistory({
      ...history,
      medications: history.medications.filter((_, i) => i !== index),
    });
  }

  function removeConsultation(index: number) {
    persistHistory({
      ...history,
      consultations: history.consultations.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <Clock size={20} color="var(--primary)" />
            Patient Medical History
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Information is strictly provided by you or retrieved from your uploaded records.
          </p>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {/* Card 1: Previous Reports */}
        <div className="history-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  background: "var(--primary-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary)",
                }}
              >
                <FileText size={16} />
              </div>
              <strong style={{ fontSize: "0.92rem", color: "var(--text-main)" }}>
                Previous Reports
              </strong>
            </div>
            <button
              type="button"
              onClick={onOpenReportUpload}
              style={{ fontSize: "0.72rem", padding: "3px 8px" }}
            >
              Upload ↗
            </button>
          </div>

          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", minHeight: 60 }}>
            {reportCount > 0 ? (
              <div>
                <strong>{reportCount} reports</strong> stored on this device.
                <div style={{ marginTop: 4, fontSize: "0.75rem", color: "var(--primary)" }}>
                  All extracted parameters saved.
                </div>
              </div>
            ) : (
              <span className="not-added-text">Not added yet</span>
            )}
          </div>
        </div>

        {/* Card 2: Reported Health Conditions */}
        <div className="history-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  background: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#dc2626",
                }}
              >
                <HeartCrack size={16} />
              </div>
              <strong style={{ fontSize: "0.92rem", color: "var(--text-main)" }}>
                Reported Conditions
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setModalType("condition")}
              style={{ fontSize: "0.72rem", padding: "3px 8px" }}
            >
              + Add
            </button>
          </div>

          <div style={{ minHeight: 60 }}>
            {history.conditions.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {history.conditions.map((cond, i) => (
                  <span
                    key={i}
                    style={{
                      background: "var(--bg-app)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "2px 8px",
                      fontSize: "0.76rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {cond}
                    <button
                      type="button"
                      onClick={() => removeCondition(i)}
                      style={{ border: "none", padding: 0, fontSize: "0.7rem", color: "var(--danger)", cursor: "pointer", background: "transparent" }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="not-added-text">Not added yet</span>
            )}
          </div>
        </div>

        {/* Card 3: Allergies & Medications */}
        <div className="history-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  background: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#d97706",
                }}
              >
                <Pill size={16} />
              </div>
              <strong style={{ fontSize: "0.92rem", color: "var(--text-main)" }}>
                Allergies & Meds
              </strong>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => setModalType("allergy")}
                style={{ fontSize: "0.72rem", padding: "3px 6px" }}
                title="Add Allergy"
              >
                + Allergy
              </button>
              <button
                type="button"
                onClick={() => setModalType("medication")}
                style={{ fontSize: "0.72rem", padding: "3px 6px" }}
                title="Add Medication"
              >
                + Med
              </button>
            </div>
          </div>

          <div style={{ minHeight: 60, display: "flex", flexDirection: "column", gap: 6 }}>
            {history.allergies.length === 0 && history.medications.length === 0 ? (
              <span className="not-added-text">Not added yet</span>
            ) : (
              <>
                {history.allergies.length > 0 && (
                  <div style={{ fontSize: "0.76rem" }}>
                    <span style={{ color: "var(--danger)", fontWeight: 700 }}>Allergies: </span>
                    {history.allergies.map((a, i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 2, marginRight: 6 }}>
                        {a}
                        <button
                          type="button"
                          onClick={() => removeAllergy(i)}
                          style={{ border: "none", padding: 0, color: "var(--danger)", cursor: "pointer", background: "transparent" }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {history.medications.length > 0 && (
                  <div style={{ fontSize: "0.76rem" }}>
                    <span style={{ color: "var(--primary)", fontWeight: 700 }}>Meds: </span>
                    {history.medications.map((m, i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 2, marginRight: 6 }}>
                        {m}
                        <button
                          type="button"
                          onClick={() => removeMedication(i)}
                          style={{ border: "none", padding: 0, color: "var(--danger)", cursor: "pointer", background: "transparent" }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Card 4: Past Consultations */}
        <div className="history-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  background: "#e0f2fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0284c7",
                }}
              >
                <CalendarCheck size={16} />
              </div>
              <strong style={{ fontSize: "0.92rem", color: "var(--text-main)" }}>
                Past Consultations
              </strong>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => setModalType("consultation")}
                style={{ fontSize: "0.72rem", padding: "3px 8px" }}
              >
                + Log
              </button>
              {onNavigateAppointments && (
                <button
                  type="button"
                  onClick={onNavigateAppointments}
                  style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                >
                  View ↗
                </button>
              )}
            </div>
          </div>

          <div style={{ minHeight: 60 }}>
            {history.consultations.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {history.consultations.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "0.74rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid var(--border-light)",
                      paddingBottom: 4,
                    }}
                  >
                    <div>
                      <strong>{c.provider}</strong> • {c.reason}
                      <div style={{ color: "var(--text-subtle)", fontSize: "0.68rem" }}>{c.date}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeConsultation(i)}
                      style={{ border: "none", padding: 0, color: "var(--danger)", cursor: "pointer", background: "transparent" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="not-added-text">Not added yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Modal for adding items */}
      {modalType && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: 420,
              padding: 24,
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
                {modalType === "condition" && "Add Reported Condition"}
                {modalType === "allergy" && "Add Allergy"}
                {modalType === "medication" && "Add Medication"}
                {modalType === "consultation" && "Log Past Consultation"}
              </h4>
              <button
                type="button"
                onClick={() => setModalType(null)}
                style={{ padding: "4px 8px", fontSize: "0.85rem", border: "none" }}
              >
                ✕
              </button>
            </div>

            {modalType === "consultation" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  type="text"
                  placeholder="Doctor or Hospital name (e.g. Dr. Sharma / AIIMS OPD)"
                  value={consultationDoc}
                  onChange={(e) => setConsultationDoc(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
                <input
                  type="text"
                  placeholder="Reason / Summary (e.g. Routine checkup, fever, BP)"
                  value={consultationReason}
                  onChange={(e) => setConsultationReason(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
                <input
                  type="date"
                  value={consultationDate}
                  onChange={(e) => setConsultationDate(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
                <button
                  type="button"
                  className="primary"
                  onClick={handleAddConsultation}
                  disabled={!consultationDoc.trim()}
                  style={{ padding: "10px" }}
                >
                  Save Consultation
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  type="text"
                  placeholder={
                    modalType === "condition"
                      ? "e.g. Hypertension, Type 2 Diabetes"
                      : modalType === "allergy"
                      ? "e.g. Penicillin, Dust, Peanuts"
                      : "e.g. Metformin 500mg, Amlodipine 5mg"
                  }
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
                <button
                  type="button"
                  className="primary"
                  onClick={
                    modalType === "condition"
                      ? handleAddCondition
                      : modalType === "allergy"
                      ? handleAddAllergy
                      : handleAddMedication
                  }
                  disabled={!inputVal.trim()}
                  style={{ padding: "10px" }}
                >
                  Save Record
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
