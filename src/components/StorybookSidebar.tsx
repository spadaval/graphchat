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
    <div className="wc-panel flex h-full w-72 flex-col border-r border-white/10">
      <WorldSwitcher />
      <div className="border-b border-white/10 px-4 pb-4 pt-0">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="wc-title text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Content
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full border border-white/10 text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                  onClick={() => handleCreateFolder("root")}
                >
                  <FolderPlus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="border border-slate-700 bg-slate-900 text-slate-100">
                New Folder
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="wc-title flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200/20 bg-gradient-to-r from-teal-500/80 to-cyan-500/65 p-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/45 transition hover:brightness-110"
            >
              <Plus className="size-4" />
              New Document
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 border border-slate-600 bg-slate-900/95 text-slate-100 backdrop-blur"
          >
            {Object.values(documentTypes).map((type) => {
              const IconComponent = iconMap[type.icon] || FileText;
              return (
                <DropdownMenuItem
                  key={type.id}
                  onClick={() => handleCreateDocument(type.id)}
                  className="cursor-pointer rounded-md hover:bg-slate-700/80 focus:bg-slate-700/80 focus:text-slate-100"
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

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
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
            <div className="mt-4 text-center text-sm text-slate-500">
              No documents yet.
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={!!changeTypeDocId}
        onOpenChange={(open) => !open && setChangeTypeDocId(null)}
      >
        <DialogContent className="border-slate-700 bg-slate-950 text-slate-100 sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="wc-title text-xl">
              Change Document Type
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-1 py-2">
            {Object.values(documentTypes).map((type) => {
              const IconComponent = iconMap[type.icon] || FileText;
              return (
                <Button
                  key={type.id}
                  variant="ghost"
                  onClick={() => handleChangeType(type.id)}
                  className="justify-start text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
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
                ? "bg-cyan-950/30 outline-2 outline-dashed outline-cyan-700/70"
                : "hover:bg-slate-800/45"
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
                <ChevronDown className="size-3.5 text-slate-500" />
              ) : (
                <ChevronRight className="size-3.5 text-slate-500" />
              )}
              {folder.isOpen ? (
                <FolderOpen className="size-4 shrink-0 text-teal-300" />
              ) : (
                <FolderIcon className="size-4 shrink-0 text-cyan-300" />
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
                  className="h-6 border-slate-700 bg-slate-900 text-xs text-slate-100 px-1 focus-visible:ring-cyan-700/60"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate text-slate-300 group-hover:text-slate-100">
                  {folder.name || "Untitled Folder"}
                </span>
              )}
            </div>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="border-slate-700 bg-slate-950 text-slate-100">
          <ContextMenuItem
            onClick={() => onCreateFolder(folder.id)}
            className="cursor-pointer focus:bg-slate-800/75 focus:text-slate-100"
          >
            New Subfolder
          </ContextMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ContextMenuItem
                onSelect={(e) => e.preventDefault()}
                className="flex cursor-pointer items-center justify-between focus:bg-slate-800/75 focus:text-slate-100"
              >
                New Document
                <ChevronRight className="size-3 ml-2 opacity-50" />
              </ContextMenuItem>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="start"
              className="w-48 border border-slate-600 bg-slate-900/95 text-slate-100"
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
                    className="cursor-pointer rounded-md hover:bg-slate-700/80 focus:bg-slate-700/80 focus:text-slate-100"
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
          <ContextMenuSeparator className="bg-slate-700/80" />
          <ContextMenuItem
            onClick={() => setIsRenaming(true)}
            className="cursor-pointer focus:bg-slate-800/75 focus:text-slate-100"
          >
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => deleteFolder(folder.id)}
            className="cursor-pointer text-rose-400 focus:bg-slate-800/75 focus:text-rose-300"
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {folder.isOpen && (
        <div className="mt-0.5 ml-4 space-y-0.5 border-l border-slate-700/70 pl-1">
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
            <div className="py-1 pl-6 text-[10px] italic text-slate-600">
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
          className="h-8 border-slate-700 bg-slate-900 text-sm text-slate-100 focus-visible:ring-cyan-700/60"
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
                    ? "bg-slate-800/85 text-slate-100 font-medium shadow-[0_0_0_1px_rgba(148,189,210,0.24)]"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
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
              className="border border-slate-700 bg-slate-950 text-slate-200"
            >
              <p>{document.title || "Untitled"}</p>
              <p className="text-xs text-slate-500 capitalize">
                {typeDef ? typeDef.name : document.baseTypeId || "general"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ContextMenuTrigger>
      <ContextMenuContent className="border-slate-700 bg-slate-950 text-slate-100">
        <ContextMenuItem
          onClick={() => setIsRenaming(true)}
          className="cursor-pointer focus:bg-slate-800/75 focus:text-slate-100"
        >
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onChangeTypeRequest}
          className="cursor-pointer focus:bg-slate-800/75 focus:text-slate-100"
        >
          Change Type...
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-slate-700/80" />
        <ContextMenuItem
          onClick={() => deleteDocument(document.id)}
          className="cursor-pointer text-rose-400 focus:bg-slate-800/75 focus:text-rose-300"
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
