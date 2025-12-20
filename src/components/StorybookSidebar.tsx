import { use$ } from "@legendapp/state/react";
import { 
  Plus, 
  FileText, 
  Map, 
  User, 
  Sparkles, 
  Ghost, 
  Building, 
  Book, 
  Scroll 
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
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
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { createDocument, deleteDocument, updateDocument, documentStore$, DocumentIcon } from "~/lib/state/documents";
import type { Document } from "~/lib/state/documents";
import type { DocumentId } from "~/lib/state/types";

interface StorybookSidebarProps {
  activeDocumentId: DocumentId | undefined;
  onSelectDocument: (id: DocumentId) => void;
}

const iconMap: Record<DocumentIcon, React.ComponentType<{ className?: string }>> = {
  [DocumentIcon.FileText]: FileText,
  [DocumentIcon.User]: User,
  [DocumentIcon.Map]: Map,
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
  const documentsList = Object.values(documents);
  
  const [changeTypeDocId, setChangeTypeDocId] = useState<DocumentId | null>(null);

  const handleCreateDocument = (typeId: string) => {
    const typeDef = documentTypes[typeId];
    const title = typeDef ? "Untitled " + typeDef.name : "Untitled";
    const id = createDocument(title, "", typeId);
    onSelectDocument(id);
  };

  const handleChangeType = (typeId: string) => {
    if (changeTypeDocId) {
      updateDocument(changeTypeDocId, { type: typeId });
      setChangeTypeDocId(null);
    }
  };

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">Storybook</h2>
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
          <DropdownMenuContent align="start" className="w-56 bg-zinc-800 border-zinc-700 text-zinc-100">
            {Object.values(documentTypes).map((type) => {
              const IconComponent = iconMap[type.icon] || FileText;
              return (
                <DropdownMenuItem
                  key={type.id}
                  onClick={() => handleCreateDocument(type.id)}
                  className="cursor-pointer hover:bg-zinc-700 focus:bg-zinc-700 focus:text-zinc-100"
                >
                  <span className="mr-2"><IconComponent className="size-4" /></span>
                  {type.name}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {documentsList.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center mt-4">
            No documents yet.
          </div>
        ) : (
          <div className="space-y-1">
            {documentsList.map((doc) => (
              <DocumentItem
                key={doc.id}
                document={doc}
                isActive={doc.id === activeDocumentId}
                onClick={() => onSelectDocument(doc.id)}
                onChangeTypeRequest={() => setChangeTypeDocId(doc.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!changeTypeDocId} onOpenChange={(open) => !open && setChangeTypeDocId(null)}>
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

interface DocumentItemProps {
  document: Document;
  isActive: boolean;
  onClick: () => void;
  onChangeTypeRequest: () => void;
}

function DocumentItem({ document, isActive, onClick, onChangeTypeRequest }: DocumentItemProps) {
  const documentTypes = use$(documentStore$.documentTypes);
  const typeDef = documentTypes[document.type] || documentTypes["general"];
  const IconComponent = typeDef ? (iconMap[typeDef.icon] || FileText) : FileText;
  
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
                onClick={onClick}
                className={`w-full flex items-center gap-2 p-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100 font-medium"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <span className="shrink-0 opacity-70"><IconComponent className="size-4" /></span>
                <span className="truncate">{document.title || "Untitled"}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-zinc-900 border-zinc-800 text-zinc-300">
              <p>{document.title || "Untitled"}</p>
              <p className="text-xs text-zinc-500 capitalize">{typeDef ? typeDef.name : (document.type || "general")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <ContextMenuItem onClick={() => setIsRenaming(true)} className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={onChangeTypeRequest} className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
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
