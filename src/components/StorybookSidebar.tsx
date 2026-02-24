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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Document, Folder } from "~/lib/state/documents";
import {
  createDocument,
  createFolder,
  DocumentIcon,
  deleteDocument,
  deleteFolder,
  documentStore$,
  getDocumentTypeDisplayId,
  moveDocument,
  moveFolder,
  updateDocument,
  updateFolder,
} from "~/lib/state/documents";
import type { DocumentId, FolderId } from "~/lib/state/types";
import { worldStore$ } from "~/lib/state/worlds";
import { WorldSwitcher } from "./WorldSwitcher";

interface StorybookSidebarProps {
  activeDocumentId: DocumentId | undefined;
  onSelectDocument: (id: DocumentId) => void;
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

export function StorybookSidebar({
  activeDocumentId,
  onSelectDocument,
}: StorybookSidebarProps) {
  const documents = use$(documentStore$.documents);
  const folders = use$(documentStore$.folders);
  const documentTypes = use$(documentStore$.documentTypes);
  const currentWorldId = use$(worldStore$.currentWorldId);

  const [changeTypeDocId, setChangeTypeDocId] = useState<DocumentId | null>(
    null,
  );

  const handleCreateDocument = (
    typeId: string,
    parentId: FolderId | "root" = "root",
  ) => {
    const typeDef = documentTypes[typeId];
    const title = typeDef ? `Untitled ${typeDef.name}` : "Untitled";
    const id = createDocument(title, "", typeId, [], parentId);
    onSelectDocument(id);
  };

  const handleCreateFolder = (parentId: FolderId | "root" = "root") => {
    createFolder("New Folder", parentId);
  };

  const handleChangeType = (typeId: string) => {
    if (changeTypeDocId) {
      updateDocument(changeTypeDocId, { type: typeId });
      setChangeTypeDocId(null);
    }
  };

  // Get root items for current world
  const rootDocuments = Object.values(documents).filter(
    (doc) =>
      (!doc.parentId || doc.parentId === "root") &&
      doc.worldId === currentWorldId,
  );
  const rootFolders = Object.values(folders).filter(
    (f) =>
      (!f.parentId || f.parentId === "root") && f.worldId === currentWorldId,
  );

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      <WorldSwitcher />
      <div className="p-4 border-b border-zinc-800 pt-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-100 uppercase tracking-widest text-[10px] opacity-50">
            Content
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-zinc-400 hover:text-zinc-100"
                  onClick={() => handleCreateFolder("root")}
                >
                  <FolderPlus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-800 text-zinc-100 border-zinc-700">
                New Folder
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
            >
              <Plus className="size-4" />
              New Document
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 bg-zinc-800 border-zinc-700 text-zinc-100"
          >
            {Object.values(documentTypes).map((type) => {
              const IconComponent = iconMap[type.icon] || FileText;
              return (
                <DropdownMenuItem
                  key={type.id}
                  onClick={() => handleCreateDocument(type.id)}
                  className="cursor-pointer hover:bg-zinc-700 focus:bg-zinc-700 focus:text-zinc-100"
                >
                  <span className="mr-2">
                    <IconComponent className="size-4" />
                  </span>
                  {type.name}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        <section
          className="space-y-1 h-full"
          aria-label="Document list"
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add("bg-zinc-800/20");
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove("bg-zinc-800/20");
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("bg-zinc-800/20");
            const data = e.dataTransfer.getData(
              "application/worldcrafter-item",
            );
            if (!data) return;
            const { type, id } = JSON.parse(data);
            if (type === "document") moveDocument(id as DocumentId, "root");
            else if (type === "folder") moveFolder(id as FolderId, "root");
          }}
        >
          {rootFolders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              activeDocumentId={activeDocumentId}
              onSelectDocument={onSelectDocument}
              setChangeTypeDocId={setChangeTypeDocId}
              onCreateDocument={handleCreateDocument}
              onCreateFolder={handleCreateFolder}
            />
          ))}
          {rootDocuments.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              isActive={doc.id === activeDocumentId}
              onClick={() => onSelectDocument(doc.id)}
              onChangeTypeRequest={() => setChangeTypeDocId(doc.id)}
            />
          ))}
          {rootFolders.length === 0 && rootDocuments.length === 0 && (
            <div className="text-zinc-500 text-sm text-center mt-4">
              No documents yet.
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={!!changeTypeDocId}
        onOpenChange={(open) => !open && setChangeTypeDocId(null)}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Change Document Type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1 py-2">
            {Object.values(documentTypes).map((type) => {
              const IconComponent = iconMap[type.icon] || FileText;
              return (
                <Button
                  key={type.id}
                  variant="ghost"
                  onClick={() => handleChangeType(type.id)}
                  className="justify-start hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100"
                >
                  <IconComponent className="mr-2 size-4 opacity-70" />
                  {type.name}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FolderItemProps {
  folder: Folder;
  activeDocumentId: DocumentId | undefined;
  onSelectDocument: (id: DocumentId) => void;
  setChangeTypeDocId: (id: DocumentId) => void;
  onCreateDocument: (typeId: string, parentId: FolderId | "root") => void;
  onCreateFolder: (parentId: FolderId | "root") => void;
  depth?: number;
}

function FolderItem({
  folder,
  activeDocumentId,
  onSelectDocument,
  setChangeTypeDocId,
  onCreateDocument,
  onCreateFolder,
  depth = 0,
}: FolderItemProps) {
  const documents = use$(documentStore$.documents);
  const folders = use$(documentStore$.folders);
  const documentTypes = use$(documentStore$.documentTypes);

  const [isRenaming, setIsRenaming] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const childDocuments = Object.values(documents).filter(
    (doc) => doc.parentId === folder.id && doc.worldId === folder.worldId,
  );
  const childFolders = Object.values(folders).filter(
    (f) => f.parentId === folder.id && f.worldId === folder.worldId,
  );

  const handleRename = (newName: string) => {
    if (newName.trim()) {
      updateFolder(folder.id, { name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    updateFolder(folder.id, { isOpen: !folder.isOpen });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/worldcrafter-item",
      JSON.stringify({ type: "folder", id: folder.id }),
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const data = e.dataTransfer.getData("application/worldcrafter-item");
    if (!data) return;
    const { type, id } = JSON.parse(data);
    if (type === "document") moveDocument(id as DocumentId, folder.id);
    else if (type === "folder") {
      if (id !== folder.id) moveFolder(id as FolderId, folder.id);
    }
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
            className={`w-full flex items-center gap-1 p-2 rounded-md text-sm transition-colors cursor-pointer group text-left ${
              isDragOver
                ? "bg-zinc-800/50 outline-2 outline-dashed outline-zinc-700"
                : "hover:bg-zinc-800/30"
            }`}
            onClick={handleToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggle(e);
              }
            }}
          >
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {folder.isOpen ? (
                <ChevronDown className="size-3.5 text-zinc-500" />
              ) : (
                <ChevronRight className="size-3.5 text-zinc-500" />
              )}
              {folder.isOpen ? (
                <FolderOpen className="size-4 text-blue-400 shrink-0" />
              ) : (
                <FolderIcon className="size-4 text-blue-400 shrink-0" />
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
                  className="h-6 text-xs bg-zinc-800 border-zinc-700 text-zinc-100 focus-visible:ring-zinc-600 px-1"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate text-zinc-300 group-hover:text-zinc-100">
                  {folder.name || "Untitled Folder"}
                </span>
              )}
            </div>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <ContextMenuItem
            onClick={() => onCreateFolder(folder.id)}
            className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
          >
            New Subfolder
          </ContextMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ContextMenuItem
                onSelect={(e) => e.preventDefault()}
                className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer flex justify-between items-center"
              >
                New Document
                <ChevronRight className="size-3 ml-2 opacity-50" />
              </ContextMenuItem>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="start"
              className="w-48 bg-zinc-800 border-zinc-700 text-zinc-100"
            >
              {Object.values(documentTypes).map((type) => {
                const IconComponent = iconMap[type.icon] || FileText;
                return (
                  <DropdownMenuItem
                    key={type.id}
                    onClick={() => {
                      onCreateDocument(type.id, folder.id);
                      updateFolder(folder.id, { isOpen: true });
                    }}
                    className="cursor-pointer hover:bg-zinc-700 focus:bg-zinc-700 focus:text-zinc-100"
                  >
                    <span className="mr-2">
                      <IconComponent className="size-4" />
                    </span>
                    {type.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <ContextMenuSeparator className="bg-zinc-800" />
          <ContextMenuItem
            onClick={() => setIsRenaming(true)}
            className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
          >
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => deleteFolder(folder.id)}
            className="text-red-500 focus:text-red-400 focus:bg-zinc-800 cursor-pointer"
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {folder.isOpen && (
        <div className="ml-4 border-l border-zinc-800 pl-1 mt-0.5 space-y-0.5">
          {childFolders.map((f) => (
            <FolderItem
              key={f.id}
              folder={f}
              activeDocumentId={activeDocumentId}
              onSelectDocument={onSelectDocument}
              setChangeTypeDocId={setChangeTypeDocId}
              onCreateDocument={onCreateDocument}
              onCreateFolder={onCreateFolder}
              depth={depth + 1}
            />
          ))}
          {childDocuments.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              isActive={doc.id === activeDocumentId}
              onClick={() => onSelectDocument(doc.id)}
              onChangeTypeRequest={() => setChangeTypeDocId(doc.id)}
            />
          ))}
          {childFolders.length === 0 && childDocuments.length === 0 && (
            <div className="text-zinc-600 text-[10px] pl-6 py-1 italic">
              Empty
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface DocumentItemProps {
  document: Document;
  isActive: boolean;
  onClick: () => void;
  onChangeTypeRequest: () => void;
}

function DocumentItem({
  document,
  isActive,
  onClick,
  onChangeTypeRequest,
}: DocumentItemProps) {
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

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/worldcrafter-item",
      JSON.stringify({ type: "document", id: document.id }),
    );
    e.dataTransfer.effectAllowed = "move";
  };

  if (isRenaming) {
    return (
      <div className="px-2 py-1 ml-4">
        <Input
          autoFocus
          defaultValue={document.title}
          onBlur={(e) => handleRename(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename(e.currentTarget.value);
            if (e.key === "Escape") setIsRenaming(false);
          }}
          className="h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-100 focus-visible:ring-zinc-600"
        />
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                draggable
                onDragStart={handleDragStart}
                onClick={onClick}
                className={`w-full flex items-center gap-2 p-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100 font-medium"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <div className="w-4 shrink-0" />
                <span className="shrink-0 opacity-70">
                  <IconComponent className="size-4" />
                </span>
                <span className="truncate">{document.title || "Untitled"}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="bg-zinc-900 border-zinc-800 text-zinc-300"
            >
              <p>{document.title || "Untitled"}</p>
              <p className="text-xs text-zinc-500 capitalize">
                {typeDef ? typeDef.name : document.baseTypeId || "general"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <ContextMenuItem
          onClick={() => setIsRenaming(true)}
          className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
        >
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onChangeTypeRequest}
          className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
        >
          Change Type...
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-zinc-800" />
        <ContextMenuItem
          onClick={() => deleteDocument(document.id)}
          className="text-red-500 focus:text-red-400 focus:bg-zinc-800 cursor-pointer"
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
