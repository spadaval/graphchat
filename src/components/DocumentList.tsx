import { useState } from "react";
import { Button } from "~/components/ui/button";
import { use$ } from "@legendapp/state/react";
import { documentStore$, DocumentIcon, updateDocument } from "~/lib/state/documents";
import type { Document } from "~/lib/state";
import type { DocumentId } from "~/lib/state/types";
import {
  FileText,
  Map,
  User,
  Sparkles,
  Ghost,
  Building,
  Book,
  Scroll,
  MoreVertical,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface DocumentListProps {
  documents: Document[];
  currentDocumentId?: DocumentId;
  onCreateNew: () => void;
  onSelect: (documentId: DocumentId) => void;
  onDelete: (id: DocumentId) => void;
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

export function DocumentList({
  documents,
  currentDocumentId,
  onCreateNew,
  onSelect,
  onDelete,
}: DocumentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const documentTypes = use$(documentStore$.documentTypes);
  
  // Rename state
  const [renamingId, setRenamingId] = useState<DocumentId | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  // Change Type state
  const [changingTypeId, setChangingTypeId] = useState<DocumentId | null>(null);
  const [newType, setNewType] = useState("");

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.content || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      onSelect(doc.id);
    }
  };

  const startRenaming = (doc: Document) => {
    setRenamingId(doc.id);
    setRenameTitle(doc.title);
  };

  const saveRename = () => {
    if (renamingId && renameTitle.trim()) {
      updateDocument(renamingId, { title: renameTitle.trim() });
      setRenamingId(null);
      setRenameTitle("");
    } else {
      setRenamingId(null);
    }
  };

  const openChangeTypeDialog = (doc: Document) => {
    setChangingTypeId(doc.id);
    setNewType(doc.type);
  };

  const saveChangeType = () => {
    if (changingTypeId && newType) {
      updateDocument(changingTypeId, { type: newType });
      setChangingTypeId(null);
      setNewType("");
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
            {filteredDocuments.map((doc) => {
              const typeDef = documentTypes[doc.type] || documentTypes["general"];
              const IconComponent = typeDef ? (iconMap[typeDef.icon] || FileText) : FileText;
              const isRenaming = renamingId === doc.id;

              return (
                <ContextMenu key={doc.id}>
                  <ContextMenuTrigger>
                    <li
                      className={`transition-colors ${
                        doc.id === currentDocumentId
                          ? "bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-100 ring-2 ring-zinc-600"
                          : "hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <IconComponent className="size-4 text-zinc-400 shrink-0" />
                            {isRenaming ? (
                              <Input
                                value={renameTitle}
                                onChange={(e) => setRenameTitle(e.target.value)}
                                onBlur={saveRename}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveRename();
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                                autoFocus
                                className="h-7 py-1 px-2 text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <h3
                                className="font-medium text-zinc-100 cursor-pointer hover:text-zinc-300 truncate"
                                onClick={() => onSelect(doc.id)}
                                onKeyDown={(e) => handleEditKeyDown(e, doc)}
                              >
                                {doc.title}
                              </h3>
                            )}
                          </div>
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
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => startRenaming(doc)}>
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => openChangeTypeDialog(doc)}>
                      Change Type
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => onDelete(doc.id)}
                      className="text-red-500 focus:text-red-500"
                    >
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!changingTypeId} onOpenChange={(open) => !open && setChangingTypeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Document Type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(documentTypes).map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = iconMap[type.icon] || FileText;
                          return <Icon className="size-4" />;
                        })()}
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangingTypeId(null)}>
              Cancel
            </Button>
            <Button onClick={saveChangeType}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
