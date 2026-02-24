import { createPlateEditor, type TPlateEditor } from "platejs/react";
import { BaseEditorKit } from "~/components/editor/plugins/editor-base-kit";
import { isInternalCanonicalLinkTarget } from "~/lib/state/document-model";

export type DocumentModel = unknown[];

function createContentEditor(): TPlateEditor {
  return createPlateEditor({
    plugins: [...BaseEditorKit],
    value: [{ children: [{ text: "" }], type: "p" }],
  });
}

export function isValidModel(value: unknown): value is DocumentModel {
  return Array.isArray(value);
}

export function deserializeMarkdownToModel(markdown: string): DocumentModel {
  const editor = createContentEditor();
  if (!markdown || !markdown.trim()) {
    return [{ children: [{ text: "" }], type: "p" }];
  }

  const model = editor.api.markdown.deserialize(markdown);
  return Array.isArray(model) && model.length > 0
    ? (model as DocumentModel)
    : [{ children: [{ text: markdown }], type: "p" }];
}

export function serializeModelToReadableMarkdown(model: DocumentModel): string {
  const editor = createContentEditor();
  editor.tf.setValue(model as never);
  return editor.api.markdown.serialize();
}

function getNodeText(node: unknown): string {
  if (!node || typeof node !== "object") return "";

  const typed = node as { text?: unknown; children?: unknown };
  if (typeof typed.text === "string") {
    return typed.text;
  }

  if (!Array.isArray(typed.children)) {
    return "";
  }

  return typed.children.map((child) => getNodeText(child)).join("");
}

export function serializeModelToPreviewText(model: DocumentModel): string {
  if (!Array.isArray(model)) return "";

  return model
    .map((node) => getNodeText(node))
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);
}

function cloneModel<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function extractInternalCanonicalLinksFromModel(
  model: DocumentModel,
): string[] {
  const links = new Set<string>();

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;

    const typed = node as { type?: unknown; url?: unknown; children?: unknown };
    if (typed.type === "a" && typeof typed.url === "string") {
      const url = typed.url.trim();
      if (isInternalCanonicalLinkTarget(url)) {
        links.add(url);
      }
    }

    if (Array.isArray(typed.children)) {
      typed.children.forEach(visit);
    }
  };

  model.forEach(visit);
  return [...links];
}

export function rewriteInternalCanonicalLinksInModel(
  model: DocumentModel,
  previousCanonicalName: string,
  nextCanonicalName: string,
): DocumentModel {
  if (previousCanonicalName === nextCanonicalName) return model;

  const cloned = cloneModel(model);

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;

    const typed = node as { url?: unknown; children?: unknown };
    if (typed.url === previousCanonicalName) {
      typed.url = nextCanonicalName;
    }

    if (Array.isArray(typed.children)) {
      typed.children.forEach(visit);
    }
  };

  cloned.forEach(visit);
  return cloned;
}
