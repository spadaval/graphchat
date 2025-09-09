import { Bot, RefreshCw, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { useBlock } from "../lib/state/hooks";
import { regenerateMessage } from "../lib/state/chat";
import { DocumentChipsList } from "./DocumentChips";
import type { BlockId } from "../lib/state/types";

type CodeProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & { className?: string };

type AnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>;

interface ChatMessageProps {
  blockId: BlockId;
  isStreaming: boolean;
}

interface MessageAvatarProps {
  role: "user" | "assistant";
}

const MessageAvatar = ({ role }: MessageAvatarProps) => (
  <span
    className={`w-7 h-7 rounded-full flex items-center justify-center text-zinc-300 text-xs font-medium flex-shrink-0 ${
      role === "user"
        ? "bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600"
        : "bg-gradient-to-br from-zinc-800 to-zinc-850 border border-zinc-700"
    }`}
  >
    {role === "user" ? <User size={14} /> : <Bot size={14} />}
  </span>
);

interface MessageBubbleProps {
  text: string;
  role: "user" | "assistant";
  isStreaming: boolean;
}

const MessageBubble = ({ text, role, isStreaming }: MessageBubbleProps) => {
  if (role === "user") {
    // User messages: smaller, gray bubble on the right
    return (
      <div className="px-3 py-2 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-850 border border-zinc-700 max-w-[85%] ml-auto">
        <ReactMarkdown
          rehypePlugins={[rehypeRaw, rehypeHighlight]}
          components={{
            code({ className, children, ...props }: CodeProps) {
              const isInline = !className?.includes("language-");
              return !isInline ? (
                <pre className="bg-gradient-to-br from-zinc-900 to-zinc-850 p-3 rounded overflow-x-auto text-xs">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code
                  className="bg-zinc-700 px-1 py-0.5 rounded text-xs"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            a: (props: AnchorProps) => (
              <a
                className="text-blue-400 hover:text-blue-300 underline text-sm"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
          }}
        >
          {text}
        </ReactMarkdown>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-zinc-400 ml-1 animate-pulse"></span>
        )}
      </div>
    );
  } else {
    // Assistant messages: no bubble, just text
    return (
      <div className="w-full max-w-none prose prose-invert">
        <ReactMarkdown
          rehypePlugins={[rehypeRaw, rehypeHighlight]}
          components={{
            code({ className, children, ...props }: CodeProps) {
              const isInline = !className?.includes("language-");
              return !isInline ? (
                <pre className="bg-gradient-to-br from-zinc-900 to-zinc-850 p-4 rounded overflow-x-auto">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code className="bg-zinc-800 px-1 py-0.5 rounded" {...props}>
                  {children}
                </code>
              );
            },
            a: (props: AnchorProps) => (
              <a
                className="text-blue-400 hover:text-blue-300 underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
            p: (props) => <p className="mb-3 text-zinc-200" {...props} />,
            h1: (props) => (
              <h1 className="text-xl font-bold mb-3 text-zinc-100" {...props} />
            ),
            h2: (props) => (
              <h2 className="text-lg font-bold mb-3 text-zinc-100" {...props} />
            ),
            h3: (props) => (
              <h3 className="text-md font-bold mb-3 text-zinc-100" {...props} />
            ),
            ul: (props) => (
              <ul className="list-disc pl-5 mb-3 text-zinc-200" {...props} />
            ),
            ol: (props) => (
              <ol className="list-decimal pl-5 mb-3 text-zinc-200" {...props} />
            ),
          }}
        >
          {text}
        </ReactMarkdown>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-zinc-500 ml-1 animate-pulse"></span>
        )}
      </div>
    );
  }
};

interface MessageActionsProps {
  onRegenerate: () => void;
}

const MessageActions = ({
  onRegenerate,
}: MessageActionsProps) => (
  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 ml-auto">
    <button
      type="button"
      onClick={onRegenerate}
      className="p-1 text-xs text-zinc-500 hover:text-zinc-300 bg-gradient-to-br from-zinc-800 to-zinc-850 hover:from-zinc-700 hover:to-zinc-800 rounded flex items-center border border-zinc-700"
      title="Regenerate response"
      aria-label="Regenerate message"
    >
      <RefreshCw size={12} />
    </button>
  </div>
);

export function ChatMessage({ blockId, isStreaming }: ChatMessageProps) {
  // Fetch the specific block
  const block = useBlock(blockId);

  // If block not found, render nothing
  if (!block) return null;

  const isUser = block.role === "user";

  return (
    <div
      className={`flex items-start gap-3 transform transition-all duration-300 ease-out group ${isUser ? "flex-row-reverse" : ""}`}
    >
      <MessageAvatar role={block.role} />

      <div className="flex flex-col w-full min-w-0">
        {/* Document attachments for user messages */}
        {isUser && block.linkedDocuments.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-zinc-400 mb-1">Attached documents:</div>
            <DocumentChipsList
              documentIds={block.linkedDocuments}
              showRemove={false}
            />
          </div>
        )}
        
        <MessageBubble
          text={block.text}
          role={block.role}
          isStreaming={isStreaming && block.isGenerating}
        />

        {!isUser && (
          <div className="flex justify-end mt-1">
            <MessageActions
              onRegenerate={() => {
                regenerateMessage(blockId);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
