"use client";

import { Lock } from "lucide-react";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

import { cn } from "~/lib/utils";

export function AISegmentElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      className={cn("group/ai-segment relative my-2", className)}
    >
      <div
        className="rounded-md border border-blue-900/50 bg-blue-950/30 px-3 py-2"
        contentEditable={false}
      >
        <div
          className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-wide text-blue-300/80"
          contentEditable={false}
        >
          <Lock className="size-3" />
          AI Segment (Locked)
        </div>
        <div className="whitespace-pre-wrap break-words text-zinc-200">
          {children}
        </div>
      </div>
    </PlateElement>
  );
}
