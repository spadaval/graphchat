import { createFileRoute } from "@tanstack/react-router";
import { DocumentEditorPage } from "./documents/documents-editor";

export const Route = createFileRoute("/documents")({
  component: DocumentEditorPage,
});