import React from "react";
import ChatMessage from "~/components/editor/ChatMessage";
import { blocks$ } from "~/lib/state/block";
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
    <div className="p-4 border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
        <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/80">
          {title}
        </h1>
      </div>
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  sendMessage: (message: string) => void;
}

export function EmptyState({ sendMessage }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center bg-[#0a0a0a]">
      <div className="mb-12 space-y-3">
        <div className="mx-auto h-1 w-8 rounded-full bg-emerald-500/20 mb-6" />
        <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
          Select a Chat
        </h2>
        <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-widest">
          Choose a sample prompt below or start a new session.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {SAMPLE_PROMPTS.map((prompt) => (
          <button
            type="button"
            key={prompt.id}
            onClick={(e) => {
              e.preventDefault();
              sendMessage(prompt.text);
            }}
            className="p-5 text-left rounded-lg border border-zinc-800/50 bg-zinc-900/20 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all duration-300 group shadow-lg"
          >
            <p className="text-zinc-500 group-hover:text-emerald-400 text-xs font-medium transition-colors leading-relaxed">
              {prompt.text}
            </p>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-background">
        <div className="text-center text-muted-foreground/30 py-12 text-xs font-medium">
          No history for this chat
        </div>
      </div>
    );
  }

  const blockIds = thread.messages;

  // Find the last assistant block that is still generating
  const streamingBlockId = blockIds
    .slice()
    .reverse()
    .find((blockId) => {
      const block = blocks$.get()[blockId];
      return block && block.role === "assistant" && block.isGenerating;
    });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 min-h-0 bg-[#0a0a0a] scrollbar-hide">
      {blockIds.map((blockId, index) => (
        <React.Fragment key={blockId}>
          <ChatMessage
            blockId={blockId}
            isStreaming={blockId === streamingBlockId}
          />
          {index < blockIds.length - 1 && (
            <div className="h-px w-full bg-zinc-800/30 my-10" />
          )}
        </React.Fragment>
      ))}
      {blockIds.length === 0 && (
        <div className="text-center text-zinc-700 py-12 text-[10px] font-bold uppercase tracking-widest">
          No messages yet.
        </div>
      )}
    </div>
  );
}
