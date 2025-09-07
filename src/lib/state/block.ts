import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import { BlockId } from "./types";

export interface Block {
  id: BlockId;
  messageId: number; // Message ID for backward compatibility
  text: string;
  role: "user" | "assistant";
  isGenerating: boolean;
  createdAt: Date;
}

// Block storage
export const blocks$ = observable<Record<BlockId, Block>>({});

// Block creation function
let nextMessageId = 0;
export const createBlock = (text: string, role: "user" | "assistant" = "user"): Block => ({
  id: crypto.randomUUID(),
  messageId: nextMessageId++,
  text,
  role,
  isGenerating: false,
  createdAt: new Date(),
});

// Persist block state
syncObservable(blocks$, {
  persist: {
    name: "blocksStore",
    plugin: ObservablePersistLocalStorage,
  },
});