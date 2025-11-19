export interface TargetProfile {
  industry: string | null;
  role: string | null;
  company: string | null;
  recent_achievements: string | null;
  notable_products_or_services: string | null;
  public_pain_points: string | null;
  writing_tone: string | null;
  values_or_preferences: string | null;
}

export interface TargetSignals {
  buying_reason: string;
  credibility_hook: string;
  emotional_hook: string;
}

export interface OutreachAngles {
  value_angle: string;
  curiosity_angle: string;
  social_angle: string;
}

export interface EmailDraft {
  body: string;
}

export interface DeliverabilityNote {
  riskLevel: "low" | "medium" | "high";
  cues: string;
  recommends: string;
}

export interface FinalEmail {
  body: string;
  meta: {
    selected_angle: keyof OutreachAngles;
    deliverability: DeliverabilityNote;
  };
}

export interface StageLogEntry {
  stage: string;
  output: string;
  timestamp: string;
}

export type SearchSuggestionType = "person" | "concept" | "metric";

export interface SearchSuggestion {
  type: SearchSuggestionType;
  name?: string;
  role?: string;
  detail: string;
  source?: string;
  metrics?: string[];
  angles?: string[];
  context?: string;
}
