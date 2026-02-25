export type EntityType = "location" | "organization" | "person";
export type CandidateState = "active" | "dismissed";

export interface EntitySpan {
  end: number;
  start: number;
  type: EntityType;
  confidence?: number;
}

export interface PersistedEntityMark {
  entity: true;
  entityId?: string;
  entityType: EntityType;
  entitySource: "manual" | "model";
  entityCanonicalName?: string;
  entityConfidence?: number;
  candidateState?: CandidateState;
  candidateRevision?: number;
}
