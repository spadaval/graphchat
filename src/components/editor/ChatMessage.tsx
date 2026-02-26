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
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { blocks$ } from "~/lib/state/block";
import type { BlockId } from "~/lib/state/types";
import { Editor } from "./Editor";

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
  role: "user" | "assistant" | "system";
}

const _MessageAvatar = ({ role }: MessageAvatarProps) => (
  <span
    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all duration-300 ${
      role === "user"
        ? "bg-white/[0.04] border border-border/40 text-muted-foreground"
        : "bg-primary/10 border border-primary/20 text-primary/80"
    }`}
  >
    {role === "user" ? <User size={14} /> : <Bot size={14} />}
  </span>
);

interface MessageBubbleProps {
  text: string;
  role: "user" | "assistant" | "system";
  isStreaming: boolean;
  isEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  onEditChange?: (newText: string) => void;
}

const _MessageBubble = ({
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
            placeholder: "Type a message...",
            showActions: true,
            toolbar: false,
            aiEnabled: false,
          }}
        />
      </div>
    );
  }

  if (role === "user") {
    // User messages: subtle, soft bubble
    return (
      <div className="px-4 py-2.5 rounded-lg bg-white/[0.02] border border-border/40 max-w-[85%] shadow-sm">
        <ReactMarkdown
          rehypePlugins={[rehypeRaw, rehypeHighlight]}
          components={{
            code({ className, children, ...props }: CodeProps) {
              const isInline = !className?.includes("language-");
              return !isInline ? (
                <pre className="bg-background/40 p-3 rounded border border-border/20 overflow-x-auto text-[13px] font-mono my-2 leading-relaxed">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code
                  className="bg-white/5 px-1.5 py-0.5 rounded text-[12px] font-mono text-primary/70"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            a: (props: AnchorProps) => (
              <a
                className="text-primary/90 hover:text-primary underline underline-offset-4 text-sm transition-colors"
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
          <span className="inline-block w-1 h-3.5 bg-primary/40 ml-1 animate-pulse" />
        )}
      </div>
    );
  } else {
    // Assistant messages: focus-oriented typography
    return (
      <div className="w-full max-w-none prose prose-invert prose-primary/80">
        {isStreaming ? (
          <pre className="whitespace-pre-wrap text-foreground/90 font-sans text-sm leading-relaxed">
            {text}
          </pre>
        ) : (
          <ReactMarkdown
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
            components={{
              code({ className, children, ...props }: CodeProps) {
                const isInline = !className?.includes("language-");
                return !isInline ? (
                  <pre className="bg-background/60 p-4 rounded border border-border/40 overflow-x-auto my-4 text-[13px] leading-relaxed">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code
                    className="bg-white/5 border border-border/20 px-1.5 py-0.5 rounded text-primary/80 font-mono text-[0.9em]"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              a: (props: AnchorProps) => (
                <a
                  className="text-primary/90 hover:text-primary underline underline-offset-4 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              p: (props) => (
                <p
                  className="mb-4 text-foreground/80 leading-relaxed last:mb-0"
                  {...props}
                />
              ),
              h1: (props) => (
                <h1
                  className="wc-title text-xl font-bold mb-5 text-foreground tracking-tight"
                  {...props}
                />
              ),
              h2: (props) => (
                <h2
                  className="wc-title text-lg font-bold mb-4 text-foreground tracking-tight"
                  {...props}
                />
              ),
              h3: (props) => (
                <h3
                  className="text-sm font-bold tracking-wide mb-4 text-foreground/90"
                  {...props}
                />
              ),
              ul: (props) => (
                <ul
                  className="list-disc pl-5 mb-4 text-foreground/70 space-y-1.5"
                  {...props}
                />
              ),
              ol: (props) => (
                <ol
                  className="list-decimal pl-5 mb-4 text-foreground/70 space-y-1.5"
                  {...props}
                />
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        )}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-primary/30 ml-1 animate-pulse" />
        )}
      </div>
    );
  }
};

interface MessageActionsProps {
  onRegenerate?: () => void;
  onDelete: () => void;
  onEdit?: () => void;
}

const _MessageActions = ({
  onRegenerate,
  onDelete,
  onEdit,
}: MessageActionsProps) => (
  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-1 ml-auto">
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 text-muted-foreground/40 hover:text-primary/70 hover:bg-primary/5 rounded transition-colors"
        title="Edit message"
        aria-label="Edit message"
      >
        <Edit size={14} />
      </button>
    )}
    {onRegenerate && (
      <button
        type="button"
        onClick={onRegenerate}
        className="p-1.5 text-muted-foreground/40 hover:text-primary/70 hover:bg-primary/5 rounded transition-colors"
        title="Regenerate response"
        aria-label="Regenerate message"
      >
        <RefreshCw size={14} />
      </button>
    )}
    <button
      type="button"
      onClick={onDelete}
      className="p-1.5 text-muted-foreground/40 hover:text-destructive/70 hover:bg-destructive/5 rounded transition-colors"
      title="Delete message"
      aria-label="Delete message"
    >
      <Trash size={14} />
    </button>
  </div>
);

interface MessageAttributionProps {
  llmRequests: NonNullable<import("~/lib/state/types").Block["llmRequests"]>;
}

const _MessageAttribution = ({ llmRequests }: MessageAttributionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (llmRequests.length === 0) return null;

  const latestRequest = llmRequests[llmRequests.length - 1];

  return (
    <div className="mt-4 border-t border-border/20 pt-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <Settings size={12} className={isExpanded ? "text-primary/60" : ""} />
        <span>Generation Details</span>
        {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {isExpanded && (
        <div className="mt-3 p-4 bg-background/40 rounded border border-border/40 shadow-inner">
          <div className="space-y-4 text-[11px] font-medium">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <span className="text-muted-foreground/50">Model</span>
                <p className="text-foreground/80 truncate">
                  {latestRequest.model}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground/50">Status</span>
                <p
                  className={`${latestRequest.success ? "text-primary/80" : "text-destructive/80"}`}
                >
                  {latestRequest.success ? "Success" : "Failure"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <span className="text-muted-foreground/50">Temperature</span>
                <p className="text-foreground/70">
                  {latestRequest.parameters.temperature}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground/50">Max Tokens</span>
                <p className="text-foreground/70">
                  {latestRequest.parameters.n_predict}
                </p>
              </div>
            </div>

            <div className="flex gap-10">
              {latestRequest.duration && (
                <div className="space-y-1">
                  <span className="text-muted-foreground/50">Latency</span>
                  <p className="text-foreground/70">
                    {latestRequest.duration}ms
                  </p>
                </div>
              )}

              {latestRequest.tokensGenerated && (
                <div className="space-y-1">
                  <span className="text-muted-foreground/50">Throughput</span>
                  <p className="text-foreground/70">
                    {latestRequest.tokensGenerated} tokens
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/20">
              <span className="text-muted-foreground/40">Timestamp</span>
              <p className="text-muted-foreground/60 mt-0.5">
                {latestRequest.timestamp.toLocaleString()}
              </p>
            </div>

            {latestRequest.error && (
              <div className="p-3 bg-destructive/5 border border-destructive/10 rounded">
                <span className="text-destructive/60 text-[10px] font-bold">
                  Error Details
                </span>
                <p className="text-destructive/80 mt-1 whitespace-pre-wrap leading-relaxed">
                  {latestRequest.error}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ChatMessage = ({ blockId, isStreaming }: ChatMessageProps) => {
  const block = blocks$.get()[blockId];
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(block?.text || "");

  if (!block) return null;

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(block.text);
  };

  const handleSave = () => {
    // TODO: Implement edit functionality
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText(block.text);
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
  };

  const handleRegenerate = () => {
    // TODO: Implement regenerate functionality
  };

  return (
    <div className="group flex gap-3">
      <_MessageAvatar role={block.role} />
      <div className="flex-1 min-w-0">
        <_MessageBubble
          text={isEditing ? editText : block.text}
          role={block.role}
          isStreaming={isStreaming}
          isEditing={isEditing}
          onSave={handleSave}
          onCancel={handleCancel}
          onEditChange={setEditText}
        />
        {block.llmRequests && (
          <_MessageAttribution llmRequests={block.llmRequests} />
        )}
      </div>
      <div className="flex-shrink-0">
        <_MessageActions
          onEdit={block.role === "user" ? handleEdit : undefined}
          onRegenerate={
            block.role === "assistant" ? handleRegenerate : undefined
          }
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};

export default ChatMessage;
