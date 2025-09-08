import { useState } from "react";
import { Button } from "~/components/ui/button";
import type { Document } from "~/lib/state";

interface DocumentListProps {
  documents: Document[];
  onCreateNew: () => void;
  onEdit: (document: Document) => void;
  onDelete: (id: string) => void;
}

export function DocumentList({
  documents,
  onCreateNew,
  onEdit,
  onDelete,
}: DocumentListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  // Format date without external libraries
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Handle keyboard events for accessibility
  const handleEditKeyDown = (event: React.KeyboardEvent, doc: Document) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onEdit(doc);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-zinc-100 mb-4">Documents</h1>
        <Button onClick={onCreateNew} className="w-full mb-4">
          + New Document
        </Button>
        <input
          type="text"
          placeholder="Search documents..."
          className="w-full p-2 text-sm border border-zinc-700 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredDocuments.length === 0 ? (
          <div className="p-4 text-center text-zinc-500">
            {searchTerm ? "No matching documents found" : "No documents yet"}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {filteredDocuments.map((doc) => (
              <li
                key={doc.id}
                className="hover:bg-zinc-800/50 transition-colors"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3
                      className="font-medium text-zinc-100 cursor-pointer hover:text-zinc-300"
                      onClick={() => onEdit(doc)}
                      onKeyDown={(e) => handleEditKeyDown(e, doc)}
                    >
                      {doc.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => onDelete(doc.id)}
                      className="text-zinc-500 hover:text-red-400 p-1"
                      aria-label="Delete document"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        role="img"
                        aria-label="Delete icon"
                      >
                        <title>Delete</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                    {doc.content}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {doc.tags.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">
                          +{doc.tags.length - 3}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {formatDate(new Date(doc.updatedAt))}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
