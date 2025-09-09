import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import type { BlockId, DocumentId } from "./types";

export interface Block {
  id: BlockId;
  messageId: number; // Message ID for backward compatibility
  text: string;
  role: "user" | "assistant";
  isGenerating: boolean;
  createdAt: Date;
  linkedDocuments: DocumentId[]; // Track linked documents
}

// Block storage
export const blocks$ = observable<Record<BlockId, Block>>({});

// Block creation function
let nextMessageId = 0;
let nextBlockId = 1;
export const createBlock = (
  text: string,
  role: "user" | "assistant" = "user"
): Block => ({
  id: `blk-${nextBlockId++}`,
  messageId: nextMessageId++,
  text,
  role,
  isGenerating: false,
  createdAt: new Date(),
  linkedDocuments: [],
});

// Helper functions for document linking
export const addDocumentToBlock = (blockId: BlockId, documentId: DocumentId) => {
  const block = blocks$[blockId].get();
  if (!block) return;
  
  // Check if document is already linked
  if (!block.linkedDocuments.includes(documentId)) {
    blocks$[blockId].linkedDocuments.push(documentId);
  }
};

export const removeDocumentFromBlock = (blockId: BlockId, documentId: DocumentId) => {
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

export const setBlockLinkedDocuments = (blockId: BlockId, documentIds: DocumentId[]) => {
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
    if (block && block.linkedDocuments && Array.isArray(block.linkedDocuments) && block.linkedDocuments.includes(documentId)) {
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
