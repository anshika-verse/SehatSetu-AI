import { useState } from "react";
import {
  Activity,
  Droplets,
  Heart,
  Plus,
  Sparkles,
  Thermometer,
  Wind,
  ShieldCheck,
  History,
  X,
  Clock,
  Zap,
  Sun,
  FileText,
  Filter,
} from "lucide-react";

export type VitalHistoryItem = {
  value: string | number;
  unit: string;
  recordedDate: string;
  source: string;
  status: "normal" | "high" | "low" | "none";
  statusLabel: string;
  referenceRange?: string | null;
  differenceFromRange?: string | null;
};

export type DynamicHealthParameter = {
  id: string;
  name: string;
  category: string;
  value: string | number;
  unit: string;
  recordedDate: string;
  source?: string;
  status: "normal" | "high" | "low" | "none";
  statusLabel: string;
  referenceRange?: string | null;
  differenceFromRange?: string | null;
  confidence?: string | number | null;
  history?: VitalHistoryItem[];
};

// Backward compatibility alias
export type VitalIndicator = DynamicHealthParameter;

export interface HealthOverviewProps {
  vitals: DynamicHealthParameter[];
  onUpdateVital: (
    indicatorId: string,
    value: string,
    date: string,
    source?: string,
    meta?: { name?: string; unit?: string; category?: string; referenceRange?: string }
  ) => void;
  onOpenReportUpload: () => void;
}

interface CommonTestDef {
  id: string;
  name: string;
  category: string;
  unit: string;
  referenceRange: string;
  placeholder: string;
}

const COMMON_TESTS: CommonTestDef[] = [
  {
    id: "bp",
    name: "Blood Pressure",
    category: "Vital Signs",
    unit: "mmHg",
    referenceRange: "90/60 - 120/80 mmHg",
    placeholder: "e.g. 120/80",
  },
  {
    id: "fasting_blood_glucose",
    name: "Blood Glucose (Fasting)",
    category: "Diabetes & Metabolism",
    unit: "mg/dL",
    referenceRange: "70 - 99 mg/dL",
    placeholder: "e.g. 92",
  },
  {
    id: "postprandial_blood_glucose",
    name: "Blood Glucose (Postprandial / PP)",
    category: "Diabetes & Metabolism",
    unit: "mg/dL",
    referenceRange: "70 - 140 mg/dL",
    placeholder: "e.g. 125",
  },
  {
    id: "hba1c",
    name: "HbA1c (Glycated Hemoglobin)",
    category: "Diabetes & Metabolism",
    unit: "%",
    referenceRange: "4.0 - 5.6 %",
    placeholder: "e.g. 5.4",
  },
  {
    id: "hemoglobin",
    name: "Hemoglobin (Hb)",
    category: "Complete Blood Count",
    unit: "g/dL",
    referenceRange: "12.0 - 17.5 g/dL",
    placeholder: "e.g. 14.2",
  },
  {
    id: "wbc",
    name: "Total Leukocyte Count (WBC)",
    category: "Complete Blood Count",
    unit: "cells/mcL",
    referenceRange: "4000 - 11000 cells/mcL",
    placeholder: "e.g. 6800",
  },
  {
    id: "platelets",
    name: "Platelet Count",
    category: "Complete Blood Count",
    unit: "lakh/mcL",
    referenceRange: "1.5 - 4.5 lakh/mcL",
    placeholder: "e.g. 2.4",
  },
  {
    id: "creatinine",
    name: "Serum Creatinine",
    category: "Kidney Function (KFT)",
    unit: "mg/dL",
    referenceRange: "0.6 - 1.2 mg/dL",
    placeholder: "e.g. 0.9",
  },
  {
    id: "bun",
    name: "Blood Urea Nitrogen (BUN)",
    category: "Kidney Function (KFT)",
    unit: "mg/dL",
    referenceRange: "7 - 20 mg/dL",
    placeholder: "e.g. 14",
  },
  {
    id: "total_cholesterol",
    name: "Total Cholesterol",
    category: "Lipid Profile",
    unit: "mg/dL",
    referenceRange: "125 - 200 mg/dL",
    placeholder: "e.g. 175",
  },
  {
    id: "hdl_cholesterol",
    name: "HDL Cholesterol (Good)",
    category: "Lipid Profile",
    unit: "mg/dL",
    referenceRange: "> 40 mg/dL",
    placeholder: "e.g. 52",
  },
  {
    id: "ldl_cholesterol",
    name: "LDL Cholesterol (Bad)",
    category: "Lipid Profile",
    unit: "mg/dL",
    referenceRange: "< 100 mg/dL",
    placeholder: "e.g. 94",
  },
  {
    id: "triglycerides",
    name: "Triglycerides",
    category: "Lipid Profile",
    unit: "mg/dL",
    referenceRange: "< 150 mg/dL",
    placeholder: "e.g. 130",
  },
  {
    id: "sgpt_alt",
    name: "SGPT / ALT",
    category: "Liver Function (LFT)",
    unit: "U/L",
    referenceRange: "7 - 56 U/L",
    placeholder: "e.g. 28",
  },
  {
    id: "sgot_ast",
    name: "SGOT / AST",
    category: "Liver Function (LFT)",
    unit: "U/L",
    referenceRange: "10 - 40 U/L",
    placeholder: "e.g. 24",
  },
  {
    id: "bilirubin_total",
    name: "Total Bilirubin",
    category: "Liver Function (LFT)",
    unit: "mg/dL",
    referenceRange: "0.2 - 1.2 mg/dL",
    placeholder: "e.g. 0.8",
  },
  {
    id: "tsh",
    name: "TSH (Thyroid Stimulating Hormone)",
    category: "Thyroid Profile",
    unit: "mIU/L",
    referenceRange: "0.4 - 4.0 mIU/L",
    placeholder: "e.g. 2.1",
  },
  {
    id: "heart_rate",
    name: "Heart Rate / Pulse",
    category: "Vital Signs",
    unit: "bpm",
    referenceRange: "60 - 100 bpm",
    placeholder: "e.g. 72",
  },
  {
    id: "spo2",
    name: "SpO2 (Pulse Oximetry)",
    category: "Vital Signs",
    unit: "%",
    referenceRange: "95 - 100 %",
    placeholder: "e.g. 98",
  },
  {
    id: "temp",
    name: "Body Temperature",
    category: "Vital Signs",
    unit: "°F",
    referenceRange: "97.8 - 99.1 °F",
    placeholder: "e.g. 98.6",
  },
];

