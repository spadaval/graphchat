import { use$ } from "@legendapp/state/react";
import {
  Book,
  Building,
  FileText,
  Ghost,
  Map as MapIcon,
  Plus,
  Scroll,
  Sparkles,
  User,
} from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { Input } from "~/components/ui/input";
import { serializeModelToPreviewText } from "~/lib/document-content";
import type { Document } from "~/lib/state/documents";
import {
  createDocument,
  DocumentIcon,
  deleteDocument,
  documentStore$,
  getDocumentTypeDisplayId,
  updateDocument,
} from "~/lib/state/documents";
import type { DocumentId } from "~/lib/state/types";
import { worldStore$ } from "~/lib/state/worlds";

interface DocumentListProps {
  currentDocumentId?: DocumentId;
  onSelect: (documentId: DocumentId) => void;
}

const iconMap: Record<
  DocumentIcon,
  React.ComponentType<{ className?: string }>
> = {
  [DocumentIcon.FileText]: FileText,
  [DocumentIcon.User]: User,
  [DocumentIcon.Map]: MapIcon,
  [DocumentIcon.Sparkles]: Sparkles,
  [DocumentIcon.Ghost]: Ghost,
  [DocumentIcon.Building]: Building,
  [DocumentIcon.Book]: Book,
  [DocumentIcon.Scroll]: Scroll,
};

export function DocumentList({
  currentDocumentId,
  onSelect,
}: DocumentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const documents = use$(documentStore$.documents);
  const documentTypes = use$(documentStore$.documentTypes);
  const currentWorldId = use$(worldStore$.currentWorldId);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCreateDocument = (typeId: string = "general") => {
    const typeDef = documentTypes[typeId];
    const title = typeDef ? `Untitled ${typeDef.name}` : "Untitled";
    const id = createDocument(title, "", typeId, []);
    onSelect(id);
  };

  const documentsInWorld = Object.values(documents).filter(
    (doc) => doc.worldId === currentWorldId,
  );

  const filteredDocuments = documentsInWorld.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      serializeModelToPreviewText(doc.contentModel || [])
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      doc.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  const displayedDocuments = searchTerm ? filteredDocuments : documentsInWorld;

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="p-4 border-b border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-100">Documents</h1>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-zinc-400 hover:text-zinc-100"
            onClick={() => handleCreateDocument()}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <input
          type="text"
          placeholder="Search documents..."
          className="w-full p-2 text-sm border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {displayedDocuments.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-sm">
              {searchTerm ? "No matching documents found" : "No documents yet"}
            </div>
          ) : (
            displayedDocuments.map((doc) => (
              <DocumentListItem
                key={doc.id}
                document={doc}
                isActive={doc.id === currentDocumentId}
                onSelect={() => onSelect(doc.id)}
                formatDate={formatDate}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface DocumentListItemProps {
  document: Document;
  isActive: boolean;
  onSelect: () => void;
  formatDate: (date: Date | string) => string;
}

function DocumentListItem({
  document,
  isActive,
  onSelect,
  formatDate,
}: DocumentListItemProps) {
  const documentTypes = use$(documentStore$.documentTypes);
  const typeDef =
    documentTypes[getDocumentTypeDisplayId(document)] ||
    documentTypes[document.baseTypeId] ||
    documentTypes.general;
  const IconComponent = typeDef ? iconMap[typeDef.icon] || FileText : FileText;

  const [isRenaming, setIsRenaming] = useState(false);

  const handleRename = (newTitle: string) => {
    if (newTitle.trim()) {
      updateDocument(document.id, { title: newTitle.trim() });
    }
    setIsRenaming(false);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          type="button"
          onClick={onSelect}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect();
            }
          }}
          className={`w-full flex flex-col gap-1 p-3 rounded-md transition-colors cursor-pointer text-left ${
            isActive
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <IconComponent
              className={`size-4 shrink-0 ${isActive ? "text-zinc-200" : "text-zinc-500"}`}
            />
            {isRenaming ? (
              <Input
                autoFocus
                defaultValue={document.title}
                onBlur={(e) => handleRename(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(e.currentTarget.value);
                  if (e.key === "Escape") setIsRenaming(false);
                }}
                className="h-6 text-xs bg-zinc-800 border-zinc-700 text-zinc-100 px-1"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate text-sm font-medium">
                {document.title || "Untitled"}
              </span>
            )}
          </div>
          {!isRenaming &&
            serializeModelToPreviewText(document.contentModel || []).trim() && (
              <p className="text-xs text-zinc-500 line-clamp-1 ml-6">
                {serializeModelToPreviewText(document.contentModel || [])}
              </p>
            )}
          {!isRenaming && (
            <div className="flex items-center justify-between ml-6 mt-1">
              <span className="text-[10px] text-zinc-600 font-mono">
                {formatDate(document.updatedAt)}
              </span>
              <div className="flex gap-1">
                {document.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700/50 text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <ContextMenuItem onClick={() => setIsRenaming(true)}>
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-zinc-800" />
        <ContextMenuItem
          onClick={() => deleteDocument(document.id)}
          className="text-red-400"
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
