import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { nextVariant, regenerateMessage } from "../lib/state/chat";
import type { ChatMessage as ChatMessageType } from "../lib/state/llm";
import "highlight.js/styles/github-dark.css";
import { Bot, RefreshCw, RotateCcw, User } from "lucide-react";

type CodeProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & { className?: string };

type AnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>;

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming: boolean;
}

interface MessageAvatarProps {
  role: "user" | "assistant";
}

const MessageAvatar = ({ role }: MessageAvatarProps) => (
  <span
    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${
      role === "user" ? "bg-blue-500" : "bg-green-500"
    }`}
  >
    {role === "user" ? <User size={16} /> : <Bot size={16} />}
  </span>
);

interface MessageBubbleProps {
  text: string;
  role: "user" | "assistant";
  isStreaming: boolean;
}

const MessageBubble = ({ text, role, isStreaming }: MessageBubbleProps) => (
  <div
    className={`w-[90%] px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-md prose prose-invert max-w-none rounded-bl-none ${
      role === "user"
        ? "bg-blue-600 text-white hover:bg-blue-700"
        : "bg-gray-800 text-gray-100 border border-gray-600 hover:shadow-md hover:bg-gray-700"
    }`}
  >
    <ReactMarkdown
      rehypePlugins={[rehypeRaw, rehypeHighlight]}
      components={{
        code({ className, children, ...props }: CodeProps) {
          const isInline = !className?.includes("language-");
          return !isInline ? (
            <pre className="bg-gray-900 p-4 rounded overflow-x-auto">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          ) : (
            <code className="bg-gray-700 px-1 py-0.5 rounded" {...props}>
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
      }}
    >
      {text}
    </ReactMarkdown>
    {isStreaming && (
      <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
    )}
  </div>
);

interface MessageActionsProps {
  hasMultipleVariants: boolean;
  variantsCount: number;
  onNextVariant: () => void;
  onRegenerate: () => void;
}

const MessageActions = ({
  hasMultipleVariants,
  variantsCount,
  onNextVariant,
  onRegenerate,
}: MessageActionsProps) => (
  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
    <button
      type="button"
      onClick={onNextVariant}
      className="p-1 text-xs text-gray-400 hover:text-white bg-gray-800 rounded flex items-center gap-1"
      title="Show variants"
      aria-label="Show message variants"
    >
      <RotateCcw size={14} />
      {hasMultipleVariants && <span>({variantsCount})</span>}
    </button>
    <button
      type="button"
      onClick={onRegenerate}
      className="p-1 text-xs text-gray-400 hover:text-white bg-gray-800 rounded flex items-center"
      title="Regenerate response"
      aria-label="Regenerate message"
    >
      <RefreshCw size={14} />
    </button>
  </div>
);

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const currentVariant =
    message.variants.find((v) => v.id === message.currentVariantId) ||
    message.variants[0];
  const hasMultipleVariants = message.variants.length > 1;
  const isUser = message.role === "user";

  return (
    <div className="flex items-start gap-3 justify-start transform transition-all duration-300 ease-out group">
      <MessageAvatar role={message.role} />

      <div className="flex flex-col">
        <MessageBubble
          text={currentVariant.text}
          role={message.role}
          isStreaming={isStreaming}
        />

        {!isUser && (
          <div className="flex justify-end mt-1">
            <MessageActions
              hasMultipleVariants={hasMultipleVariants}
              variantsCount={message.variants.length}
              onNextVariant={() => nextVariant(message.id)}
              onRegenerate={() => regenerateMessage(message.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
