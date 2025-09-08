import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { QuickInlineEdit } from "~/components/ui/quick-inline-edit";
import type { Document } from "~/lib/state";

interface DocumentEditorProps {
  document?: Document;
  onSave: (title: string, content: string, tags: string[]) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  isSaving?: boolean;
}

export function DocumentEditor({
  document,
  onSave,
  onCancel,
  onDelete,
  isSaving,
}: DocumentEditorProps) {
  const [title, setTitle] = useState(document?.title || "");
  const [content, setContent] = useState(document?.content || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSave = () => {
    if (!title.trim()) return;
    // Pass empty array for tags since we're removing the tagging system
    onSave(title, content, []);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <QuickInlineEdit
          value={title}
          onChange={setTitle}
          placeholder="Document title"
          className="w-full"
        />
      </div>

      <div className="flex-1 flex flex-col p-4">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 resize-none bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 border-zinc-700 focus:ring-zinc-600"
          placeholder="Start writing your document..."
        />
      </div>

      <div className="p-4 border-t border-zinc-800 flex justify-end space-x-2">
        <Button type="button" onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={!title.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}
