import { useRef, useState } from "react";
import {
  UploadCloud,
  FileCheck,
  Download,
  Eye,
  Sparkles,
  AlertCircle,
  Edit2,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  analyzeReportFile,
  parseReportText,
  recalculateReport,
  type LabParameterItem,
  type ReportAnalysisResult,
} from "./api";
import type { Language } from "./types";

export interface MedicalReportUploadProps {
  language: Language;
  onSyncVitals?: (params: LabParameterItem[], date: string, source?: string) => void;
}

export function MedicalReportUpload({
  language,
  onSyncVitals,
}: MedicalReportUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<ReportAnalysisResult | null>(null);
  const [showManualText, setShowManualText] = useState(false);
  const [manualText, setManualText] = useState("");
  const [editingParam, setEditingParam] = useState<LabParameterItem | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editUnit, setEditUnit] = useState<string>("");
  const [editLow, setEditLow] = useState<string>("");
  const [editHigh, setEditHigh] = useState<string>("");

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
    const updated = [res, ...reportHistory.filter((r) => getReportKey(r) !== getReportKey(res)).slice(0, 9)];
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
    if (currentResult && getReportKey(currentResult) === key) {
      setCurrentResult(null);
    }
  }

  async function handleFile(file: File) {
    if (!consent) {
      setError("Please check the patient consent box to authorize confidential lab analysis.");
      return;
    }
    setError(null);
    setSyncSuccessMsg(null);
    setLoading(true);
    setProgressStep(1);

    // Progress step simulation for responsive UX
    const t1 = setTimeout(() => setProgressStep(2), 500);
    const t2 = setTimeout(() => setProgressStep(3), 1200);

    try {
      const langToUse = language === "auto" ? "hinglish" : language;
      const res = await analyzeReportFile(file, langToUse, consent);
      setProgressStep(4);
      setCurrentResult(res);
      saveToHistory(res);

      // Automatically refresh dashboard with successfully extracted report parameters
      if (onSyncVitals && res.parameters && res.parameters.length > 0) {
        const effectiveDate = res.report_date || (res.upload_date || new Date().toISOString()).split("T")[0];
        const sourceLabel = `Report: ${res.filename || file.name || "Lab Document"}`;
        onSyncVitals(res.parameters, effectiveDate, sourceLabel);
        setSyncSuccessMsg(
          `✓ Automatically synced ${res.parameters.length} extracted parameter${res.parameters.length > 1 ? "s" : ""} to Health Overview.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report upload or extraction failed.");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
      setProgressStep(0);
    }
  }

  async function handleParseManualText() {
    if (!consent) {
      setError("Please check the patient consent box to authorize confidential lab analysis.");
      return;
    }
    if (!manualText.trim()) return;
    setError(null);
    setSyncSuccessMsg(null);
    setLoading(true);
    setProgressStep(2);
    try {
      const langToUse = language === "auto" ? "hinglish" : language;
      const res = await parseReportText(manualText.trim(), langToUse, consent);
      res.upload_date = new Date().toISOString();
      res.filename = "Manual Lab Text Report";
      setCurrentResult(res);
      saveToHistory(res);
      setManualText("");
      setShowManualText(false);

      // Automatically refresh dashboard with parsed parameters
      if (onSyncVitals && res.parameters && res.parameters.length > 0) {
        const effectiveDate = res.report_date || (res.upload_date || new Date().toISOString()).split("T")[0];
        const sourceLabel = `Report: ${res.filename}`;
        onSyncVitals(res.parameters, effectiveDate, sourceLabel);
        setSyncSuccessMsg(
          `✓ Automatically synced ${res.parameters.length} parsed parameter${res.parameters.length > 1 ? "s" : ""} to Health Overview.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Text parsing failed.");
    } finally {
      setLoading(false);
      setProgressStep(0);
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

  function startEditParameter(param: LabParameterItem) {
    setEditingParam(param);
    setEditValue(param.value.toString());
    setEditUnit(param.unit);
    setEditLow(param.reference_low.toString());
    setEditHigh(param.reference_high.toString());
  }

  async function handleSaveParameterEdit() {
    if (!editingParam || !currentResult) return;
    const newVal = parseFloat(editValue);
    const newLow = parseFloat(editLow);
    const newHigh = parseFloat(editHigh);

    if (isNaN(newVal) || isNaN(newLow) || isNaN(newHigh)) {
      alert("Please enter valid numerical values.");
      return;
    }

    const updatedParams = currentResult.parameters.map((p) => {
      if (p.parameter_id === editingParam.parameter_id) {
        return {
          ...p,
          value: newVal,
          unit: editUnit.trim() || p.unit,
          reference_low: newLow,
          reference_high: newHigh,
          reference_range: `${newLow} - ${newHigh} ${editUnit.trim() || p.unit}`,
        };
      }
      return p;
    });

    try {
      const langToUse = language === "auto" ? "hinglish" : language;
      const recalculated = await recalculateReport(updatedParams, langToUse, currentResult.report_date);
      recalculated.filename = currentResult.filename;
      recalculated.file_url = currentResult.file_url;
      recalculated.upload_date = currentResult.upload_date;
      setCurrentResult(recalculated);
      saveToHistory(recalculated);
      if (onSyncVitals && recalculated.parameters && recalculated.parameters.length > 0) {
        const effectiveDate = recalculated.report_date || (recalculated.upload_date || new Date().toISOString()).split("T")[0];
        const sourceLabel = `Report: ${recalculated.filename || "Lab Document"}`;
        onSyncVitals(recalculated.parameters, effectiveDate, sourceLabel);
      }
      setEditingParam(null);
    } catch {
      // Client-side fallback if recalculate endpoint is busy
      const fallbackRecalc = {
        ...currentResult,
        parameters: updatedParams,
      };
      setCurrentResult(fallbackRecalc);
      saveToHistory(fallbackRecalc);
      if (onSyncVitals && fallbackRecalc.parameters && fallbackRecalc.parameters.length > 0) {
        const effectiveDate = fallbackRecalc.report_date || (fallbackRecalc.upload_date || new Date().toISOString()).split("T")[0];
        const sourceLabel = `Report: ${fallbackRecalc.filename || "Lab Document"}`;
        onSyncVitals(fallbackRecalc.parameters, effectiveDate, sourceLabel);
      }
      setEditingParam(null);
    }
  }

  function handleTriggerSync() {
    if (!currentResult || !onSyncVitals) return;
    const effectiveDate = currentResult.report_date || (currentResult.upload_date || new Date().toISOString()).split("T")[0];
    const sourceLabel = `Report: ${currentResult.filename || "Lab Document"}`;
    onSyncVitals(currentResult.parameters, effectiveDate, sourceLabel);
    setSyncSuccessMsg(
      `✓ Successfully synced ${currentResult.parameters.length} parameters to Health Overview. Historical readings preserved.`
    );
    setTimeout(() => setSyncSuccessMsg(null), 6000);
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <UploadCloud size={20} color="var(--primary)" />
            Medical Report Upload & Automated Extraction
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Upload lab tests, pathology panels, and clinical documents in PDF, JPG, or PNG.
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
          <strong>User Consent:</strong> I authorize SehatSetu AI to read this medical document to extract laboratory test names, values, and reference ranges. (Processed confidentially; never shared with third parties).
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
            accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
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
            {loading ? "Analyzing report contents with OCR..." : "Click or drag your medical report here"}
          </strong>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Supports PDF, JPG, PNG (Max 15MB). Hemoglobin, Blood Glucose, HbA1c, WBC, RBC, Platelets, Creatinine, Lipids, etc.
          </span>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
            Paste Raw Laboratory Report Text:
          </label>
          <textarea
            rows={5}
            placeholder="e.g. Report Date: 2026-11-05. Hemoglobin 11.2 g/dL (Normal: 12.0 - 15.5) Fasting Blood Sugar 145 mg/dL (Normal: 70 - 99)..."
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

      {/* Extraction Step Progress Indicator */}
      {loading && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1.5px solid #a7f3d0",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            marginBottom: 16,
          }}
        >
          <strong style={{ fontSize: "0.88rem", color: "#065f46", display: "block", marginBottom: 10 }}>
            Analyzing Document: Step {progressStep} of 4
          </strong>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.8rem", color: "#047857" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: progressStep >= 1 ? 1 : 0.4 }}>
              {progressStep > 1 ? "✓" : "●"} 1. Uploading & Verifying Document Format
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: progressStep >= 2 ? 1 : 0.4 }}>
              {progressStep > 2 ? "✓" : "●"} 2. Optical Character Recognition (OCR) & Text Layer Parsing
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: progressStep >= 3 ? 1 : 0.4 }}>
              {progressStep > 3 ? "✓" : "●"} 3. Matching Clinical Parameters & Stated Laboratory Ranges
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: progressStep >= 4 ? 1 : 0.4 }}>
              {progressStep >= 4 ? "✓" : "●"} 4. Generating Patient Summary & Reviewing Critical Safety Rules
            </div>
          </div>
        </div>
      )}

      {/* Sync Success Feedback Toast */}
      {syncSuccessMsg && (
        <div
          style={{
            background: "var(--success-light)",
            border: "1px solid var(--success-border)",
            color: "var(--success)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            fontWeight: 600,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Check size={18} />
          <span>{syncSuccessMsg}</span>
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
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--success-light)", color: "var(--success)", padding: "3px 8px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>
                  <FileCheck size={13} /> {currentResult.total_found} Parameters Recognized
                </div>
                {currentResult.out_of_range_count > 0 && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--warning-light)", color: "var(--warning)", padding: "3px 8px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 700 }}>
                    {currentResult.out_of_range_count} Outside Stated Range
                  </div>
                )}
                {currentResult.has_critical && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--danger-light)", color: "var(--danger)", padding: "3px 8px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 700 }}>
                    <ShieldAlert size={12} /> Critical Value Detected
                  </div>
                )}
              </div>

              <h4 style={{ margin: "6px 0 2px", fontSize: "1.15rem", fontWeight: 800 }}>
                {currentResult.filename || "Uploaded Report"}
              </h4>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                {currentResult.report_date && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--primary-dark)", fontWeight: 600 }}>
                    <Calendar size={12} /> Report Date: {currentResult.report_date}
                  </span>
                )}
                <span>Processed: {(currentResult.upload_date || "").split("T")[0] || "Today"}</span>
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {onSyncVitals && currentResult.parameters.length > 0 && (
                <button
                  type="button"
                  className="primary"
                  onClick={handleTriggerSync}
                  style={{ fontSize: "0.82rem", padding: "8px 16px", fontWeight: 700 }}
                  title="Populate Dashboard Health Overview Cards"
                >
                  <Sparkles size={14} /> Sync to Health Overview
                </button>
              )}

              {currentResult.file_url && (
                <a
                  href={currentResult.file_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    background: "#ffffff",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    color: "var(--text-main)",
                  }}
                  title="View or download uploaded original file"
                >
                  <Eye size={13} /> Original File
                </a>
              )}

              <button
                type="button"
                onClick={() => downloadJson(currentResult)}
                style={{ fontSize: "0.8rem", padding: "8px 12px" }}
                title="Download JSON Report"
              >
                <Download size={14} /> Export JSON
              </button>
            </div>
          </div>

          {/* Structured Intelligent Patient Summary */}
          {currentResult.summary && (
            <div
              style={{
                background: "var(--primary-light)",
                border: "1px solid var(--primary-border)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Sparkles size={18} color="var(--primary)" />
                <strong style={{ fontSize: "0.92rem", color: "var(--primary-dark)" }}>
                  Intelligent Patient-Friendly Report Summary
                </strong>
              </div>
              <div style={{ whiteSpace: "pre-line", fontSize: "0.84rem", color: "var(--text-main)", lineHeight: 1.6 }}>
                {currentResult.summary}
              </div>
            </div>
          )}

          {/* Extracted Parameters Table with Inline Edit Option */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={16} color="var(--primary)" />
                Recognized Laboratory Parameters ({currentResult.parameters.length})
              </strong>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Click "Edit" to correct any OCR reading before syncing
              </span>
            </div>

            {currentResult.parameters.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-app)", textAlign: "left", borderBottom: "1.5px solid var(--border-color)" }}>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Test Name</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Value</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Stated Lab Range</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Status</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Difference from Range</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Confidence</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "center" }}>Action</th>
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
                            background: param.is_critical
                              ? "#fee2e2"
                              : isAbnormal
                              ? "var(--warning-light)"
                              : "transparent",
                          }}
                        >
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                            {param.name}
                            {param.is_critical && (
                              <span style={{ color: "#dc2626", fontWeight: 700, marginLeft: 6, fontSize: "0.72rem" }}>
                                [CRITICAL]
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: param.is_critical ? "#b91c1c" : isAbnormal ? "var(--danger)" : "var(--text-main)" }}>
                            {param.value} {param.unit}
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>
                            {param.reference_range}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span className={badgeClass}>{param.status_label || param.status}</span>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: "0.76rem", color: isAbnormal ? "var(--danger)" : "var(--text-muted)" }}>
                            {param.difference_from_range || "--"}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: param.confidence === "high" ? "#d1fae5" : param.confidence === "medium" ? "#fef3c7" : "#fee2e2",
                                color: param.confidence === "high" ? "#065f46" : param.confidence === "medium" ? "#92400e" : "#991b1b",
                              }}
                            >
                              {param.confidence ? param.confidence.toUpperCase() : "HIGH"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => startEditParameter(param)}
                              style={{
                                padding: "4px 8px",
                                fontSize: "0.72rem",
                                border: "1px solid var(--border-color)",
                                background: "#ffffff",
                                cursor: "pointer",
                              }}
                              title="Correct extracted value"
                            >
                              <Edit2 size={11} /> Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "16px", background: "var(--bg-app)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                No standardized lab parameters could be confidently extracted. Please review the scanned copy or enter readings manually.
              </div>
            )}
          </div>

          {/* Sync CTA Footer */}
          {currentResult.parameters.length > 0 && onSyncVitals && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-app)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Ready to record these readings on your dashboard?
              </span>
              <button
                type="button"
                className="primary"
                onClick={handleTriggerSync}
                style={{ fontSize: "0.82rem", padding: "8px 18px", fontWeight: 700 }}
              >
                Sync to Health Overview <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Mandatory Medical Safety Disclaimer */}
          <div style={{ marginTop: 14, fontSize: "0.74rem", color: "var(--text-subtle)", fontStyle: "italic", borderTop: "1px solid var(--border-light)", paddingTop: 10 }}>
            {currentResult.disclaimer}
          </div>
        </div>
      )}

      {/* Parameter Edit Modal */}
      {editingParam && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
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
              boxShadow: "var(--shadow-hover)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
                Correct Extracted Value: {editingParam.name}
              </h4>
              <button
                type="button"
                onClick={() => setEditingParam(null)}
                style={{ padding: "4px 8px", fontSize: "0.85rem", border: "none" }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: "0 0 14px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Adjust value or reference range to match your original printed lab report:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Measurement Value
                </label>
                <input
                  type="number"
                  step="any"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Unit
                </label>
                <input
                  type="text"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Reference Min (Low)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editLow}
                    onChange={(e) => setEditLow(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Reference Max (High)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editHigh}
                    onChange={(e) => setEditHigh(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="primary"
                  onClick={() => void handleSaveParameterEdit()}
                  style={{ flex: 1, padding: "10px" }}
                >
                  Save & Recalculate
                </button>
                <button
                  type="button"
                  onClick={() => setEditingParam(null)}
                  style={{ flex: 1, padding: "10px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
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
                      {rep.report_date ? `Report Date: ${rep.report_date} • ` : ""}Uploaded {(rep.upload_date || "").split("T")[0] || "Today"} • {rep.parameters.length} test items
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentResult(rep);
                      }}
                      style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                    >
                      <Eye size={12} /> View
                    </button>
                    {rep.file_url && (
                      <a
                        href={rep.file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.74rem",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-md)",
                          textDecoration: "none",
                          color: "inherit",
                          background: "#ffffff",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        title="Download original file"
                      >
                        <Download size={12} /> File
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => downloadJson(rep)}
                      style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                      title="Export JSON"
                    >
                      <Download size={12} /> JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReportFromHistory(repKey)}
                      style={{ padding: "4px 8px", fontSize: "0.74rem", color: "var(--danger)" }}
                      title="Delete from history"
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
