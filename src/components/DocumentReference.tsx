import { useEffect, useState } from "react";
import type { Document } from "~/lib/state";
import { getAllDocuments } from "~/lib/state";
import { getDocumentExcerpts, searchDocuments } from "~/utils/document-helpers";

interface DocumentReferencePanelProps {
  onInsertDocument: (document: Document) => void;
}

export function DocumentReferencePanel({
  onInsertDocument,
}: DocumentReferencePanelProps) {
  const documents = getAllDocuments();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredDocuments, setFilteredDocuments] =
    useState<Document[]>(documents);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [excerpts, setExcerpts] = useState<string[]>([]);

  // Filter documents based on search term
  useEffect(() => {
    setFilteredDocuments(
      searchTerm ? searchDocuments(documents, searchTerm) : documents,
    );
  }, [searchTerm, documents]);

  // Get excerpts when a document is selected
  useEffect(() => {
    if (selectedDocument) {
      setExcerpts(getDocumentExcerpts(selectedDocument, searchTerm));
    } else {
      setExcerpts([]);
    }
  }, [selectedDocument, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 w-80">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-100">Documents</h2>
      </div>

      {/* Search */}
      <div className="p-2">
        <input
          type="text"
          placeholder="Search documents..."
          className="w-full p-2 text-sm border border-zinc-700 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        {filteredDocuments.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">
            {searchTerm ? "No matching documents" : "No documents yet"}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {filteredDocuments.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => setSelectedDocument(doc)}
                  className={`w-full text-left p-3 hover:bg-zinc-800 transition-colors ${
                    selectedDocument?.id === doc.id ? "bg-zinc-800" : ""
                  }`}
                >
                  <div className="font-medium text-zinc-100 truncate">
                    {doc.title}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 truncate">
                    {doc.content.substring(0, 60)}
                    {doc.content.length > 60 ? "..." : ""}
                  </div>
                  {doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.slice(0, 2).map((tag) => (
                        <span
                          key={`${doc.id}-${tag}`}
                          className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {doc.tags.length > 2 && (
                        <span className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">
                          +{doc.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Document Preview */}
      {selectedDocument && (
        <div className="border-t border-zinc-800 p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-zinc-100">
              {selectedDocument.title}
            </h3>
            <button
              type="button"
              onClick={() => onInsertDocument(selectedDocument)}
              className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs rounded"
            >
              Insert
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {excerpts.map((excerpt, index) => (
              <div
                key={`${selectedDocument.id}-${index}`}
                className="text-xs text-zinc-300"
              >
                {excerpt}
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-1">
            {selectedDocument.tags.map((tag) => (
              <span
                key={`${selectedDocument.id}-${tag}`}
                className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
