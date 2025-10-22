import { PlateDocumentEditor } from "./PlateDocumentEditor";
import type { Observable } from "@legendapp/state";
import type { Document } from "~/lib/state";

interface DocumentEditorProps {
  document$: Observable<Document>;
  onCancel?: () => void;
}

export function DocumentEditor({ document$, onCancel }: DocumentEditorProps) {
  return <PlateDocumentEditor document$={document$} onCancel={onCancel} />;
}
