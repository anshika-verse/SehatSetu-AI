import { useState } from "react";
import {
  Activity,
  Droplets,
  Heart,
  Plus,
  Sparkles,
  Thermometer,
  Wind,
} from "lucide-react";

export type VitalIndicator = {
  id: string;
  name: string;
  value: string | number | null;
  unit: string;
  recordedDate: string | null;
  status: "normal" | "high" | "low" | "none";
  statusLabel: string;
  category: string;
  idealRange: string;
};

export interface HealthOverviewProps {
  vitals: VitalIndicator[];
  onUpdateVital: (indicatorId: string, value: string, date: string) => void;
  onOpenReportUpload: () => void;
}

export function HealthOverviewCards({
  vitals,
  onUpdateVital,
  onOpenReportUpload,
}: HealthOverviewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVitalId, setSelectedVitalId] = useState<string>("bp");
  const [inputValue, setInputValue] = useState("");
  const [inputDate, setInputDate] = useState(() => new Date().toISOString().split("T")[0]);

  function handleSaveVital(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onUpdateVital(selectedVitalId, inputValue.trim(), inputDate);
    setInputValue("");
    setModalOpen(false);
  }

  const getIcon = (id: string) => {
    switch (id) {
      case "bp":
        return <Activity size={20} color="#087E75" />;
      case "glucose":
        return <Droplets size={20} color="#0284C7" />;
      case "heart_rate":
        return <Heart size={20} color="#E11D48" />;
      case "hemoglobin":
        return <Sparkles size={20} color="#D97706" />;
      case "spo2":
        return <Wind size={20} color="#0D9488" />;
      case "temp":
        return <Thermometer size={20} color="#F97316" />;
      default:
        return <Activity size={20} color="#087E75" />;
    }
  };

  const getIconBg = (id: string) => {
    switch (id) {
      case "bp":
        return "#EBF5F3";
      case "glucose":
        return "#E0F2FE";
      case "heart_rate":
        return "#FFE4E6";
      case "hemoglobin":
        return "#FEF3C7";
      case "spo2":
        return "#CCFBF1";
      case "temp":
        return "#FFEDD5";
      default:
        return "#EBF5F3";
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <Activity size={20} color="var(--primary)" />
            Health Overview & Vitals
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Values, units, and dates are recorded strictly from your reports or patient logs.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              padding: "6px 12px",
              fontSize: "0.82rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--primary)",
              color: "var(--primary)",
              background: "var(--primary-light)",
            }}
          >
            <Plus size={14} /> Log Vital
          </button>
        </div>
      </div>

      {/* Grid of Vital Indicators */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: 14,
        }}
      >
        {vitals.map((item) => {
          const hasRecord = item.value !== null && item.value !== "";
          const badgeClass =
            item.status === "normal"
              ? "status-badge normal"
              : item.status === "high"
              ? "status-badge high"
              : item.status === "low"
              ? "status-badge low"
              : "status-badge none";

          return (
            <div key={item.id} className="vital-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "10px",
                    background: getIconBg(item.id),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {getIcon(item.id)}
                </div>
                <span className={badgeClass}>{item.statusLabel}</span>
              </div>

              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
                {item.name}
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "6px 0 4px" }}>
                <span className="vital-value">{hasRecord ? item.value : "--"}</span>
                <span className="vital-unit">{item.unit}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--text-subtle)", marginTop: "auto" }}>
                <span>{hasRecord && item.recordedDate ? `Date: ${item.recordedDate}` : "Not recorded"}</span>
                <span title={`Reference range: ${item.idealRange}`}>{item.idealRange}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Entry Modal */}
      {modalOpen && (
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
              maxWidth: 440,
              padding: 24,
              boxShadow: "var(--shadow-hover)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>Record Health Indicator</h4>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ padding: "4px 8px", fontSize: "0.85rem", border: "none" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVital} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Indicator
                </label>
                <select
                  value={selectedVitalId}
                  onChange={(e) => setSelectedVitalId(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                >
                  {vitals.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Measurement Value
                </label>
                <input
                  type="text"
                  placeholder="e.g. 120/80 or 95 or 14.2"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Date of Measurement
                </label>
                <input
                  type="date"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  className="primary"
                  style={{ flex: 1, padding: "10px" }}
                >
                  Save Reading
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    onOpenReportUpload();
                  }}
                  style={{ flex: 1, padding: "10px" }}
                >
                  From Report ↗
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
