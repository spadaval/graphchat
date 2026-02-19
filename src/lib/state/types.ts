// Type definitions for the state module

// IDs
export type ChatId = `chat-${string}`;
export type MessageId = `msg-${string}`;
export type BlockId = `blk-${string}`;
export type DocumentId = `doc-${string}`;
export type FolderId = `folder-${string}`;
export type WorldId = `world-${string}`;

export interface World {
  id: WorldId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

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
export type ActiveTab = "server" | "settings";

export interface UIPreferences {
  activeTab: ActiveTab;
  aiEnabled: boolean;
  inlineCompletion: boolean;
  activeSamplerPreset?: string;
  documentWidth?: number;
  tokenizerModelId: string;
  huggingfaceToken?: string;
  enableTokenProbabilities: boolean;
}

// Document linking state
export interface DocumentLinkingState {
  currentMessageLinks: DocumentId[]; // Documents selected for current message
  messageDocumentLinks: Record<BlockId, DocumentId[]>; // Documents linked to specific messages
}

// LLM types
export interface LLMMessage {
  role: MessageType;
  content: string;
  linkedDocuments?: DocumentId[];
}

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
  sourceMessages?: LLMMessage[];
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
export type BlockType =
  | "paragraph"
  | "heading"
  | "list-item"
  | "code"
  | "quote";
export type BlockViewMode = "edit" | "preview" | "tokens";

export interface TokenProbability {
  token: string;
  logprob: number;
  prob?: number;
  top_logprobs?: { token: string; logprob: number }[];
}

export interface BlockMetadata {
  aiGenerated?: boolean;
  sourcePrompt?: string;
  sourceMessages?: LLMMessage[]; // Store the messages used for generation for regeneration
  tokenProbabilities?: TokenProbability[]; // Store token probabilities from the LLM
  originalText?: string;
  [key: string]: string | number | boolean | undefined | null | object;
}

export interface Block {
  id: BlockId;
  messageId: MessageId; // Message ID for backward compatibility
  text: string;
  role: "user" | "assistant" | "system";
  type: BlockType;
  metadata?: BlockMetadata;
  isGenerating: boolean;
  createdAt: Date;
  linkedDocuments: DocumentId[]; // Track linked documents
  llmRequests?: LLMRequest[]; // LLM request attribution for assistant messages
  viewMode: BlockViewMode;
}
