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
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      <div className="p-5 border-b border-zinc-800/50 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
            Archives
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/5 transition-colors"
            onClick={() => handleCreateDocument()}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Filter archives..."
            className="w-full h-9 px-3 font-mono text-[11px] border border-zinc-800 bg-zinc-900/50 text-emerald-400 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-colors rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        <div className="space-y-0.5">
          {displayedDocuments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground/40 text-xs font-medium">
              {searchTerm ? "No matches found" : "No documents yet"}
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
          className={`group relative w-full flex flex-col gap-1 p-4 rounded-md transition-all cursor-pointer text-left border mb-1 ${
            isActive
              ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.1)]"
              : "text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300 border-transparent"
          }`}
        >
          {isActive && (
            <div className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          )}
          <div className="flex items-center gap-2.5">
            <IconComponent
              className={`size-3.5 shrink-0 ${isActive ? "text-emerald-500" : "text-zinc-600 group-hover:text-zinc-400"}`}
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
                className="h-7 text-[13px] bg-zinc-900/50 border-emerald-500/30 text-emerald-400 px-2 font-medium"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`truncate text-[13px] ${isActive ? "font-bold" : "font-medium"}`}>
                {document.title || "Untitled"}
              </span>
            )}
            {isActive && !isRenaming && (
              <div className="h-1 w-1 shrink-0 animate-pulse rounded-full bg-emerald-500" />
            )}
          </div>
          {!isRenaming &&
            serializeModelToPreviewText(document.contentModel || []).trim() && (
              <p className={`text-[11px] line-clamp-1 ml-6 leading-relaxed transition-colors ${isActive ? "text-emerald-400/60" : "text-zinc-600"}`}>
                {serializeModelToPreviewText(document.contentModel || [])}
              </p>
            )}
          {!isRenaming && (
            <div className="flex items-center justify-between ml-6 mt-2">
              <span className={`text-[9px] font-mono uppercase tracking-wider transition-colors ${isActive ? "text-emerald-500/40" : "text-zinc-700"}`}>
                {formatDate(document.updatedAt)}
              </span>
              <div className="flex gap-1.5">
                {document.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className={`text-[9px] px-1.5 py-0.5 rounded-sm border font-mono uppercase tracking-wider ${
                      isActive 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500/60" 
                        : "bg-zinc-900/50 border-zinc-800 text-zinc-600"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-[#0d0d0d] border-zinc-800 text-zinc-300 p-1 shadow-2xl">
        <ContextMenuItem
          onClick={() => setIsRenaming(true)}
          className="text-[11px] font-bold uppercase tracking-wider py-2 rounded hover:bg-emerald-500/5 hover:text-emerald-400"
        >
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-zinc-800/50" />
        <ContextMenuItem
          onClick={() => deleteDocument(document.id)}
          className="text-[11px] font-bold uppercase tracking-wider py-2 rounded text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400"
        >
          Purge Archive
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

