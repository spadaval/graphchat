import { createFileRoute } from "@tanstack/react-router";
import { DocumentEditorPage } from "./documents/documents-editor";

export const Route = createFileRoute("/documents")({
  component: DocumentEditorPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: search.id as string | undefined,
    };
  },
});