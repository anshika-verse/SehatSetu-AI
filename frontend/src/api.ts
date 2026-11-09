import type { Citation, IntakeState, Language, SummaryField } from "./types";

const base = import.meta.env.VITE_API_BASE_URL ?? "";

export type Health = {
  status: string;
  speech_mode: "live" | "demo";
  database: { ok: boolean; stores_health_data: boolean };
  gnani?: Record<string, any>;
  triage?: { provider: string; configured: boolean; status: string; notice: string };
  medicine?: Record<string, any>;
  safety?: Record<string, any>;
};

async function fail(response: Response): Promise<never> {
  let detail = "The request could not be completed.";
  try {
    const body = (await response.json()) as { detail?: string };
    if (typeof body.detail === "string") detail = body.detail;
  } catch {
    detail = response.statusText || detail;
  }
  throw new Error(detail);
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) await fail(response);
  return (await response.json()) as T;
}

export function getHealth(): Promise<Health> {
  return json<Health>("/api/health");
}

export function transcribe(audio: Blob, language: Language) {
  const form = new FormData();
  form.append("audio", audio, "speech.wav");
  form.append("language", language);
  return json<{
    mode: "live" | "demo";
    transcript: string;
    detected_language_code: string | null;
    model: string | null;
    notice: string | null;
  }>("/api/stt/transcribe", { method: "POST", body: form });
}

export function intakeTurn(message: string, state: IntakeState) {
  return json<{
    state: IntakeState;
    assistant_message: string;
    emergency: boolean;
    emergency_flags: string[];
    emergency_notice: string | null;
    citations: Citation[];
    disclaimer: string;
  }>("/api/intake/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, state }),
  });
}

export function askKnowledge(question: string, language: Language) {
  return json<{ found: boolean; answer: string; citations: Citation[]; disclaimer: string }>(
    "/api/knowledge/ask",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, language }),
    },
  );
}

export function generateSummary(state: IntakeState, citations: Citation[]) {
  return json<{ title: string; fields: SummaryField[]; text: string; disclaimer: string }>(
    "/api/summary/generate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, citations }),
    },
  );
}

