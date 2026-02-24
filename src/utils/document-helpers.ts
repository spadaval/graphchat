import {
  serializeModelToPreviewText,
  serializeModelToReadableMarkdown,
} from "~/lib/document-content";
import type { Document } from "~/lib/state";

/**
 * Extract relevant portions of a document based on a query or context
 * This is a simple implementation that could be enhanced with more sophisticated
 * text analysis or embedding-based similarity search
 */
export const extractRelevantSections = (
  document: Document,
  _query: string,
): string => {
  return serializeModelToReadableMarkdown(document.contentModel || []);
};

/**
 * Format a document for inclusion in LLM context
 */
export const formatDocumentForLLM = (document: Document): string => {
  return `[Document: ${document.title}]\n${serializeModelToReadableMarkdown(document.contentModel || [])}\n[End of Document]`;
};

/**
 * Search documents by title or content
 */
export const searchDocuments = (
  documents: Document[],
  query: string,
): Document[] => {
  if (!query) return documents;

  const lowerQuery = query.toLowerCase();
  return documents.filter((doc) => {
    const preview = serializeModelToPreviewText(doc.contentModel || []);
    return (
      doc.title.toLowerCase().includes(lowerQuery) ||
      preview.toLowerCase().includes(lowerQuery) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  });
};

/**
 * Get document excerpts around keyword matches
 */
export const getDocumentExcerpts = (
  document: Document,
  query: string,
  excerptLength = 200,
): string[] => {
  const content = serializeModelToReadableMarkdown(document.contentModel || []);

  if (!query)
    return [
      content.substring(0, excerptLength) +
        (content.length > excerptLength ? "..." : ""),
    ];

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const excerpts: string[] = [];

  let index = lowerContent.indexOf(lowerQuery);
  while (index !== -1 && excerpts.length < 3) {
    const start = Math.max(0, index - excerptLength / 2);
    const end = Math.min(
      content.length,
      index + query.length + excerptLength / 2,
    );
    excerpts.push(
      content.substring(start, end) + (end < content.length ? "..." : ""),
    );
    index = lowerContent.indexOf(lowerQuery, index + 1);
  }

  return excerpts.length > 0
    ? excerpts
    : [
        content.substring(0, excerptLength) +
          (content.length > excerptLength ? "..." : ""),
      ];
};
