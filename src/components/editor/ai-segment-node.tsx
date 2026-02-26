"use client";

import { Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCEPT_AI_SEGMENT_EVENT,
  type AcceptAISegmentEventDetail,
  RUN_AI_SEGMENT_EVENT,
  type RunAISegmentEventDetail,
} from "~/components/editor/generate-next-events";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

import { cn } from "~/lib/utils";

export function AISegmentElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  const typedElement = props.element as {
    aiPrompt?: string;
    aiSegmentId?: string;
    aiStatus?: "awaiting_prompt" | "generating" | "ready";
  };
  const aiSegmentId = typedElement.aiSegmentId;
  const aiStatus = typedElement.aiStatus ?? "ready";
  const [instructions, setInstructions] = useState(typedElement.aiPrompt ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isAwaitingPrompt = aiStatus === "awaiting_prompt";
  const isGenerating = aiStatus === "generating";

  useEffect(() => {
    setInstructions(typedElement.aiPrompt ?? "");
  }, [typedElement.aiPrompt]);

  useEffect(() => {
    if (!isAwaitingPrompt) return;
    inputRef.current?.focus();
  }, [isAwaitingPrompt]);

  const trimmedInstructions = useMemo(
    () => instructions.trim(),
    [instructions],
  );

  const dispatchRun = (nextInstructions?: string) => {
    if (!aiSegmentId || typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent<RunAISegmentEventDetail>(RUN_AI_SEGMENT_EVENT, {
        detail: {
          aiSegmentId,
          editorId: props.editor.id,
          instructions: nextInstructions,
        },
      }),
    );
  };

  const dispatchAccept = () => {
    if (!aiSegmentId || typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent<AcceptAISegmentEventDetail>(ACCEPT_AI_SEGMENT_EVENT, {
        detail: {
          aiSegmentId,
          editorId: props.editor.id,
        },
      }),
    );
  };

  return (
    <PlateElement
      {...props}
      className={cn("group/ai-segment relative my-2", className)}
    >
      <div
        className="rounded-md border border-zinc-700/60 bg-zinc-900/35 px-3 py-2"
        contentEditable={false}
      >
        {isAwaitingPrompt ? (
          <div
            className="flex items-center gap-2"
            data-ai-segment-prompt="true"
          >
            <Sparkles className="size-3.5 text-zinc-400" />
            <Input
              ref={inputRef}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key !== "Enter" || event.shiftKey) return;
                event.preventDefault();
                dispatchRun(trimmedInstructions);
              }}
              placeholder="Describe what to generate (optional)"
              className="h-8 border-zinc-700/70 bg-zinc-900/70 text-xs text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap break-words text-zinc-200">
              {children}
            </div>
            <div className="mt-2 flex items-center gap-1 opacity-90">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isGenerating}
                className="h-7 px-2 text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  dispatchRun();
                }}
              >
                {isGenerating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                Retry
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isGenerating}
                className="h-7 px-2 text-zinc-400 hover:bg-zinc-800/70 hover:text-emerald-300"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  dispatchAccept();
                }}
              >
                <Check className="size-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </PlateElement>
  );
}
