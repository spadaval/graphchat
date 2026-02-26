export const GENERATE_NEXT_SLASH_EVENT = "wc:generate-next";
export const RUN_AI_SEGMENT_EVENT = "wc:run-ai-segment";
export const ACCEPT_AI_SEGMENT_EVENT = "wc:accept-ai-segment";

export interface GenerateNextSlashEventDetail {
  editorId: string;
}

export interface RunAISegmentEventDetail {
  aiSegmentId: string;
  editorId: string;
  instructions?: string;
}

export interface AcceptAISegmentEventDetail {
  aiSegmentId: string;
  editorId: string;
}
