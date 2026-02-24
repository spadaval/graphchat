"use client";

import { WandSparkles } from "lucide-react";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useReadOnly } from "platejs/react";
import { useState } from "react";
import { cn } from "~/lib/utils";

export function ParagraphElement(props: PlateElementProps) {
  const { editor, element } = props;
  const readOnly = useReadOnly();
  const [isRunningNer, setIsRunningNer] = useState(false);

  const runNer = async () => {
    const paragraphPath = editor.api.findPath(element);
    if (!paragraphPath || paragraphPath.length !== 1) {
      console.warn("[NER] Skipping paragraph: invalid path", {
        paragraphPath,
      });
      return;
    }

    const nerApi = (
      editor.api as {
        ner?: { runParagraph?: (path: number[]) => Promise<void> };
      }
    ).ner;
    if (!nerApi?.runParagraph) {
      console.warn("[NER] Plugin API missing: ner.runParagraph");
      return;
    }

    setIsRunningNer(true);
    try {
      await nerApi.runParagraph(paragraphPath);
    } catch (error) {
      console.error("[NER] Paragraph pass failed", {
        error,
        paragraphPath,
      });
    } finally {
      setIsRunningNer(false);
    }
  };

  return (
    <PlateElement
      {...props}
      className={cn("group/paragraph relative m-0 px-0 py-1")}
    >
      {!readOnly && (
        <button
          type="button"
          className="absolute -top-6 right-0 flex h-5 items-center gap-1 rounded border border-zinc-800 bg-zinc-900/90 px-1.5 text-[10px] uppercase tracking-wide text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-zinc-200 group-hover/paragraph:opacity-100 disabled:opacity-70"
          contentEditable={false}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void runNer();
          }}
          disabled={isRunningNer}
          title="Run named entity recognition"
        >
          <WandSparkles className="size-3" />
          {isRunningNer ? "Running..." : "NER"}
        </button>
      )}
      {props.children}
    </PlateElement>
  );
}
