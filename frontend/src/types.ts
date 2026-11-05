export type Language =
  | "hinglish"
  | "hi"
  | "en"
  | "ta"
  | "te"
  | "bn"
  | "mr"
  | "gu"
  | "kn"
  | string;

export type Awaiting =
  | "concern"
  | "duration"
  | "severity"
  | "associated"
  | "age"
  | "history"
  | "complete"
  | string;

export type IntakeState = {
  language: Language;
  main_concern: string | null;
  duration: string | null;
  severity: string | null;
  associated_symptoms: string | null;
  age?: string | null;
  relevant_history?: string | null;
  awaiting: Awaiting;
  emergency: boolean;
  emergency_flags: string[];
};

export type Citation = {
  title: string;
  publisher: string;
  url: string;
  last_checked: string;
};

export type SummaryField = {
  label: string;
  value: string;
  source: "reported_by_user" | "not_provided" | "system";
};

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  audioBase64?: string;
  isStreaming?: boolean;
};

export function emptyState(language: Language): IntakeState {
  return {
    language,
    main_concern: null,
    duration: null,
    severity: null,
    associated_symptoms: null,
    age: null,
    relevant_history: null,
    awaiting: "concern",
    emergency: false,
    emergency_flags: [],
  };
}
