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
  // For now, we'll return the entire document content
  // In a more advanced implementation, we could:
  // 1. Split document into sections/chunks
  // 2. Score each section based on relevance to the query
  // 3. Return the most relevant sections
  return document.content;
};

/**
 * Format a document for inclusion in LLM context
 */
export const formatDocumentForLLM = (document: Document): string => {
  return `[Document: ${document.title}]\n${document.content}\n[End of Document]`;
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
  return documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.content.toLowerCase().includes(lowerQuery) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
  );
};

/**
 * Get document excerpts around keyword matches
 */
export const getDocumentExcerpts = (
  document: Document,
  query: string,
  excerptLength = 200,
): string[] => {
  if (!query)
    return [
      document.content.substring(0, excerptLength) +
        (document.content.length > excerptLength ? "..." : ""),
    ];

  const lowerContent = document.content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const excerpts: string[] = [];

  let index = lowerContent.indexOf(lowerQuery);
  while (index !== -1 && excerpts.length < 3) {
    // Limit to 3 excerpts
    const start = Math.max(0, index - excerptLength / 2);
    const end = Math.min(
      document.content.length,
      index + query.length + excerptLength / 2,
    );
    excerpts.push(
      document.content.substring(start, end) +
        (end < document.content.length ? "..." : ""),
    );
    index = lowerContent.indexOf(lowerQuery, index + 1);
  }

  return excerpts.length > 0
    ? excerpts
    : [
        document.content.substring(0, excerptLength) +
          (document.content.length > excerptLength ? "..." : ""),
      ];
};
