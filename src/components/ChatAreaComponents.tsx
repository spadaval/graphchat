import { ChatMessage } from "~/components/ChatMessage";
import { useThread } from "~/lib/state/hooks";
import type { ChatId } from "~/lib/state/types";

// Types
interface SamplePrompt {
  id: string;
  text: string;
}

// Constants
const SAMPLE_PROMPTS: SamplePrompt[] = [
  { id: "1", text: "Explain quantum computing in simple terms" },
  { id: "2", text: "How do I make a HTTP request in JavaScript?" },
  { id: "3", text: "What's the difference between React and Vue?" },
  { id: "4", text: "Suggest a good book about machine learning" },
];

// Chat Header Component
interface ChatHeaderProps {
  title: string;
}

export function ChatHeader({ title }: ChatHeaderProps) {
  return (
    <div className="p-4 border-b border-zinc-800 bg-zinc-900">
      <h1 className="text-lg font-semibold text-zinc-100">{title}</h1>
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  sendMessage: (message: string) => void;
}

export function EmptyState({ sendMessage }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-center">
      <h2 className="text-xl font-semibold text-zinc-100 mb-6">
        How can I help you today?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl">
        {SAMPLE_PROMPTS.map((prompt) => (
          <button
            type="button"
            key={prompt.id}
            onClick={(e) => {
              e.preventDefault();
              sendMessage(prompt.text);
            }}
            className="p-3 text-left rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-gradient-to-br from-zinc-800 to-zinc-850 transition-all duration-200 text-zinc-200 text-sm"
          >
            {prompt.text}
          </button>
        ))}
      </div>
    </div>
  );
}

// Messages List Component
interface MessagesListProps {
  threadId: ChatId;
}

export function MessagesList({ threadId }: MessagesListProps) {
  // Fetch the thread to get block IDs
  const thread = useThread(threadId);

  // If no thread, render empty state
  if (!thread) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        <div className="text-center text-zinc-500 py-8 text-sm">
          No messages yet. Start a conversation!
        </div>
      </div>
    );
  }

  const blockIds = thread.messages;

  // Find the last assistant block that is still generating
  // We'll need to check this logic later, for now we'll keep it simple
  const _streamingBlockId = undefined;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
      {blockIds.map((blockId) => (
        <ChatMessage key={blockId} blockId={blockId} isStreaming={false} />
      ))}
      {blockIds.length === 0 && (
        <div className="text-center text-zinc-500 py-8 text-sm">
          No messages yet. Start a conversation!
        </div>
      )}
    </div>
  );
}
