export type NerEntityType = "location" | "organization" | "person";

export interface NerSpan {
  end: number;
  start: number;
  type: NerEntityType;
  confidence?: number;
}

export interface PersistedNerMark {
  ner: true;
  nerType: NerEntityType;
  nerSource: "manual" | "model";
  nerCanonicalName?: string;
  nerConfidence?: number;
}
