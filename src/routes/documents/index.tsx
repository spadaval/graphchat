import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DocumentList } from "~/components/DocumentList";
import type { Document } from "~/lib/state";
import { deleteDocument, getAllDocuments } from "~/lib/state";

export const Route = createFileRoute("/documents/")({
  component: DocumentsList,
});

function DocumentsList() {
  const navigate = useNavigate();
  const documents = getAllDocuments();

  const handleCreateNew = () => {
    navigate({ to: "/documents/new" });
  };

  const handleEdit = (document: Document) => {
    navigate({ to: "/documents/$id", params: { id: document.id } });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocument(id);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950">
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <DocumentList
          documents={documents}
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-zinc-300 mb-2">
            {documents.length === 0 ? "No documents yet" : "Select a document"}
          </h2>
          <p className="text-zinc-500 mb-6">
            {documents.length === 0
              ? "Create your first document to get started"
              : "Choose a document from the sidebar to view or edit it"}
          </p>
        </div>
      </div>
    </div>
  );
}
