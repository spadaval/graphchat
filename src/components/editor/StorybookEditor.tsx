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
  X,
} from "lucide-react";
import { PlateDocumentEditor } from "~/components/editor/PlateDocumentEditor";
import {
  DocumentIcon,
  documentPersistence$,
  documentStore$,
  getDocumentTypeDisplayId,
} from "~/lib/state/documents";
import type { DocumentId } from "~/lib/state/types";

interface StorybookEditorProps {
  openDocumentIds: DocumentId[];
  activeDocumentId: DocumentId | undefined;
  onSelectDocument: (id: DocumentId) => void;
  onCloseDocument: (id: DocumentId) => void;
  topbarRight?: React.ReactNode;
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

export function StorybookEditor({
  openDocumentIds,
  activeDocumentId,
  onSelectDocument,
  onCloseDocument,
  topbarRight,
}: StorybookEditorProps) {
  const { isMigrating, isReady } = use$(documentPersistence$);
  const documents = use$(documentStore$.documents);
  const activeDocument = activeDocumentId ? documents[activeDocumentId] : null;

  if (!isReady || isMigrating) {
    return (
      <div className="wc-editor-paper flex flex-1 items-center justify-center text-slate-300">
        <div className="text-center">
          <p className="wc-title text-lg font-semibold">Loading documents…</p>
          <p className="mt-2 text-xs text-slate-500">
            Migrating legacy markdown to editor model
          </p>
        </div>
      </div>
    );
  }

  if (openDocumentIds.length === 0) {
    return (
      <div className="wc-editor-paper flex flex-1 items-center justify-center text-slate-500">
        <p>Select a document to start editing</p>
      </div>
    );
  }

  return (
    <div className="wc-editor-paper flex min-h-0 min-w-0 flex-1 flex-col border-x border-white/10">
      {/* Tabs */}
      <div className="flex min-w-0 shrink-0 items-center border-b border-white/10 bg-slate-950/45 backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto p-1">
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
        {topbarRight ? (
          <div className="shrink-0 pr-1">{topbarRight}</div>
        ) : null}
      </div>

      {/* Editor Area */}
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
        {activeDocumentId &&
          (activeDocument?.migrationError ? (
            <div className="flex flex-1 items-center justify-center text-slate-300">
              <div className="text-center max-w-md px-6">
                <p className="wc-title text-lg font-semibold text-slate-100">
                  Document migration failed
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  This legacy markdown document could not be converted to the
                  editor model during startup migration.
                </p>
              </div>
            </div>
          ) : (
            <PlateDocumentEditor
              key={activeDocumentId} // Force re-mount on doc switch to ensure clean state if needed, though observable should handle it.
              document$={documentStore$.documents[activeDocumentId]}
            />
          ))}
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

  const typeDef =
    document &&
    (documentTypes[getDocumentTypeDisplayId(document)] ||
      documentTypes[document.baseTypeId] ||
      documentTypes.general);
  const IconComponent = typeDef ? iconMap[typeDef.icon] || FileText : FileText;

  return (
    <div
      className={`
        group flex min-w-[138px] max-w-[220px] select-none items-center gap-2 rounded-lg px-4 py-2 text-sm transition
        ${isActive ? "bg-slate-800/95 text-slate-100 shadow-[0_0_0_1px_rgba(154,191,210,0.25),0_12px_24px_rgba(2,12,21,0.45)]" : "text-slate-400 hover:bg-slate-800/45 hover:text-slate-200"}
      `}
    >
      <button
        type="button"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:text-slate-100"
      >
        <IconComponent className="size-3 shrink-0 opacity-70 text-teal-200" />
        <span className="truncate flex-1">{title}</span>
      </button>
      <button
        type="button"
        onClick={onClose}
        className={`rounded-sm p-0.5 text-slate-400 opacity-0 transition hover:bg-slate-700 hover:text-slate-100 group-hover:opacity-100 ${isActive ? "opacity-100" : ""}`}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
