import { use$ } from "@legendapp/state/react";
import {
  chatStore$,
  documentLinking$,
  removeDocumentFromCurrentMessage,
} from "~/lib/state";
import { DocumentChipsList } from "./DocumentChips";
import { Editor } from "./editor/Editor";

interface SmartMessageInputProps {
  onSend: (content?: string) => void;
  disabled?: boolean;
}

export function SmartMessageInput({
  onSend,
  disabled,
}: SmartMessageInputProps) {
  const { currentMessageLinks } = use$(documentLinking$);
  const currentUserMessage$ = chatStore$.currentUserMessage;

  const handleSend = () => {
    const message = currentUserMessage$.get();
    if (message?.trim()) {
      onSend(message);
    }
  };

  return (
    <div className="p-4 border-t border-zinc-800 relative">
      {/* Document attachments */}
      {currentMessageLinks.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-zinc-400 mb-2">Attached documents:</div>
          <DocumentChipsList
            documentIds={currentMessageLinks}
            onRemove={removeDocumentFromCurrentMessage}
            showRemove={true}
          />
        </div>
      )}

      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Editor value={currentUserMessage$} disabled={disabled} />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled}
          className="px-5 py-3 bg-gradient-to-br from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 disabled:from-zinc-800 disabled:to-zinc-850 disabled:cursor-not-allowed text-zinc-200 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 text-sm"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
      <div className="mt-2 text-xs text-zinc-500">
        Type @ to reference documents
      </div>
    </div>
  );
}
