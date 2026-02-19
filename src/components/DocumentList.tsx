import { use$ } from "@legendapp/state/react";
import {
  Book,
  Building,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
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
import type { Document, Folder } from "~/lib/state/documents";
import {
  createDocument,
  createFolder,
  DocumentIcon,
  deleteDocument,
  deleteFolder,
  documentStore$,
  moveDocument,
  moveFolder,
  updateDocument,
  updateFolder,
} from "~/lib/state/documents";
import type { DocumentId, FolderId } from "~/lib/state/types";

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
  const folders = use$(documentStore$.folders);
  const documentTypes = use$(documentStore$.documentTypes);

  // Format date without external libraries
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCreateDocument = (
    typeId: string = "general",
    parentId: FolderId | "root" = "root",
  ) => {
    const typeDef = documentTypes[typeId];
    const title = typeDef ? `Untitled ${typeDef.name}` : "Untitled";
    const id = createDocument(title, "", typeId, [], parentId);
    onSelect(id);
  };

  const handleCreateFolder = (parentId: FolderId | "root" = "root") => {
    createFolder("New Folder", parentId);
  };

  const filteredDocuments = Object.values(documents).filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.content || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  const rootDocuments = Object.values(documents).filter(
    (doc) => !doc.parentId || doc.parentId === "root",
  );
  const rootFolders = Object.values(folders).filter(
    (f) => !f.parentId || f.parentId === "root",
  );

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="p-4 border-b border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-100">Documents</h1>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-400 hover:text-zinc-100"
              onClick={() => handleCreateFolder("root")}
            >
              <FolderPlus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-400 hover:text-zinc-100"
              onClick={() => handleCreateDocument()}
            >
              <Plus className="size-4" />
            </Button>
          </div>
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
        {searchTerm ? (
          <div className="space-y-1">
            {filteredDocuments.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                No matching documents found
              </div>
            ) : (
              filteredDocuments.map((doc) => (
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
        ) : (
          <div className="space-y-1">
            {rootFolders.map((folder) => (
              <FolderListItem
                key={folder.id}
                folder={folder}
                currentDocumentId={currentDocumentId}
                onSelect={onSelect}
                onCreateDocument={handleCreateDocument}
                onCreateFolder={handleCreateFolder}
                formatDate={formatDate}
              />
            ))}
            {rootDocuments.map((doc) => (
              <DocumentListItem
                key={doc.id}
                document={doc}
                isActive={doc.id === currentDocumentId}
                onSelect={() => onSelect(doc.id)}
                formatDate={formatDate}
              />
            ))}
            {rootFolders.length === 0 && rootDocuments.length === 0 && (
              <div className="p-4 text-center text-zinc-500 text-sm">
                No documents yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface FolderListItemProps {
  folder: Folder;
  currentDocumentId?: DocumentId;
  onSelect: (id: DocumentId) => void;
  onCreateDocument: (typeId: string, parentId: FolderId | "root") => void;
  onCreateFolder: (parentId: FolderId | "root") => void;
  formatDate: (date: Date) => string;
  depth?: number;
}

function FolderListItem({
  folder,
  currentDocumentId,
  onSelect,
  onCreateDocument,
  onCreateFolder,
  formatDate,
  depth = 0,
}: FolderListItemProps) {
  const documents = use$(documentStore$.documents);
  const folders = use$(documentStore$.folders);
  const _documentTypes = use$(documentStore$.documentTypes);

  const [isRenaming, setIsRenaming] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const childDocuments = Object.values(documents).filter(
    (doc) => doc.parentId === folder.id,
  );
  const childFolders = Object.values(folders).filter(
    (f) => f.parentId === folder.id,
  );

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    updateFolder(folder.id, { isOpen: !folder.isOpen });
  };

  const handleRename = (newName: string) => {
    if (newName.trim()) {
      updateFolder(folder.id, { name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/worldcrafter-item",
      JSON.stringify({ type: "folder", id: folder.id }),
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const data = e.dataTransfer.getData("application/worldcrafter-item");
    if (!data) return;
    const { type, id } = JSON.parse(data);
    if (type === "document") moveDocument(id as DocumentId, folder.id);
    else if (type === "folder" && id !== folder.id)
      moveFolder(id as FolderId, folder.id);
  };

  return (
    <div className="flex flex-col">
      <ContextMenu>
        <ContextMenuTrigger>
          <button
            type="button"
            draggable
            onDragStart={handleDragStart}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={handleToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggle(e);
              }
            }}
            className={`w-full flex items-center gap-2 p-2 rounded-md transition-colors cursor-pointer group text-left ${
              isDragOver ? "bg-zinc-800" : "hover:bg-zinc-800/50"
            }`}
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {folder.isOpen ? (
                <ChevronDown className="size-3.5 text-zinc-500" />
              ) : (
                <ChevronRight className="size-3.5 text-zinc-500" />
              )}
              {folder.isOpen ? (
                <FolderOpen className="size-4 text-blue-400/80" />
              ) : (
                <FolderIcon className="size-4 text-blue-400/80" />
              )}
              {isRenaming ? (
                <Input
                  autoFocus
                  defaultValue={folder.name}
                  onBlur={(e) => handleRename(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(e.currentTarget.value);
                    if (e.key === "Escape") setIsRenaming(false);
                  }}
                  className="h-6 text-xs bg-zinc-800 border-zinc-700 text-zinc-100 px-1"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate text-sm text-zinc-300 group-hover:text-zinc-100">
                  {folder.name || "Untitled Folder"}
                </span>
              )}
            </div>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <ContextMenuItem onClick={() => onCreateFolder(folder.id)}>
            New Subfolder
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onCreateDocument("general", folder.id)}
          >
            New Document
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-zinc-800" />
          <ContextMenuItem onClick={() => setIsRenaming(true)}>
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => deleteFolder(folder.id)}
            className="text-red-400"
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {folder.isOpen && (
        <div className="ml-4 border-l border-zinc-800 pl-1 mt-0.5 space-y-0.5">
          {childFolders.map((f) => (
            <FolderListItem
              key={f.id}
              folder={f}
              currentDocumentId={currentDocumentId}
              onSelect={onSelect}
              onCreateDocument={onCreateDocument}
              onCreateFolder={onCreateFolder}
              formatDate={formatDate}
              depth={depth + 1}
            />
          ))}
          {childDocuments.map((doc) => (
            <DocumentListItem
              key={doc.id}
              document={doc}
              isActive={doc.id === currentDocumentId}
              onSelect={() => onSelect(doc.id)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DocumentListItemProps {
  document: Document;
  isActive: boolean;
  onSelect: () => void;
  formatDate: (date: Date) => string;
}

function DocumentListItem({
  document,
  isActive,
  onSelect,
  formatDate,
}: DocumentListItemProps) {
  const documentTypes = use$(documentStore$.documentTypes);
  const typeDef = documentTypes[document.type] || documentTypes.general;
  const IconComponent = typeDef ? iconMap[typeDef.icon] || FileText : FileText;

  const [isRenaming, setIsRenaming] = useState(false);

  const handleRename = (newTitle: string) => {
    if (newTitle.trim()) {
      updateDocument(document.id, { title: newTitle.trim() });
    }
    setIsRenaming(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/worldcrafter-item",
      JSON.stringify({ type: "document", id: document.id }),
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          type="button"
          draggable
          onDragStart={handleDragStart}
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
            <div className="w-4 shrink-0" />
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
          {!isRenaming && document.content && (
            <p className="text-xs text-zinc-500 line-clamp-1 ml-6">
              {document.content}
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
