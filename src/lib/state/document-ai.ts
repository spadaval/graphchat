import {
  buildPrefillContinuationMessages,
  buildTokenInfosFromProbabilities,
} from "~/lib/ai-segments";
import { documentStore$, upsertAISegment } from "./documents";
import { callLLMStreaming, modelProps$ } from "./llm";
import type {
  AISegmentBranch,
  AISegmentMeta,
  BranchId,
  DocumentId,
  SegmentId,
  TokenInfo,
} from "./types";

export interface StreamedSegmentResult {
  fullText: string;
  sourceMessages: { role: "user" | "assistant" | "system"; content: string }[];
  tokens: TokenInfo[];
}

const streamFromMessages = async (
  messages: { role: "user" | "assistant" | "system"; content: string }[],
): Promise<StreamedSegmentResult> => {
  const stream = callLLMStreaming(messages, modelProps$.get());
  let fullText = "";
  let sourceMessages = messages;
  const tokenProbabilities: {
    token: string;
    logprob: number;
    top_logprobs?: { token: string; logprob: number }[];
  }[] = [];

  for await (const chunkResult of stream) {
    chunkResult.match(
      (chunk) => {
        if (chunk.response.done) {
          sourceMessages = chunk.request.sourceMessages || messages;
          return;
        }
        fullText += chunk.response.content;
        if (chunk.response.probabilities) {
          tokenProbabilities.push(...chunk.response.probabilities);
        }
      },
      (error) => {
        throw error;
      },
    );
  }

  return {
    fullText,
    sourceMessages,
    tokens: buildTokenInfosFromProbabilities(tokenProbabilities),
  };
};

const getSegment = (documentId: DocumentId, segmentId: SegmentId) => {
  const document = documentStore$.documents[documentId].get();
  const segment = document?.aiSegments?.[segmentId];
  return { document, segment };
};

const appendBranch = (
  documentId: DocumentId,
  segmentId: SegmentId,
  segment: AISegmentMeta,
  branch: AISegmentBranch,
) => {
  upsertAISegment(documentId, segmentId, () => ({
    ...segment,
    activeBranchId: branch.id,
    branches: {
      ...segment.branches,
      [branch.id]: branch,
    },
    isDetached: false,
    updatedAt: new Date().toISOString(),
  }));
};

export const regenerateSegment = async (
  documentId: DocumentId,
  segmentId: SegmentId,
) => {
  const { segment } = getSegment(documentId, segmentId);
  if (!segment) return null;

  const activeBranch = segment.branches[segment.activeBranchId];
  if (!activeBranch?.sourceMessages?.length) return null;

  const streamed = await streamFromMessages(activeBranch.sourceMessages);
  const branchId: BranchId = `br-${crypto.randomUUID()}`;
  const branch: AISegmentBranch = {
    id: branchId,
    createdAt: new Date().toISOString(),
    fullText: streamed.fullText,
    parentBranchId: activeBranch.id,
    sourceMessages: streamed.sourceMessages,
    tokens: streamed.tokens,
  };

  appendBranch(documentId, segmentId, segment, branch);
  return branch;
};

export const regenerateSegmentFromToken = async (
  documentId: DocumentId,
  segmentId: SegmentId,
  tokenIndex: number,
  chosenToken: string,
) => {
  const { segment } = getSegment(documentId, segmentId);
  if (!segment) return null;

  const activeBranch = segment.branches[segment.activeBranchId];
  if (!activeBranch?.sourceMessages?.length) return null;

  const tokens = activeBranch.tokens || [];
  const prefix = `${tokens
    .slice(0, tokenIndex)
    .map((token) => token.token)
    .join("")}${chosenToken}`;
  const continuationMessages = buildPrefillContinuationMessages(
    activeBranch.sourceMessages,
    prefix,
  );
  const streamed = await streamFromMessages(continuationMessages);

  const branchId: BranchId = `br-${crypto.randomUUID()}`;
  const branch: AISegmentBranch = {
    id: branchId,
    createdAt: new Date().toISOString(),
    fullText: `${prefix}${streamed.fullText}`,
    parentBranchId: activeBranch.id,
    sourceMessages: streamed.sourceMessages,
    tokens: streamed.tokens,
    fork: {
      tokenIndex,
      chosenToken,
      parentTextPrefix: prefix,
    },
  };

  appendBranch(documentId, segmentId, segment, branch);
  return branch;
};
