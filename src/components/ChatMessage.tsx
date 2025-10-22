import { use$ } from "@legendapp/state/react";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Edit,
  RefreshCw,
  Settings,
  Trash,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { Editor } from "../editor/Editor";
import { blocks$ } from "../lib/state/block";
import { deleteMessage, regenerateMessage } from "../lib/state/chat";
import { useBlock } from "../lib/state/hooks";
import type { BlockId } from "../lib/state/types";
import { DocumentChipsList } from "./DocumentChips";

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
  isEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  onEditChange?: (newText: string) => void;
}

const MessageBubble = ({
  text,
  role,
  isStreaming,
  isEditing,
  onSave,
  onCancel,
  onEditChange,
}: MessageBubbleProps) => {
  if (isEditing) {
    return (
      <div
        className={`w-full ${role === "user" ? "max-w-[85%]" : "max-w-none"}`}
      >
        <Editor
          value={text}
          onChange={onEditChange}
          onSave={onSave}
          onCancel={onCancel}
          config={{
            placeholder: "Edit your message...",
            showActions: true,
            toolbar: false,
            aiEnabled: false,
          }}
        />
      </div>
    );
  }

  if (role === "user") {
    // User messages: smaller, gray bubble on the left
    return (
      <div className="px-3 py-2 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-850 border border-zinc-700 max-w-[85%]">
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
        {isStreaming ? (
          // During streaming, render plain text to avoid expensive markdown parsing
          <pre className="whitespace-pre-wrap text-zinc-200 font-sans">
            {text}
          </pre>
        ) : (
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
                <h1
                  className="text-xl font-bold mb-3 text-zinc-100"
                  {...props}
                />
              ),
              h2: (props) => (
                <h2
                  className="text-lg font-bold mb-3 text-zinc-100"
                  {...props}
                />
              ),
              h3: (props) => (
                <h3
                  className="text-md font-bold mb-3 text-zinc-100"
                  {...props}
                />
              ),
              ul: (props) => (
                <ul className="list-disc pl-5 mb-3 text-zinc-200" {...props} />
              ),
              ol: (props) => (
                <ol
                  className="list-decimal pl-5 mb-3 text-zinc-200"
                  {...props}
                />
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        )}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-zinc-500 ml-1 animate-pulse"></span>
        )}
      </div>
    );
  }

  interface MessageActionsProps {
    onRegenerate?: () => void;
    onDelete: () => void;
    onEdit?: () => void;
  }

  const MessageActions = ({
    onRegenerate,
    onDelete,
    onEdit,
  }: MessageActionsProps) => (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 ml-auto">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="p-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-gradient-to-br hover:from-zinc-700 hover:to-zinc-800 rounded-sm"
          title="Edit message"
          aria-label="Edit message"
        >
          <Edit size={12} />
        </button>
      )}
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="p-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-gradient-to-br hover:from-zinc-700 hover:to-zinc-800 rounded-sm"
          title="Regenerate response"
          aria-label="Regenerate message"
        >
          <RefreshCw size={12} />
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="p-1 text-xs text-zinc-500 hover:text-red-400 hover:bg-gradient-to-br hover:from-zinc-700 hover:to-zinc-800 rounded-sm"
        title="Delete message"
        aria-label="Delete message"
      >
        <Trash size={12} />
      </button>
    </div>
  );

  interface MessageAttributionProps {
    llmRequests: NonNullable<import("../lib/state/types").Block["llmRequests"]>;
  }

  const MessageAttribution = ({ llmRequests }: MessageAttributionProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (llmRequests.length === 0) return null;

    const latestRequest = llmRequests[llmRequests.length - 1];

    return (
      <div className="mt-2 border-t border-zinc-700 pt-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Settings size={12} />
          <span>LLM Request Details</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {isExpanded && (
          <div className="mt-2 p-3 bg-gradient-to-br from-zinc-800 to-zinc-850 rounded border border-zinc-700">
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-zinc-400">Model:</span>
                  <span className="ml-2 text-zinc-200">
                    {latestRequest.model}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Success:</span>
                  <span
                    className={`ml-2 ${latestRequest.success ? "text-green-400" : "text-red-400"}`}
                  >
                    {latestRequest.success ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-zinc-400">Temperature:</span>
                  <span className="ml-2 text-zinc-200">
                    {latestRequest.parameters.temperature}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Max Tokens:</span>
                  <span className="ml-2 text-zinc-200">
                    {latestRequest.parameters.n_predict}
                  </span>
                </div>
              </div>

              {latestRequest.duration && (
                <div>
                  <span className="text-zinc-400">Duration:</span>
                  <span className="ml-2 text-zinc-200">
                    {latestRequest.duration}ms
                  </span>
                </div>
              )}

              {latestRequest.tokensGenerated && (
                <div>
                  <span className="text-zinc-400">Tokens Generated:</span>
                  <span className="ml-2 text-zinc-200">
                    {latestRequest.tokensGenerated}
                  </span>
                </div>
              )}

              <div>
                <span className="text-zinc-400">Timestamp:</span>
                <span className="ml-2 text-zinc-200">
                  {latestRequest.timestamp.toLocaleString()}
                </span>
              </div>

              {latestRequest.error && (
                <div>
                  <span className="text-zinc-400">Error:</span>
                  <span className="ml-2 text-red-400">
                    {latestRequest.error}
                  </span>
                </div>
              )}

              {llmRequests.length > 1 && (
                <div className="pt-2 border-t border-zinc-600">
                  <span className="text-zinc-400">Total Requests:</span>
                  <span className="ml-2 text-zinc-200">
                    {llmRequests.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
};

export default ChatMessage;
