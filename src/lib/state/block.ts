import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import type {
  Block,
  BlockId,
  BlockType,
  BlockViewMode,
  DocumentId,
  LLMRequest,
} from "./types";

// Block storage
export const blocks$ = observable<Record<BlockId, Block>>({});

// Block creation function
// Block creation function
export const createBlock = (
  text: string,
  role: "user" | "assistant" | "system" = "user",
  type: BlockType = "paragraph",
  metadata?: Record<string, any>,
  viewMode: BlockViewMode = "preview",
): Block => ({
  id: `blk-${crypto.randomUUID()}`,
  messageId: `msg-${crypto.randomUUID()}`,
  text,
  role,
  type,
  metadata,
  isGenerating: false,
  createdAt: new Date(),
  linkedDocuments: [],
  llmRequests: role === "assistant" ? [] : undefined, // Only assistant messages have LLM requests
  viewMode,
});

// Helper functions for document linking
export const addDocumentToBlock = (
  blockId: BlockId,
  documentId: DocumentId,
) => {
  const block = blocks$[blockId].get();
  if (!block) return;

  // Check if document is already linked
  if (!block.linkedDocuments.includes(documentId)) {
    blocks$[blockId].linkedDocuments.push(documentId);
  }
};

export const removeDocumentFromBlock = (
  blockId: BlockId,
  documentId: DocumentId,
) => {
  const block = blocks$[blockId].get();
  if (!block) return;

  const index = block.linkedDocuments.indexOf(documentId);
  if (index > -1) {
    blocks$[blockId].linkedDocuments.splice(index, 1);
  }
};

export const getBlockLinkedDocuments = (blockId: BlockId): DocumentId[] => {
  const block = blocks$[blockId].get();
  return block?.linkedDocuments || [];
};

export const setBlockLinkedDocuments = (
  blockId: BlockId,
  documentIds: DocumentId[],
) => {
  const block = blocks$[blockId].get();
  if (!block) return;

  blocks$[blockId].linkedDocuments.set(documentIds);
};

// Remove a document reference from all blocks
export const removeDocumentFromAllBlocks = (documentId: DocumentId) => {
  const blocks = blocks$.get();
  Object.keys(blocks).forEach((blockId) => {
    const block = blocks[blockId as BlockId];
    // Add proper null checks
    if (
      block?.linkedDocuments &&
      Array.isArray(block.linkedDocuments) &&
      block.linkedDocuments.includes(documentId)
    ) {
      removeDocumentFromBlock(block.id, documentId);
    }
  });
};

// Persist block state
syncObservable(blocks$, {
  persist: {
    name: "blocksStore",
    plugin: ObservablePersistLocalStorage,
  },
});
