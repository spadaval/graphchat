import { useState } from "react";
import { DocumentList } from "~/components/DocumentList";
import { DocumentEditor } from "~/components/DocumentEditor";
import type { Document } from "~/lib/state";
import type { DocumentId } from "~/lib/state/types";
import {
  createDocument,
  deleteDocument,
  setCurrentDocument,
  updateDocument,
  useCurrentDocument,
  useDocuments,
} from "~/lib/state";

export function DocumentEditorPage() {
  const documents = useDocuments();
  const currentDocument = useCurrentDocument();
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateNew = () => {
    const id = createDocument("Untitled Document");
    setCurrentDocument(id);
  };

  const handleEdit = (document: Document) => {
    setCurrentDocument(document.id);
  };

  const handleDelete = (id: DocumentId) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocument(id);
    }
  };

  const handleSave = (title: string, content: string, tags: string[]) => {
    if (!currentDocument) {
      // Creating a new document (tags parameter is ignored since we removed tagging)
      createDocument(title, content);
    } else {
      // Updating existing document (tags parameter is ignored since we removed tagging)
      setIsSaving(true);
      updateDocument(currentDocument.id, { title, content });
      
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleCancel = () => {
    setCurrentDocument(undefined as unknown as DocumentId);
  };

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar with document list */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <DocumentList
          documents={documents}
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
      
      {/* Main editor area */}
      <div className="flex-1 flex flex-col">
        {currentDocument ? (
          <DocumentEditor
            document={currentDocument}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
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
              {documents.length === 0 && (
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Create Your First Document
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}