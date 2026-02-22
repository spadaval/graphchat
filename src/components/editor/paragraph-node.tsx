"use client";

import { WandSparkles } from "lucide-react";
import { NodeApi, type Path, TextApi, type TText } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useReadOnly } from "platejs/react";
import { useState } from "react";

import { debugInfo, debugLog } from "~/lib/debug";
import { detectNamedEntities } from "~/lib/ner";
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

    setIsRunningNer(true);

    try {
      const paragraphText = NodeApi.string(element);
      const paragraphKey = JSON.stringify(paragraphPath);
      const runStart = performance.now();

      debugInfo("[NER] Paragraph pass started", {
        paragraphPath,
        textLength: paragraphText.length,
        textPreview: paragraphText.slice(0, 120),
      });

      editor.tf.unsetNodes(["ner", "nerType"], {
        at: paragraphPath,
        match: TextApi.isText,
        split: true,
      });
      debugLog("[NER] Cleared existing NER marks", {
        paragraphPath,
      });

      const entities = await detectNamedEntities(paragraphText);
      if (entities.length === 0) {
        debugInfo("[NER] No entities detected for paragraph", {
          paragraphPath,
        });
        return;
      }

      debugInfo("[NER] Applying entities to paragraph", {
        detectedCount: entities.length,
        paragraphPath,
      });

      let appliedCount = 0;
      let skippedCount = 0;

      for (const [index, entity] of entities.entries()) {
        const entityText = paragraphText.slice(entity.start, entity.end);
        const leftContext = paragraphText.slice(
          Math.max(0, entity.start - 20),
          entity.start,
        );
        const rightContext = paragraphText.slice(
          entity.end,
          Math.min(paragraphText.length, entity.end + 20),
        );

        debugLog("[NER] Entity span candidate", {
          end: entity.end,
          entityIndex: index,
          paragraphPath,
          spanText: entityText,
          start: entity.start,
          type: entity.type,
          withContext: `${leftContext}[${entityText}]${rightContext}`,
        });

        const range = offsetsToRange(
          editor,
          paragraphPath,
          entity.start,
          entity.end,
        );
        if (!range) {
          skippedCount += 1;
          console.warn("[NER] Skipping entity: unable to map offsets", {
            end: entity.end,
            entityIndex: index,
            paragraphPath,
            start: entity.start,
            type: entity.type,
          });
          continue;
        }

        editor.tf.setNodes(
          {
            ner: true,
            nerType: entity.type,
          },
          {
            at: range,
            match: TextApi.isText,
            split: true,
          },
        );
        appliedCount += 1;

        debugLog("[NER] Applied entity mark", {
          anchor: range.anchor,
          end: entity.end,
          entityIndex: index,
          focus: range.focus,
          paragraphPath,
          spanText: entityText,
          start: entity.start,
          type: entity.type,
        });
      }

      const runMs = Math.round(performance.now() - runStart);
      debugInfo("[NER] Paragraph pass finished", {
        appliedCount,
        durationMs: runMs,
        paragraphPath,
        runId: paragraphKey,
        skippedCount,
      });
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

function offsetsToRange(
  editor: PlateElementProps["editor"],
  paragraphPath: Path,
  start: number,
  end: number,
) {
  const textNodes = [
    ...editor.api.nodes<TText>({ at: paragraphPath, match: TextApi.isText }),
  ];
  if (textNodes.length === 0) {
    console.warn("[NER] No text nodes found while mapping offsets", {
      end,
      paragraphPath,
      start,
    });
    return null;
  }

  const totalLength = textNodes.reduce(
    (sum, [node]) => sum + node.text.length,
    0,
  );
  const normalizedStart = Math.min(Math.max(start, 0), totalLength);
  const normalizedEnd = Math.min(Math.max(end, normalizedStart), totalLength);

  let currentOffset = 0;
  let anchor: { offset: number; path: Path } | null = null;
  let focus: { offset: number; path: Path } | null = null;

  for (const [node, path] of textNodes) {
    const textLength = node.text.length;
    const nodeStart = currentOffset;
    const nodeEnd = nodeStart + textLength;

    if (!anchor && normalizedStart >= nodeStart && normalizedStart <= nodeEnd) {
      anchor = { offset: normalizedStart - nodeStart, path };
    }

    if (!focus && normalizedEnd >= nodeStart && normalizedEnd <= nodeEnd) {
      focus = { offset: normalizedEnd - nodeStart, path };
      break;
    }

    currentOffset = nodeEnd;
  }

  if (!anchor) {
    const [_firstNode, firstPath] = textNodes[0];
    anchor = {
      offset: 0,
      path: firstPath,
    };
  }

  if (!focus) {
    const [lastNode, lastPath] = textNodes[textNodes.length - 1];
    focus = {
      offset: lastNode.text.length,
      path: lastPath,
    };
  }

  const range = { anchor, focus };
  debugLog("[NER] Computed Slate range from offsets", {
    anchor,
    end,
    focus,
    paragraphPath,
    start,
    totalLength,
  });

  return range;
}
