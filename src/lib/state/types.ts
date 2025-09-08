// Type definitions for the state module

// IDs
export type ChatId = `chat-${number}`;
export type MessageId = `msg-${number}`;
export type BlockId = `blk-${number}`;
export type DocumentId = `doc-${number}`;

// Message types
export type MessageType = "user" | "assistant";

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
export type ActiveTab = "model" | "server";

export interface UIPreferences {
  activeTab: ActiveTab;
  showDocumentPanel: boolean;
}
