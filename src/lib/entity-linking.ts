import { TextApi } from "platejs";
import type { PlateEditor } from "platejs/react";
import type { Range } from "slate";
import { debugLog } from "~/lib/debug";
import { canonicalizeName } from "~/lib/state/document-model";
import { documentStore$ } from "~/lib/state/documents";
import { worldStore$ } from "~/lib/state/worlds";

const safeCanonicalize = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return canonicalizeName(trimmed);
};

export function resolveStrictCanonicalMatch(entityText: string): string | null {
  const normalized = safeCanonicalize(entityText);
  if (!normalized) return null;

  const currentWorldId = worldStore$.currentWorldId.get();
  const documents = Object.values(documentStore$.documents.get()).filter(
    (doc) => (currentWorldId ? doc.worldId === currentWorldId : true),
  );

  const matches = documents.filter((document) => {
    if (safeCanonicalize(document.canonicalName) === normalized) {
      return true;
    }

    if (safeCanonicalize(document.title) === normalized) {
      return true;
    }

    const aliases = Array.isArray(document.aliases) ? document.aliases : [];
    return aliases.some((alias) => safeCanonicalize(alias) === normalized);
  });

  if (matches.length !== 1) {
    debugLog("[EntityLinking] Strict match unresolved", {
      entityText,
      matchCount: matches.length,
      normalized,
    });
    return null;
  }

  debugLog("[EntityLinking] Strict match resolved", {
    canonicalName: matches[0]?.canonicalName ?? null,
    entityText,
    normalized,
  });
  return matches[0]?.canonicalName ?? null;
}

export function linkRangeToCanonical(
  editor: PlateEditor,
  range: Range,
  canonicalName: string,
): void {
  const selectionBefore = editor.selection;
  const linkType = editor.getType("a");
  debugLog("[EntityLinking] Wrap range as internal link", {
    canonicalName,
    linkType,
    range,
  });

  editor.tf.select(range);
  editor.tf.wrapNodes(
    {
      children: [],
      type: linkType,
      url: canonicalName,
    },
    {
      at: range,
      match: TextApi.isText,
      split: true,
    },
  );

  if (selectionBefore) {
    editor.tf.select(selectionBefore);
  }
}
