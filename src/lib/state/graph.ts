import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import type { DocumentId, GraphEdge } from "./types";

interface GraphStore {
  edges: GraphEdge[];
}

const graphStore = observable<GraphStore>({
  edges: [],
});

export const graphStore$ = graphStore;

// Actions
export const addEdge = (source: DocumentId, target: DocumentId, type: string) => {
  const edges = graphStore$.edges.get();
  // Check if edge already exists
  const exists = edges.some(
    (edge) =>
      edge.source === source && edge.target === target && edge.type === type,
  );

  if (!exists) {
    graphStore$.edges.push({ source, target, type });
  }
};

export const removeEdge = (source: DocumentId, target: DocumentId, type: string) => {
  const edges = graphStore$.edges.get();
  const index = edges.findIndex(
    (edge) =>
      edge.source === source && edge.target === target && edge.type === type,
  );

  if (index > -1) {
    graphStore$.edges.splice(index, 1);
  }
};

export const getEdgesForDocument = (documentId: DocumentId) => {
  const edges = graphStore$.edges.get();
  return edges.filter(
    (edge) => edge.source === documentId || edge.target === documentId,
  );
};

export const getRelatedDocuments = (documentId: DocumentId): DocumentId[] => {
  const edges = getEdgesForDocument(documentId);
  return edges.map((edge) =>
    edge.source === documentId ? edge.target : edge.source,
  );
};

// Persist state
syncObservable(graphStore$, {
  persist: {
    name: "graphStore",
    plugin: ObservablePersistLocalStorage,
  },
});
