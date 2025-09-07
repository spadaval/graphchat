import { ChatMessage } from "~/components/ChatMessage";
import { useThread } from "~/lib/state/hooks";
import type { Block } from "~/lib/state";

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
    <div className="p-4 border-b border-gray-800 bg-gray-900">
      <h1 className="text-xl font-semibold text-gray-100">{title}</h1>
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
      <h2 className="text-2xl font-semibold text-gray-100 mb-6">
        How can I help you today?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        {SAMPLE_PROMPTS.map((prompt) => (
          <button
            type="button"
            key={prompt.id}
            onClick={(e) => {
              e.preventDefault();
              sendMessage(prompt.text);
            }}
            className="p-4 text-left rounded-lg border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-colors duration-200 text-gray-200"
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
  threadId: string;
}

export function MessagesList({ threadId }: MessagesListProps) {
  // Fetch the thread to get block IDs
  const thread = useThread(threadId);
  
  // If no thread, render empty state
  if (!thread) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        <div className="text-center text-gray-400 py-8">
          No messages yet. Start a conversation!
        </div>
      </div>
    );
  }
  
  const blockIds = thread.messages;
  
  // Find the last assistant block that is still generating
  // We'll need to check this logic later, for now we'll keep it simple
  const streamingBlockId = undefined;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
      {blockIds.map((blockId) => (
        <ChatMessage key={blockId} blockId={blockId} isStreaming={false} />
      ))}
      {blockIds.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No messages yet. Start a conversation!
        </div>
      )}
    </div>
  );
}