export async function speak(
  text: string,
  language: Language,
  gender: "male" | "female" = "female",
): Promise<{ audio: Blob; mode: string }> {
  const response = await fetch(`${base}/api/tts/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language, gender }),
  });
  if (!response.ok) await fail(response);
  return {
    audio: await response.blob(),
    mode: response.headers.get("X-SehatSetu-Speech-Mode") ?? "unknown",
  };
}

export function getSchemes() {
  return json<{
    notice: string;
    schemes: Array<{ title: string; publisher: string; url: string; last_checked: string; summary: string }>;
  }>("/api/resources/schemes");
}

export function getFacilities() {
  return json<{
    demo: boolean;
    notice: string;
    facilities: Array<{ name: string; area: string; kind: string; phone: string }>;
  }>("/api/resources/facilities");
}

export function requestAppointment(facilityName: string, preferredTime: string, consent: boolean) {
  return json<{ confirmed: boolean; status: string; message: string }>("/api/appointments/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      facility_name: facilityName,
      preferred_time: preferredTime,
      consent,
    }),
  });
}

export function explainTerm(term: string, language: Language) {
  return json<{
    found: boolean;
    answer: string;
    citation: Citation | null;
    disclaimer: string;
  }>("/api/report/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ term, language }),
  });
}

export function lookupMedicine(term: string, language: Language = "hinglish") {
  return json<{
    query: string;
    openfda: {
      found: boolean;
      term: string;
      generic_name?: string;
      brand_names?: string[];
      purpose?: string;
      warnings_summary?: string;
      disclaimer: string;
    };
    rxnorm: {
      found: boolean;
      concepts?: Array<{ rxcui: string; name: string; tty: string }>;
    };
    disclaimer: string;
  }>("/api/medicine/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ term, language }),
  });
}

export function evaluateTriage(
  text: string,
  age?: number,
  sex?: "male" | "female",
  language: Language = "hinglish",
) {
  return json<{
    available: boolean;
    status: string;
    extracted_concepts: Array<{ id: string; name?: string; common_name?: string }>;
    triage?: {
      triage_level?: string;
      serious?: any[];
      description?: string;
      label?: string;
    } | null;
    notice?: string | null;
    disclaimer: string;
  }>("/api/triage/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, age, sex, language }),
  });
}

export type NearbyFacility = {
  id: string;
  name: string;
  category: "hospital" | "clinic" | "diagnostic" | "pharmacy";
  type_label: string;
  address: string;
  phone: string;
  emergency_phone?: string;
  rating: number;
  user_ratings_total: number;
  open_now: boolean;
  emergency_24x7: boolean;
  distance_km: number;
  latitude: number;
  longitude: number;
  directions_url: string;
  verified_booking_url?: string;
  appointment_support?: string;
  specialities: string[];
};

export type NearbyPlacesResult = {
  source: string;
  provider: string;
  count: number;
  facilities: NearbyFacility[];
  suggested_specialities: Array<{
    speciality: string;
    description: string;
    urgent_sign: boolean;
  }>;
  notice?: string | null;
  external_links?: Record<string, string> | null;
  disclaimer: string;
};

export type ReverseGeocodeResult = {
  formatted_address: string;
  city?: string | null;
  state?: string | null;
  area?: string | null;
  country?: string | null;
  provider: string;
};

export type SupportedLanguage = {
  code: string;
  name: string;
  native_name: string;
  stt_provider: string;
  tts_provider: string;
  voice_female: string;
  voice_male: string;
  code_mixed_support: boolean;
  verified: boolean;
  stt_active: boolean;
  tts_active: boolean;
  provider_status: string;
};

export type LanguageDetectResult = {
  detected_language: string;
  language_name: string;
  confidence: number;
  provider: string;
  is_code_mixed: boolean;
};

export function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  return json<ReverseGeocodeResult>(`/api/places/reverse-geocode?lat=${lat}&lng=${lng}`);
}

export function getSupportedLanguages(): Promise<SupportedLanguage[]> {
  return json<SupportedLanguage[]>("/api/language/supported");
}

export function detectLanguage(text: string): Promise<LanguageDetectResult> {
  return json<LanguageDetectResult>("/api/language/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export function getNearbyPlaces(params: {
  latitude: number;
  longitude: number;
  radius_km?: number;
  category?: string;
  symptoms?: string;
}): Promise<NearbyPlacesResult> {
  return json<NearbyPlacesResult>("/api/places/nearby", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export type LabParameterItem = {
  parameter_id: string;
  name: string;
  category: string;
  value: number;
  unit: string;
  reference_range: string;
  reference_low: number;
  reference_high: number;
  status: "normal" | "high" | "low" | string;
  status_label: string;
  is_out_of_range: boolean;
  difference_from_range?: string | null;
  is_critical?: boolean;
  confidence?: "high" | "medium" | "low" | string;
  description: string;
  doctor_question?: string | null;
};

export type ReportAnalysisResult = {
  filename?: string | null;
  file_type?: string | null;
  file_url?: string | null;
  report_date?: string | null;
  total_found: number;
  out_of_range_count: number;
  critical_count?: number;
  has_critical?: boolean;
  parameters: LabParameterItem[];
  summary: string;
  disclaimer: string;
  upload_date?: string;
};

export async function analyzeReportFile(
  file: File,
  language: string = "hinglish",
  consent: boolean = true,
): Promise<ReportAnalysisResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("language", language);
  form.append("consent", consent ? "true" : "false");

  const response = await fetch(`${base}/api/reports/analyze`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) await fail(response);
  const data = (await response.json()) as ReportAnalysisResult;
  return data;
}

export function parseReportText(
  text: string,
  language: string = "hinglish",
  consent: boolean = true,
): Promise<ReportAnalysisResult> {
  return json<ReportAnalysisResult>("/api/reports/parse-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language, consent }),
  });
}

export function recalculateReport(
  parameters: LabParameterItem[],
  language: string = "hinglish",
  reportDate?: string | null,
): Promise<ReportAnalysisResult> {
  return json<ReportAnalysisResult>("/api/reports/recalculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parameters, language, report_date: reportDate }),
  });
}

