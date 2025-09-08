import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DocumentEditor } from "~/components/DocumentEditor";
import { deleteDocument, getDocumentById, updateDocument } from "~/lib/state";

export const Route = createFileRoute("/documents/$id")({
  component: DocumentEditorRoute,
  loader: ({ params }) => {
    const document = getDocumentById(params.id);
    if (!document) {
      throw new Error("Document not found");
    }
    return { document };
  },
});

function DocumentEditorRoute() {
  const { document: initialDocument } = Route.useLoaderData();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save when content changes (debounced)
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      // In a real implementation, we would check if the document has changed
      // and save it automatically. For now, we'll just simulate this.
      setIsSaving(false);
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, []);

  const handleSave = (title: string, content: string, tags: string[]) => {
    setIsSaving(true);
    updateDocument(initialDocument.id, { title, content, tags });
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleCancel = () => {
    navigate({ to: "/documents" });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocument(initialDocument.id);
      navigate({ to: "/documents" });
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-100">
            Editing: {initialDocument.title}
          </h1>
          <div className="flex space-x-2">
            {isSaving && (
              <span className="text-sm text-zinc-500">Saving...</span>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1 bg-red-700 hover:bg-red-600 text-zinc-200 rounded text-sm"
            >
              Delete
            </button>
          </div>
        </div>
        <DocumentEditor
          document={initialDocument}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
