"use client";

import type { TText } from "platejs";
import type { PlateLeafProps } from "platejs/react";
import { PlateLeaf } from "platejs/react";
import { useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { resolveStrictCanonicalMatch } from "~/lib/ner-linking";
import type { NerEntityType } from "~/lib/ner-types";
import { cn } from "~/lib/utils";

type NerLeafText = TText & {
  ner?: boolean;
  nerType?: NerEntityType;
  nerSource?: "manual" | "model";
  nerCanonicalName?: string;
  nerConfidence?: number;
};

const typeStyles: Record<NerEntityType, string> = {
  location: "underline decoration-cyan-400/90 bg-cyan-500/10",
  organization: "underline decoration-amber-400/90 bg-amber-500/10",
  person: "underline decoration-emerald-400/90 bg-emerald-500/10",
};

const typeLabels: Record<NerEntityType, string> = {
  location: "Location",
  organization: "Organization",
  person: "Person",
};

export function NerLeaf(props: PlateLeafProps<NerLeafText>) {
  const { editor, leaf } = props;
  const nerType = leaf.nerType;
  const hasNer = leaf.ner && !!nerType;

  const strictMatch = useMemo(() => {
    if (!hasNer) return null;
    if (typeof leaf.text !== "string") return null;
    return resolveStrictCanonicalMatch(leaf.text);
  }, [hasNer, leaf.text]);

  const convertTarget = leaf.nerCanonicalName ?? strictMatch;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span>
          <PlateLeaf
            {...props}
            className={cn(
              hasNer &&
                "rounded-sm px-0.5 underline decoration-2 underline-offset-2",
              hasNer && nerType && typeStyles[nerType],
            )}
            data-ner-type={hasNer ? nerType : undefined}
            data-ner-label={hasNer && nerType ? typeLabels[nerType] : undefined}
          >
            {props.children}
          </PlateLeaf>
        </span>
      </PopoverTrigger>
      {hasNer && (
        <PopoverContent className="w-64 border-zinc-700 bg-zinc-900 p-2 text-zinc-100">
          <div className="mb-2 text-xs text-zinc-400">
            {nerType ? typeLabels[nerType] : "Entity"}
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
              onMouseDown={(event) => {
                event.preventDefault();
                editor.tf.ner?.adjustBoundary("expand", -1);
              }}
            >
              Expand Left
            </button>
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
              onMouseDown={(event) => {
                event.preventDefault();
                editor.tf.ner?.adjustBoundary("expand", 1);
              }}
            >
              Expand Right
            </button>
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
              onMouseDown={(event) => {
                event.preventDefault();
                editor.tf.ner?.adjustBoundary("shrink", -1);
              }}
            >
              Shrink Left
            </button>
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
              onMouseDown={(event) => {
                event.preventDefault();
                editor.tf.ner?.adjustBoundary("shrink", 1);
              }}
            >
              Shrink Right
            </button>
          </div>

          <div className="my-2 flex gap-1 text-xs">
            {(["person", "organization", "location"] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={cn(
                  "rounded border px-2 py-1 capitalize",
                  nerType === type
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-zinc-700 hover:bg-zinc-800",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.tf.ner?.setType(type);
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex gap-1 text-xs">
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
              onMouseDown={(event) => {
                event.preventDefault();
                editor.tf.ner?.remove();
              }}
            >
              Remove
            </button>
            <button
              type="button"
              disabled={!convertTarget}
              className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800 disabled:opacity-40"
              onMouseDown={(event) => {
                event.preventDefault();
                if (!convertTarget) return;
                editor.tf.ner?.convertToLink(convertTarget);
              }}
            >
              Convert to Link
            </button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
