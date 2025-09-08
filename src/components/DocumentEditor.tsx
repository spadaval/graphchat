import { useEffect, useRef } from "react";
import { use$ } from "@legendapp/state/react";
import type { Observable } from "@legendapp/state";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { QuickInlineEdit } from "~/components/ui/quick-inline-edit";
import type { Document } from "~/lib/state";
import type { DocumentId } from "~/lib/state/types";

interface DocumentEditorProps {
  document$: Observable<Document>;
  onSave: (title: string, content: string, tags: string[]) => void;
  onCancel: () => void;
  onDelete?: (id: DocumentId) => void;
}

export function DocumentEditor({
  document$,
  onSave,
  onCancel,
  onDelete,
}: DocumentEditorProps) {
  // Always use use$ hook to avoid conditional hook usage
  const document = use$(document$);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [document.content]);

  const handleSave = () => {
    if (!document.title.trim()) return;
    // Pass empty array for tags since we're removing the tagging system
    onSave(document.title, document.content, []);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <QuickInlineEdit
          value$={document$.title}
          placeholder="Document title"
          className="flex-1"
        />
        <div className="flex items-center space-x-2 ml-4">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(document.id)}
              className="px-3 py-1 bg-red-700 hover:bg-red-600 text-zinc-200 rounded text-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4">
        <Textarea
          ref={textareaRef}
          value={use$(document$.content)}
          onChange={(e) => document$.content.set(e.target.value)}
          className="flex-1 resize-none bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 border-zinc-700 focus:ring-zinc-600"
          placeholder="Start writing your document..."
        />
      </div>

      <div className="p-4 border-t border-zinc-800 flex justify-end space-x-2">
        <Button type="button" onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={handleSave} 
          disabled={!document.title?.trim()}
        >
          Save
        </Button>
      </div>
    </div>
  );
}