import { useNavigate } from "@tanstack/react-router";
import { FileText, X } from "lucide-react";
import { getDocumentById } from "~/lib/state";
import type { DocumentId } from "~/lib/state/types";

interface DocumentChipProps {
  documentId: DocumentId;
  onRemove?: (documentId: DocumentId) => void;
  showRemove?: boolean;
}

export function DocumentChip({
  documentId,
  onRemove,
  showRemove = true,
}: DocumentChipProps) {
  const navigate = useNavigate();
  const document = getDocumentById(documentId);

  if (!document) {
    return null;
  }

  const handleClick = () => {
    navigate({ to: "/", search: { id: documentId } });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(documentId);
  };

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 rounded-md text-xs text-zinc-200 hover:from-zinc-600 hover:to-zinc-700 transition-all duration-200 group">
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1 hover:text-zinc-100 transition-colors"
        title={document.title}
      >
        <FileText size={12} className="text-zinc-400" />
        <span className="truncate max-w-32">{document.title}</span>
      </button>
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="ml-1 p-0.5 rounded hover:bg-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`Remove ${document.title}`}
        >
          <X size={10} className="text-zinc-400 hover:text-zinc-200" />
        </button>
      )}
    </div>
  );
}

interface DocumentChipsListProps {
  documentIds: DocumentId[];
  onRemove?: (documentId: DocumentId) => void;
  showRemove?: boolean;
  className?: string;
}

export function DocumentChipsList({
  documentIds,
  onRemove,
  showRemove = true,
  className = "",
}: DocumentChipsListProps) {
  if (documentIds.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {documentIds.map((documentId) => (
        <DocumentChip
          key={documentId}
          documentId={documentId}
          onRemove={onRemove}
          showRemove={showRemove}
        />
      ))}
    </div>
  );
}
