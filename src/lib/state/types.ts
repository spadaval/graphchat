// Type definitions for the state module

// IDs
export type ChatId = `chat-${number}`;
export type MessageId = `msg-${number}`;
export type BlockId = `blk-${number}`;
export type DocumentId = `doc-${number}`;

// Message types
export type MessageType = "user" | "assistant" | "system";

// Server info types
export interface ServerInfo {
  model_name: string;
  model_path: string;
  model_type: string;
  model_size: string;
  model_params: number;
  context_size: number;
  gpu_layers: number;
  slots_idle: number;
  slots_processing: number;
  slots_pending: number;
  slots_idle_percent: number;
  slots_processing_percent: number;
  slots_pending_percent: number;
  cpu_usage: number;
  ram_usage: number;
  vram_usage: number;
  system_info: string;
  timestamp: number;
}

// UI preferences
export type ActiveTab = "model" | "server" | "documents";

export interface UIPreferences {
  activeTab: ActiveTab;
}

// Document linking state
export interface DocumentLinkingState {
  currentMessageLinks: DocumentId[]; // Documents selected for current message
  messageDocumentLinks: Record<BlockId, DocumentId[]>; // Documents linked to specific messages
}

// LLM request attribution
export interface LLMRequest {
  id: string; // Unique request ID
  timestamp: Date;
  model: string;
  parameters: ModelProperties;
  tokensUsed?: number;
  tokensGenerated?: number;
  duration?: number; // Request duration in ms
  success: boolean;
  error?: string;
}

export interface ModelProperties {
  temperature: number;
  top_k: number;
  top_p: number;
  n_predict: number;
  stream: boolean;
  stop: string[];
  repeat_penalty: number;
  presence_penalty: number;
  frequency_penalty: number;
  mirostat: 0 | 1 | 2;
  mirostat_tau: number;
  mirostat_eta: number;
  seed: number;
  n_probs: number;
  cache_prompt: boolean;
  return_tokens: boolean;
}

// Graph types
export interface GraphEdge {
  source: DocumentId;
  target: DocumentId;
  type: string; // e.g., "mentions", "located_in", "part_of"
}

// Block types
export type BlockType = "paragraph" | "heading" | "list-item" | "code" | "quote";