export function HealthOverviewCards({
  vitals,
  onUpdateVital,
  onOpenReportUpload,
}: HealthOverviewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [historyModalVital, setHistoryModalVital] = useState<DynamicHealthParameter | null>(null);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>("all");

  // Form states for manual logging
  const [selectedPresetId, setSelectedPresetId] = useState<string>("bp");
  const [customTestName, setCustomTestName] = useState("");
  const [customCategory, setCustomCategory] = useState("General");
  const [customUnit, setCustomUnit] = useState("");
  const [customRefRange, setCustomRefRange] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [inputDate, setInputDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Handle preset selection changes
  const activePreset = COMMON_TESTS.find((t) => t.id === selectedPresetId);

  function handleSaveVital(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (selectedPresetId === "custom") {
      if (!customTestName.trim()) return;
      const cleanId = customTestName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      onUpdateVital(cleanId, inputValue.trim(), inputDate, "Manual Log", {
        name: customTestName.trim(),
        unit: customUnit.trim(),
        category: customCategory.trim() || "Laboratory Test",
        referenceRange: customRefRange.trim(),
      });
    } else if (activePreset) {
      onUpdateVital(activePreset.id, inputValue.trim(), inputDate, "Manual Log", {
        name: activePreset.name,
        unit: activePreset.unit,
        category: activePreset.category,
        referenceRange: activePreset.referenceRange,
      });
    }

    setInputValue("");
    setCustomTestName("");
    setModalOpen(false);
  }

  const getIcon = (category: string = "", id: string = "") => {
    const cat = category.toLowerCase();
    const cleanId = id.toLowerCase();

    if (cat.includes("blood count") || cat.includes("hematology") || cleanId.includes("hemoglobin")) {
      return <Sparkles size={20} color="#D97706" />;
    }
    if (cat.includes("lipid") || cleanId.includes("cholesterol") || cleanId.includes("triglyceride")) {
      return <Activity size={20} color="#9333EA" />;
    }
    if (cat.includes("diabetes") || cat.includes("metabolism") || cleanId.includes("glucose") || cleanId.includes("hba1c")) {
      return <Droplets size={20} color="#0284C7" />;
    }
    if (cat.includes("kidney") || cat.includes("renal") || cleanId.includes("creatinine") || cleanId.includes("urea") || cleanId.includes("bun")) {
      return <Clock size={20} color="#059669" />;
    }
    if (cat.includes("liver") || cat.includes("hepatic") || cleanId.includes("sgpt") || cleanId.includes("sgot") || cleanId.includes("bilirubin")) {
      return <ShieldCheck size={20} color="#EA580C" />;
    }
    if (cat.includes("thyroid") || cleanId.includes("tsh")) {
      return <Zap size={20} color="#0D9488" />;
    }
    if (cat.includes("electrolyte") || cleanId.includes("sodium") || cleanId.includes("potassium")) {
      return <Activity size={20} color="#2563EB" />;
    }
    if (cat.includes("vitamin") || cleanId.includes("vitamin")) {
      return <Sun size={20} color="#CA8A04" />;
    }
    if (cat.includes("vital") || cleanId === "bp" || cleanId.includes("heart")) {
      return <Heart size={20} color="#E11D48" />;
    }
    if (cleanId.includes("spo2") || cleanId.includes("oxygen")) {
      return <Wind size={20} color="#0D9488" />;
    }
    if (cleanId.includes("temp")) {
      return <Thermometer size={20} color="#F97316" />;
    }
    return <Activity size={20} color="#087E75" />;
  };

  const getIconBg = (category: string = "", id: string = "") => {
    const cat = category.toLowerCase();
    const cleanId = id.toLowerCase();

    if (cat.includes("blood count") || cat.includes("hematology")) return "#FEF3C7";
    if (cat.includes("lipid")) return "#F3E8FF";
    if (cat.includes("diabetes") || cat.includes("metabolism")) return "#E0F2FE";
    if (cat.includes("kidney") || cat.includes("renal")) return "#ECFDF5";
    if (cat.includes("liver") || cat.includes("hepatic")) return "#FFEDD5";
    if (cat.includes("thyroid")) return "#CCFBF1";
    if (cat.includes("electrolyte")) return "#DBEAFE";
    if (cat.includes("vitamin")) return "#FEF9C3";
    if (cat.includes("vital") || cleanId === "bp") return "#FFE4E6";
    return "#EBF5F3";
  };

  // Distinct categories present in user's recorded parameters
  const categoriesPresent = Array.from(
    new Set(vitals.map((v) => v.category || "Laboratory Tests"))
  );

  // Filtered vitals based on category selector
  const displayedVitals =
    selectedFilterCategory === "all"
      ? vitals
      : vitals.filter((v) => (v.category || "Laboratory Tests") === selectedFilterCategory);

  // Group vitals by category when "all" is selected
  const categoryGroups =
    selectedFilterCategory === "all"
      ? categoriesPresent.map((cat) => ({
          category: cat,
          items: vitals.filter((v) => (v.category || "Laboratory Tests") === cat),
        }))
      : [
          {
            category: selectedFilterCategory,
            items: displayedVitals,
          },
        ];

  return (
    <div className="card">
      {/* Top Header */}
      <div className="card-header" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 className="card-title">
            <Activity size={20} color="var(--primary)" />
            Health Overview & Clinical Parameters
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Dynamically populated from your verified laboratory reports and logged readings. No static mock cards.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontWeight: 600,
            }}
          >
            <Plus size={14} /> Log Reading
          </button>
          <button
            type="button"
            onClick={onOpenReportUpload}
            style={{
              padding: "6px 12px",
              fontSize: "0.82rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              background: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontWeight: 600,
            }}
          >
            <FileText size={14} /> Upload Report ↗
          </button>
        </div>
      </div>

      {/* Category Filter Pills (when parameters exist) */}
      {vitals.length > 0 && categoriesPresent.length > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto",
            padding: "4px 0 14px",
            borderBottom: "1px solid var(--border-light)",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            <Filter size={12} /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setSelectedFilterCategory("all")}
            style={{
              padding: "4px 12px",
              fontSize: "0.76rem",
              borderRadius: 20,
              border: selectedFilterCategory === "all" ? "1px solid var(--primary)" : "1px solid var(--border-color)",
              background: selectedFilterCategory === "all" ? "var(--primary)" : "var(--bg-app)",
              color: selectedFilterCategory === "all" ? "#ffffff" : "var(--text-muted)",
              fontWeight: selectedFilterCategory === "all" ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            All Parameters ({vitals.length})
          </button>
          {categoriesPresent.map((cat) => {
            const count = vitals.filter((v) => (v.category || "Laboratory Tests") === cat).length;
            const isSelected = selectedFilterCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedFilterCategory(cat)}
                style={{
                  padding: "4px 12px",
                  fontSize: "0.76rem",
                  borderRadius: 20,
                  border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                  background: isSelected ? "var(--primary)" : "var(--bg-app)",
                  color: isSelected ? "#ffffff" : "var(--text-muted)",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State when no parameters have been recorded */}
      {vitals.length === 0 ? (
        <div
          style={{
            padding: "36px 20px",
            textAlign: "center",
            background: "#ffffff",
            borderRadius: "var(--radius-xl)",
            border: "1px dashed var(--border-color)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              background: "var(--primary-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)",
            }}
          >
            <Activity size={28} />
          </div>

          <div style={{ maxWidth: 520 }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "1.12rem", fontWeight: 800, color: "var(--text-main)" }}>
              No Medical Reports or Readings Recorded Yet
            </h4>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Your Health Overview is dynamically generated from actual test parameters in uploaded lab reports (CBC, Lipid Profile, LFT, KFT, Diabetes, Thyroid) or manual entries. No empty or fabricated placeholders are shown.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              className="primary"
              onClick={onOpenReportUpload}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              <FileText size={16} /> Upload Medical Report
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                fontWeight: 600,
                fontSize: "0.85rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                background: "#ffffff",
                color: "var(--text-main)",
              }}
            >
              <Plus size={16} /> Log Manual Reading
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 6,
              fontSize: "0.75rem",
              color: "var(--text-subtle)",
            }}
          >
            <span style={{ background: "var(--bg-app)", padding: "4px 10px", borderRadius: 20 }}>
              ✓ Complete Blood Count (CBC)
            </span>
            <span style={{ background: "var(--bg-app)", padding: "4px 10px", borderRadius: 20 }}>
              ✓ Lipid Profile
            </span>
            <span style={{ background: "var(--bg-app)", padding: "4px 10px", borderRadius: 20 }}>
              ✓ Liver Function (LFT)
            </span>
            <span style={{ background: "var(--bg-app)", padding: "4px 10px", borderRadius: 20 }}>
              ✓ Kidney Function (KFT)
            </span>
            <span style={{ background: "var(--bg-app)", padding: "4px 10px", borderRadius: 20 }}>
              ✓ Diabetes & HbA1c
            </span>
            <span style={{ background: "var(--bg-app)", padding: "4px 10px", borderRadius: 20 }}>
              ✓ Vital Signs
            </span>
          </div>
        </div>
      ) : (
        /* Dynamic Grouped Parameters Grid */
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {categoryGroups.map((group) => {
            if (group.items.length === 0) return null;

            return (
              <div key={group.category} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Category Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "8px",
                        background: getIconBg(group.category),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {getIcon(group.category)}
                    </div>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)" }}>
                      {group.category}
                    </h4>
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      background: "var(--bg-app)",
                      color: "var(--text-muted)",
                      padding: "2px 8px",
                      borderRadius: 12,
                      border: "1px solid var(--border-light)",
                    }}
                  >
                    {group.items.length} parameter{group.items.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Cards Grid for this category */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(235px, 1fr))",
                    gap: 14,
                  }}
                >
                  {group.items.map((item) => {
                    const badgeClass =
                      item.status === "normal"
                        ? "status-badge normal"
                        : item.status === "high"
                        ? "status-badge high"
                        : item.status === "low"
                        ? "status-badge low"
                        : "status-badge none";

                    const historyCount = item.history ? item.history.length : 0;

                    return (
                      <div
                        key={item.id}
                        className="vital-card"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          minHeight: "170px",
                          padding: "16px",
                          background: "#ffffff",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-lg)",
                        }}
                      >
                        {/* Header: Icon, Status Badge, and History Button */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "10px",
                              background: getIconBg(item.category, item.id),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {getIcon(item.category, item.id)}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                            <span className={badgeClass}>{item.statusLabel}</span>
                            {historyCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setHistoryModalVital(item)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  padding: 0,
                                  fontSize: "0.68rem",
                                  color: "var(--primary)",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 2,
                                  fontWeight: 600,
                                }}
                                title="View previous records and trend"
                              >
                                <History size={11} /> {historyCount} past reading{historyCount > 1 ? "s" : ""}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Parameter Name */}
                        <div
                          style={{
                            fontSize: "0.84rem",
                            color: "var(--text-main)",
                            fontWeight: 700,
                            lineHeight: 1.3,
                          }}
                        >
                          {item.name}
                        </div>

                        {/* Value & Unit */}
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "4px 0 2px" }}>
                          <span
                            className="vital-value"
                            style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)" }}
                          >
                            {item.value}
                          </span>
                          <span className="vital-unit" style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
                            {item.unit}
                          </span>
                        </div>

                        {/* Reference Range */}
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "2px 0 6px" }}>
                          {item.referenceRange ? (
                            <span>
                              <strong style={{ color: "var(--primary-dark)" }}>Lab Range:</strong> {item.referenceRange}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-subtle)" }}>Reference range not stated</span>
                          )}
                          {item.differenceFromRange && item.status !== "normal" && (
                            <div
                              style={{
                                marginTop: 2,
                                color: item.status === "high" ? "#dc2626" : "#b45309",
                                fontWeight: 600,
                                fontSize: "0.7rem",
                              }}
                            >
                              {item.differenceFromRange}
                            </div>
                          )}
                        </div>

                        {/* Source & Date Footer */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.7rem",
                            color: "var(--text-subtle)",
                            marginTop: "auto",
                            paddingTop: 6,
                            borderTop: "1px solid var(--border-light)",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Clock size={11} /> {item.recordedDate || "Recent"}
                          </span>
                          {item.source && (
                            <span
                              style={{
                                maxWidth: "120px",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                              }}
                              title={item.source}
                            >
                              {item.source}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              maxWidth: 480,
              padding: 24,
              boxShadow: "var(--shadow-hover)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>Record Health Parameter</h4>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Select a test from any clinical panel or enter a custom laboratory parameter.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ padding: "4px 8px", fontSize: "0.85rem", border: "none", background: "transparent", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVital} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Laboratory Test / Indicator
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                >
                  <optgroup label="Standard Clinical Panels">
                    {COMMON_TESTS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} [{t.category}] ({t.unit})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Custom Test">
                    <option value="custom">+ Custom Laboratory Parameter...</option>
                  </optgroup>
                </select>
              </div>

              {selectedPresetId === "custom" && (
                <>
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                      Parameter Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Uric Acid or Vitamin D (25-OH)"
                      value={customTestName}
                      onChange={(e) => setCustomTestName(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                        Category
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kidney Function (KFT)"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                        Unit
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. mg/dL or ng/mL"
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                      Reference Range (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3.5 - 7.2 mg/dL"
                      value={customRefRange}
                      onChange={(e) => setCustomRefRange(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                    />
                  </div>
                </>
              )}

              {selectedPresetId !== "custom" && activePreset && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "var(--bg-app)",
                    border: "1px solid var(--border-light)",
                    fontSize: "0.78rem",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Category: <strong>{activePreset.category}</strong></span>
                  <span>Normal: <strong>{activePreset.referenceRange}</strong></span>
                </div>
              )}

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Measurement Value ({selectedPresetId !== "custom" && activePreset ? activePreset.unit : customUnit || "unit"})
                </label>
                <input
                  type="text"
                  placeholder={selectedPresetId !== "custom" && activePreset ? activePreset.placeholder : "e.g. 14.5"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Date of Reading / Lab Report
                </label>
                <input
                  type="date"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="submit"
                  className="primary"
                  style={{ flex: 1, padding: "10px", fontWeight: 700 }}
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
                  Upload Full Report ↗
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historical Readings Modal */}
      {historyModalVital && (
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
              maxWidth: 500,
              padding: 24,
              boxShadow: "var(--shadow-hover)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)" }}>
                  {historyModalVital.category}
                </div>
                <h4 style={{ margin: "2px 0 0", fontSize: "1.1rem", fontWeight: 800 }}>
                  {historyModalVital.name} — Historical Records
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalVital(null)}
                style={{ padding: "4px 8px", fontSize: "0.85rem", border: "none", background: "transparent", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Active Reading Banner */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "var(--primary-light)",
                border: "1px solid rgba(8, 126, 117, 0.2)",
                marginBottom: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--primary-dark)", textTransform: "uppercase" }}>
                  Current Active Reading
                </span>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)", marginTop: 2 }}>
                  {historyModalVital.value} {historyModalVital.unit}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {historyModalVital.source || "Recent Report"} • {historyModalVital.recordedDate}
                </div>
              </div>
              <span className={`status-badge ${historyModalVital.status}`}>
                {historyModalVital.statusLabel}
              </span>
            </div>

            {/* Past Timeline */}
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>
              Earlier Readings ({historyModalVital.history?.length || 0})
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "280px", overflowY: "auto" }}>
              {historyModalVital.history && historyModalVital.history.length > 0 ? (
                historyModalVital.history.map((hist, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "var(--bg-app)",
                      border: "1px solid var(--border-light)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                        {hist.value} {hist.unit}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                        {hist.source || "Past Record"} {hist.referenceRange ? `• Range: ${hist.referenceRange}` : ""}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className={`status-badge ${hist.status}`} style={{ fontSize: "0.68rem" }}>
                        {hist.statusLabel}
                      </span>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)", marginTop: 3 }}>
                        {hist.recordedDate}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  No earlier readings recorded for this test.
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setHistoryModalVital(null)}
                style={{ padding: "6px 16px", fontSize: "0.82rem" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
