import { DocumentList } from "~/components/DocumentList";
import { DocumentEditor } from "~/components/DocumentEditor";
import type { Document } from "~/lib/state";
import type { DocumentId } from "~/lib/state/types";
import {
  createDocument,
  deleteDocument,
  documentStore$,
  setCurrentDocument,
  updateDocument,
  useCurrentDocument,
  useDocuments,
} from "~/lib/state";

export function DocumentEditorPage() {
  const documents = useDocuments();
  const currentDocument = useCurrentDocument();

  const handleCreateNew = () => {
    // Create a new empty document and set it as the current document
    const id = createDocument("Untitled Document", "");
    setCurrentDocument(id);
  };

  const handleCancel = () => {
    setCurrentDocument(undefined as unknown as DocumentId);
  };

  // Get the observable for the current document if it exists
  const currentDocument$ = currentDocument 
    ? documentStore$.documents[currentDocument.id] 
    : null;

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar with document list */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <DocumentList
          documents={documents}
          onCreateNew={handleCreateNew}
          onSelect={setCurrentDocument}
          onDelete={deleteDocument}
        />
      </div>
      
      {/* Main editor area */}
      <div className="flex-1 flex flex-col">
        {currentDocument$ ? (
          <DocumentEditor
            document$={currentDocument$}
            onSave={(title, content) => {
              if (currentDocument) {
                updateDocument(currentDocument.id, { title, content });
              }
            }}
            onCancel={handleCancel}
            onDelete={currentDocument ? deleteDocument : undefined}
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