import { 
  X,
  FileText, 
  Map, 
  User, 
  Sparkles, 
  Ghost, 
  Building, 
  Book, 
  Scroll 
} from "lucide-react";
import { PlateDocumentEditor } from "~/components/editor/PlateDocumentEditor";
import { documentStore$, DocumentIcon } from "~/lib/state/documents";
import type { DocumentId } from "~/lib/state/types";
import { use$ } from "@legendapp/state/react";

interface StorybookEditorProps {
  openDocumentIds: DocumentId[];
  activeDocumentId: DocumentId | undefined;
  onSelectDocument: (id: DocumentId) => void;
  onCloseDocument: (id: DocumentId) => void;
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

export function StorybookEditor({
  openDocumentIds,
  activeDocumentId,
  onSelectDocument,
  onCloseDocument,
}: StorybookEditorProps) {
  if (openDocumentIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-500">
        <p>Select a document to start editing</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
      {/* Tabs */}
      <div className="flex items-center bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
        {openDocumentIds.map((id) => (
          <Tab
            key={id}
            id={id}
            isActive={id === activeDocumentId}
            onClick={() => onSelectDocument(id)}
            onClose={(e) => {
              e.stopPropagation();
              onCloseDocument(id);
            }}
          />
        ))}
      </div>

      {/* Editor Area */}
      <div className="flex-1 min-h-0 relative">
        {activeDocumentId && (
          <PlateDocumentEditor
            key={activeDocumentId} // Force re-mount on doc switch to ensure clean state if needed, though observable should handle it.
            document$={documentStore$.documents[activeDocumentId]}
          />
        )}
      </div>
    </div>
  );
}

interface TabProps {
  id: DocumentId;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}

function Tab({ id, isActive, onClick, onClose }: TabProps) {
  const document = use$(documentStore$.documents[id]);
  const documentTypes = use$(documentStore$.documentTypes);
  
  const title = document?.title || "Untitled";
  
  const typeDef = document && (documentTypes[document.type] || documentTypes["general"]);
  const IconComponent = typeDef ? (iconMap[typeDef.icon] || FileText) : FileText;

  return (
    <div
      onClick={onClick}
      className={`
        group flex items-center gap-2 px-4 py-2 text-sm border-r border-zinc-800 cursor-pointer select-none min-w-[120px] max-w-[200px]
        ${isActive ? "bg-zinc-800 text-zinc-100" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"}
      `}
    >
      <IconComponent className="size-3 shrink-0 opacity-70" />
      <span className="truncate flex-1">{title}</span>
      <button
        type="button"
        onClick={onClose}
        className={`p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-zinc-700 ${isActive ? "opacity-100" : ""}`}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
