import { PlateDocumentEditor } from "./PlateDocumentEditor";
import type { Observable } from "@legendapp/state";
import type { Document } from "~/lib/state";
import type { DocumentId } from "~/lib/state/types";

interface DocumentEditorProps {
  document$: Observable<Document>;
  onSave: (title: string, content: string, tags: string[]) => void;
  onCancel: () => void;
  onDelete?: (id: DocumentId) => void;
}

export function DocumentEditor({
  document$,
  onSave,
  onCancel,
  onDelete,
}: DocumentEditorProps) {
  return (
    <PlateDocumentEditor
      document$={document$}
      onSave={onSave}
      onCancel={onCancel}
      onDelete={onDelete}
    />
  );
}