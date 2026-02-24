import { TextApi } from "platejs";
import type { PlateEditor } from "platejs/react";
import { canonicalizeName } from "~/lib/state/document-model";
import { documentStore$ } from "~/lib/state/documents";
import { worldStore$ } from "~/lib/state/worlds";

export function resolveStrictCanonicalMatch(entityText: string): string | null {
  const normalized = canonicalizeName(entityText);
  if (!normalized) return null;

  const currentWorldId = worldStore$.currentWorldId.get();
  const documents = Object.values(documentStore$.documents.get()).filter(
    (doc) => (currentWorldId ? doc.worldId === currentWorldId : true),
  );

  const matches = documents.filter((document) => {
    if (document.canonicalName === normalized) {
      return true;
    }

    if (canonicalizeName(document.title) === normalized) {
      return true;
    }

    const aliases = Array.isArray(document.aliases) ? document.aliases : [];
    return aliases.some((alias) => canonicalizeName(alias) === normalized);
  });

  if (matches.length !== 1) {
    return null;
  }

  return matches[0]?.canonicalName ?? null;
}

export function linkRangeToCanonical(
  editor: PlateEditor,
  range: {
    anchor: { path: number[]; offset: number };
    focus: { path: number[]; offset: number };
  },
  canonicalName: string,
): void {
  const selectionBefore = editor.selection;
  const linkType = editor.getType("a");

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
