import { useRef, useState } from "react";
import {
  UploadCloud,
  FileCheck,
  Download,
  Eye,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  analyzeReportFile,
  parseReportText,
  type LabParameterItem,
  type ReportAnalysisResult,
} from "./api";
import type { Language } from "./types";

export interface MedicalReportUploadProps {
  language: Language;
  onSyncVitals?: (params: LabParameterItem[], date: string) => void;
}

export function MedicalReportUpload({
  language,
  onSyncVitals,
}: MedicalReportUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<ReportAnalysisResult | null>(null);
  const [showManualText, setShowManualText] = useState(false);
  const [manualText, setManualText] = useState("");
  const [selectedReportView, setSelectedReportView] = useState<ReportAnalysisResult | null>(null);

  // Persistent report history from localStorage
  const [reportHistory, setReportHistory] = useState<ReportAnalysisResult[]>(() => {
    try {
      const raw = localStorage.getItem("sehatsetu_medical_reports");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function getReportKey(res: ReportAnalysisResult, index?: number): string {
    return res.upload_date || `report-${index ?? Date.now()}`;
  }

  function saveToHistory(res: ReportAnalysisResult) {
    const updated = [res, ...reportHistory.slice(0, 9)];
    setReportHistory(updated);
    try {
      localStorage.setItem("sehatsetu_medical_reports", JSON.stringify(updated));
    } catch {}
  }

  function deleteReportFromHistory(key: string) {
    const updated = reportHistory.filter((r) => getReportKey(r) !== key);
    setReportHistory(updated);
    try {
      localStorage.setItem("sehatsetu_medical_reports", JSON.stringify(updated));
    } catch {}
    if (selectedReportView && getReportKey(selectedReportView) === key) {
      setSelectedReportView(null);
    }
  }

  async function handleFile(file: File) {
    if (!consent) {
      setError("Please check the consent box to authorize confidential lab analysis.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const langToUse = language === "auto" ? "hinglish" : language;
      const res = await analyzeReportFile(file, langToUse, consent);
      setCurrentResult(res);
      saveToHistory(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report upload or analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleParseManualText() {
    if (!consent) {
      setError("Please check the consent box to authorize confidential lab analysis.");
      return;
    }
    if (!manualText.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const langToUse = language === "auto" ? "hinglish" : language;
      const res = await parseReportText(manualText.trim(), langToUse, consent);
      res.upload_date = new Date().toISOString();
      res.filename = "Pasted Lab Text Report";
      setCurrentResult(res);
      saveToHistory(res);
      setManualText("");
      setShowManualText(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Text parsing failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  }

  function downloadJson(res: ReportAnalysisResult) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SehatSetu_Report_${res.filename || "lab"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <UploadCloud size={20} color="var(--primary)" />
            Medical Report Upload & Lab Parameter Extraction
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Upload blood tests, pathology panels, and diagnostic reports in PDF, JPG, or PNG.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowManualText(!showManualText)}
          style={{ fontSize: "0.8rem", padding: "6px 12px" }}
        >
          {showManualText ? "Hide Text Input" : "Paste Lab Text"}
        </button>
      </div>

      {/* Consent Checkbox */}
      <div
        style={{
          background: "var(--primary-light)",
          border: "1px solid var(--primary-border)",
          borderRadius: "var(--radius-md)",
          padding: "10px 14px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <input
          type="checkbox"
          id="reportConsentCheck"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ cursor: "pointer", width: 16, height: 16, accentColor: "var(--primary)" }}
        />
        <label htmlFor="reportConsentCheck" style={{ fontSize: "0.82rem", color: "var(--text-main)", cursor: "pointer" }}>
          <strong>User Consent:</strong> I authorize SehatSetu AI to read this medical document to extract laboratory test names, values, and reference ranges. (Never shared; processed confidentially).
        </label>
      </div>

      {/* Drag & Drop Upload Zone */}
      {!showManualText ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? "var(--primary)" : "var(--primary-border)"}`,
            borderRadius: "var(--radius-xl)",
            background: dragActive ? "var(--primary-soft)" : "var(--bg-app)",
            padding: "36px 20px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            marginBottom: 16,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/jpg"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                void handleFile(e.target.files[0]);
              }
            }}
          />

          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--primary-light)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <UploadCloud size={28} />
          </div>

          <strong style={{ display: "block", fontSize: "0.95rem", color: "var(--text-main)", marginBottom: 4 }}>
            {loading ? "Analyzing report contents..." : "Click or drag your medical report here"}
          </strong>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Supports PDF, JPG, PNG (Max 15MB). Fasting Blood Glucose, CBC, Hemoglobin, Lipids, etc.
          </span>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
            Paste Raw Laboratory Report Text:
          </label>
          <textarea
            rows={5}
            placeholder="e.g. Hemoglobin 11.2 g/dL (Normal: 12.0 - 15.5) Fasting Blood Sugar 145 mg/dL (Normal: 70 - 99)..."
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              fontSize: "0.85rem",
              marginBottom: 10,
              fontFamily: "monospace",
            }}
          />
          <button
            type="button"
            className="primary"
            disabled={loading || !manualText.trim()}
            onClick={() => void handleParseManualText()}
          >
            {loading ? "Parsing Report..." : "Extract Parameters from Text →"}
          </button>
        </div>
      )}

      {error && (
        <div style={{ background: "var(--danger-light)", border: "1px solid var(--danger-border)", color: "var(--danger)", padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Extracted Parameter Results Table & Patient Summary */}
      {currentResult && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "var(--radius-lg)",
            border: "1.5px solid var(--primary-border)",
            padding: "20px",
            marginBottom: 20,
            boxShadow: "0 4px 12px rgba(8, 126, 117, 0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--success-light)", color: "var(--success)", padding: "3px 8px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>
                <FileCheck size={13} /> Extraction Completed
              </div>
              <h4 style={{ margin: "6px 0 2px", fontSize: "1.1rem", fontWeight: 800 }}>
                {currentResult.filename || "Uploaded Report"}
              </h4>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Processed: {currentResult.upload_date || "Today"} • {currentResult.parameters.length} parameters recognized
              </p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {onSyncVitals && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => onSyncVitals(currentResult.parameters, (currentResult.upload_date || new Date().toISOString()).split("T")[0])}
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                >
                  <Sparkles size={14} /> Sync to Health Overview
                </button>
              )}

              <button
                type="button"
                onClick={() => downloadJson(currentResult)}
                style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                title="Download JSON Report"
              >
                <Download size={14} /> Export JSON
              </button>
            </div>
          </div>

          {/* Simple Language Patient Summary */}
          {currentResult.summary && (
            <div
              style={{
                background: "var(--primary-light)",
                border: "1px solid var(--primary-border)",
                borderRadius: "var(--radius-md)",
                padding: "14px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Sparkles size={16} color="var(--primary)" />
                <strong style={{ fontSize: "0.88rem", color: "var(--primary-dark)" }}>
                  Plain-Language Summary for the Patient
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-main)", lineHeight: 1.5 }}>
                {currentResult.summary}
              </p>
            </div>
          )}

          {/* Parameters Table */}
          {currentResult.parameters.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-app)", textAlign: "left", borderBottom: "1.5px solid var(--border-color)" }}>
                    <th style={{ padding: "10px 12px", fontWeight: 700 }}>Test Name</th>
                    <th style={{ padding: "10px 12px", fontWeight: 700 }}>Value</th>
                    <th style={{ padding: "10px 12px", fontWeight: 700 }}>Stated Lab Range</th>
                    <th style={{ padding: "10px 12px", fontWeight: 700 }}>Status</th>
                    <th style={{ padding: "10px 12px", fontWeight: 700 }}>General Information</th>
                  </tr>
                </thead>
                <tbody>
                  {currentResult.parameters.map((param, pIdx) => {
                    const isAbnormal = param.is_out_of_range;
                    const badgeClass =
                      param.status === "normal"
                        ? "status-badge normal"
                        : param.status === "high"
                        ? "status-badge high"
                        : param.status === "low"
                        ? "status-badge low"
                        : "status-badge none";

                    return (
                      <tr
                        key={pIdx}
                        style={{
                          borderBottom: "1px solid var(--border-light)",
                          background: isAbnormal ? "var(--warning-light)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{param.name}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: isAbnormal ? "var(--danger)" : "var(--text-main)" }}>
                          {param.value} {param.unit}
                        </td>
                        <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>
                          {param.reference_range || "Not specified on report"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span className={badgeClass}>{param.status}</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                          {param.description || "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "14px", background: "var(--bg-app)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              No standardized blood test parameters (like Hemoglobin, Glucose, WBC) were automatically matched in the text. Please ensure the scan is clear or consult the clinician directly.
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ marginTop: 14, fontSize: "0.74rem", color: "var(--text-subtle)", fontStyle: "italic" }}>
            {currentResult.disclaimer}
          </div>
        </div>
      )}

      {/* Uploaded Reports History Section */}
      <div>
        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 12px", color: "var(--text-main)" }}>
          Report History ({reportHistory.length})
        </h4>

        {reportHistory.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", background: "var(--bg-app)", borderRadius: "var(--radius-lg)", color: "var(--text-muted)", fontSize: "0.82rem" }}>
            No previous reports stored on this device. Upload your first lab document above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reportHistory.map((rep, idx) => {
              const repKey = getReportKey(rep, idx);
              return (
                <div
                  key={repKey}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "var(--bg-app)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-light)",
                    fontSize: "0.82rem",
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--text-main)" }}>{rep.filename || "Lab Report"}</strong>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Uploaded {(rep.upload_date || "").split("T")[0] || "Today"} • {rep.parameters.length} test items
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentResult(rep);
                        setSelectedReportView(rep);
                      }}
                      style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                    >
                      <Eye size={12} /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadJson(rep)}
                      style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                    >
                      <Download size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReportFromHistory(repKey)}
                      style={{ padding: "4px 8px", fontSize: "0.74rem", color: "var(--danger)" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
