import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import type {
  AIProvider,
  BlockId,
  DocumentId,
  DocumentLinkingState,
  UIPreferences,
} from "./types";

const uiPreferences: UIPreferences = {
  activeTab: "settings",
  aiEnabled: true,
  aiProvider: "browser",
  inlineCompletion: true,
  documentWidth: 800,
  tokenizerModelId: "default", // Assuming a default value for the new required property
  enableTokenProbabilities: true,
};

export const uiPreferences$ = observable<UIPreferences>(uiPreferences);

// Document linking state
const documentLinkingState: DocumentLinkingState = {
  currentMessageLinks: [],
  messageDocumentLinks: {},
};

export const documentLinking$ =
  observable<DocumentLinkingState>(documentLinkingState);

// Actions
export const setActiveTab = (tab: UIPreferences["activeTab"]) => {
  uiPreferences$.activeTab.set(tab);
};

export const setAIEnabled = (enabled: boolean) => {
  uiPreferences$.aiEnabled.set(enabled);
};

export const setAIProvider = (provider: AIProvider) => {
  uiPreferences$.aiProvider.set(provider);
};

export const setInlineCompletionEnabled = (enabled: boolean) => {
  uiPreferences$.inlineCompletion.set(enabled);
};

export const setEnableTokenProbabilities = (enabled: boolean) => {
  uiPreferences$.enableTokenProbabilities.set(enabled);
};

export const setActiveSamplerPreset = (presetId: string | undefined) => {
  uiPreferences$.activeSamplerPreset.set(presetId);
};

export const setDocumentWidth = (width: number) => {
  uiPreferences$.documentWidth.set(width);
};

export const setTokenizerModelId = (id: string) => {
  uiPreferences$.tokenizerModelId.set(id);
};

export const setHuggingfaceToken = (token: string) => {
  uiPreferences$.huggingfaceToken.set(token);
};

// Document linking actions
export const addDocumentToCurrentMessage = (documentId: DocumentId) => {
  const currentLinks = documentLinking$.currentMessageLinks.get();
  if (!currentLinks.includes(documentId)) {
    documentLinking$.currentMessageLinks.push(documentId);
  }
};

export const removeDocumentFromCurrentMessage = (documentId: DocumentId) => {
  const currentLinks = documentLinking$.currentMessageLinks.get();
  const index = currentLinks.indexOf(documentId);
  if (index > -1) {
    documentLinking$.currentMessageLinks.splice(index, 1);
  }
};

export const clearCurrentMessageLinks = () => {
  documentLinking$.currentMessageLinks.set([]);
};

export const getCurrentMessageLinks = (): DocumentId[] => {
  return documentLinking$.currentMessageLinks.get();
};

// Block-specific document linking actions
export const addDocumentToMessage = (
  blockId: BlockId,
  documentId: DocumentId,
) => {
  const currentLinks =
    documentLinking$.messageDocumentLinks[blockId].get() || [];
  if (!currentLinks.includes(documentId)) {
    documentLinking$.messageDocumentLinks[blockId].set([
      ...currentLinks,
      documentId,
    ]);
  }
};

export const removeDocumentFromMessage = (
  blockId: BlockId,
  documentId: DocumentId,
) => {
  const currentLinks =
    documentLinking$.messageDocumentLinks[blockId].get() || [];
  const index = currentLinks.indexOf(documentId);
  if (index > -1) {
    const newLinks = [...currentLinks];
    newLinks.splice(index, 1);
    documentLinking$.messageDocumentLinks[blockId].set(newLinks);
  }
};

export const getMessageDocumentLinks = (blockId: BlockId): DocumentId[] => {
  return documentLinking$.messageDocumentLinks[blockId].get() || [];
};

export const setMessageDocumentLinks = (
  blockId: BlockId,
  documentIds: DocumentId[],
) => {
  documentLinking$.messageDocumentLinks[blockId].set(documentIds);
};

// Persist state
syncObservable(uiPreferences$, {
  persist: {
    name: "uiPreferences",
    plugin: ObservablePersistLocalStorage,
  },
});

syncObservable(documentLinking$, {
  persist: {
    name: "documentLinking",
    plugin: ObservablePersistLocalStorage,
  },
});

export default uiPreferences$;
