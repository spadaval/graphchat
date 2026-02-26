import { use$ } from "@legendapp/state/react";
import {
  Book,
  Building,
  FileText,
  Ghost,
  Map as MapIcon,
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
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
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
  const documentTypes = use$(documentStore$.documentTypes);
  const currentWorldId = use$(worldStore$.currentWorldId);

  const [changeTypeDocId, setChangeTypeDocId] = useState<DocumentId | null>(
    null,
  );

  const handleCreateDocument = (typeId: string) => {
    const typeDef = documentTypes[typeId];
    const title = typeDef ? `Untitled ${typeDef.name}` : "Untitled";
    const id = createDocument(title, "", typeId, []);
    onSelectDocument(id);
  };

  const handleChangeType = (typeId: string) => {
    if (changeTypeDocId) {
      updateDocument(changeTypeDocId, { type: typeId });
      setChangeTypeDocId(null);
    }
  };

  const documentsInWorld = Object.values(documents).filter(
    (doc) => doc.worldId === currentWorldId,
  );

  return (
    <div className="wc-panel flex h-full w-72 flex-col border-r border-white/10">
      <WorldSwitcher />
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <section
              className="h-full space-y-1 rounded-lg"
              aria-label="Document list"
            >
              {documentsInWorld.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  isActive={doc.id === activeDocumentId}
                  onClick={() => onSelectDocument(doc.id)}
                  onChangeTypeRequest={() => setChangeTypeDocId(doc.id)}
                />
              ))}
              {documentsInWorld.length === 0 && (
                <div className="mt-4 text-center text-sm text-slate-500">
                  Right-click to create a document.
                </div>
              )}
            </section>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56 border-slate-700 bg-slate-950 text-slate-100">
            <ContextMenuSub>
              <ContextMenuSubTrigger className="cursor-pointer focus:bg-slate-800/75 focus:text-slate-100">
                New Document
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-56 border-slate-700 bg-slate-950 text-slate-100">
                {Object.values(documentTypes).map((type) => {
                  const IconComponent = iconMap[type.icon] || FileText;
                  return (
                    <ContextMenuItem
                      key={type.id}
                      onClick={() => handleCreateDocument(type.id)}
                      className="cursor-pointer focus:bg-slate-800/75 focus:text-slate-100"
                    >
                      <IconComponent className="mr-2 size-4 opacity-80" />
                      {type.name}
                    </ContextMenuItem>
                  );
                })}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
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

  if (isRenaming) {
    return (
      <div className="px-2 py-1">
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
                onClick={onClick}
                className={`w-full flex items-center gap-2 p-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-slate-800/85 text-slate-100 font-medium shadow-[0_0_0_1px_rgba(148,189,210,0.24)]"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
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
