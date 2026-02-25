"use client";

import { WandSparkles } from "lucide-react";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useReadOnly } from "platejs/react";
import { useState } from "react";
import { cn } from "~/lib/utils";

export function ParagraphElement(props: PlateElementProps) {
  const { editor, element } = props;
  const readOnly = useReadOnly();
  const [isRunningEntityDetection, setIsRunningEntityDetection] =
    useState(false);

  const runEntityDetection = async () => {
    const paragraphPath = editor.api.findPath(element);
    if (!paragraphPath || paragraphPath.length !== 1) {
      console.warn("[Entity] Skipping paragraph: invalid path", {
        paragraphPath,
      });
      return;
    }

    const entityApi = (
      editor.api as {
        entity?: { runParagraph?: (path: number[]) => Promise<void> };
      }
    ).entity;
    if (!entityApi?.runParagraph) {
      console.warn("[Entity] Plugin API missing: entity.runParagraph");
      return;
    }

    setIsRunningEntityDetection(true);
    try {
      await entityApi.runParagraph(paragraphPath);
    } catch (error) {
      console.error("[Entity] Paragraph pass failed", {
        error,
        paragraphPath,
      });
    } finally {
      setIsRunningEntityDetection(false);
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
            void runEntityDetection();
          }}
          disabled={isRunningEntityDetection}
          title="Detect entities in this paragraph"
        >
          <WandSparkles className="size-3" />
          {isRunningEntityDetection ? "Running..." : "Entity"}
        </button>
      )}
      {props.children}
    </PlateElement>
  );
}
