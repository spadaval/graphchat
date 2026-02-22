import { MarkdownPlugin, remarkMdx, remarkMention } from "@platejs/markdown";
import { KEYS, NodeApi } from "platejs";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { AI_SEGMENT_TYPE } from "./ai-segment-kit";

interface AISegmentPayload {
  aiSegmentId?: string;
  nodeId?: string;
  text: string;
}

const AI_SEGMENT_PREFIX = "<!--wc:ai-segment ";
const AI_SEGMENT_SUFFIX = "-->";

const encodeBase64 = (value: string) => {
  if (typeof btoa === "function") {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }

  return value;
};

const decodeBase64 = (value: string) => {
  if (typeof atob === "function") {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").toString("utf8");
  }

  return value;
};

const serializeAISegmentPayload = (payload: AISegmentPayload) =>
  `${AI_SEGMENT_PREFIX}${JSON.stringify(payload)}${AI_SEGMENT_SUFFIX}`;

const parseAISegmentPayload = (value?: string | null) => {
  if (
    !value ||
    !value.startsWith(AI_SEGMENT_PREFIX) ||
    !value.endsWith(AI_SEGMENT_SUFFIX)
  ) {
    return null;
  }

  const json = value.slice(AI_SEGMENT_PREFIX.length, -AI_SEGMENT_SUFFIX.length);
  try {
    const parsed = JSON.parse(json) as Partial<AISegmentPayload>;
    if (typeof parsed.text !== "string") return null;
    return {
      aiSegmentId:
        typeof parsed.aiSegmentId === "string"
          ? parsed.aiSegmentId
          : typeof parsed.nodeId === "string"
            ? parsed.nodeId
            : undefined,
      text: decodeBase64(parsed.text),
    } satisfies AISegmentPayload;
  } catch (_error) {
    return null;
  }
};

export const MarkdownKit = [
  MarkdownPlugin.configure({
    options: {
      plainMarks: [KEYS.suggestion, KEYS.comment],
      remarkPlugins: [remarkMath, remarkGfm, remarkMdx, remarkMention],
      rules: {
        ai_segment: {
          serialize: (node) => {
            const typedNode = node as {
              aiSegmentId?: string;
              children?: unknown[];
            };
            const payload: AISegmentPayload = {
              aiSegmentId: typedNode.aiSegmentId,
              text: encodeBase64(NodeApi.string(node)),
            };

            return {
              type: "html",
              value: serializeAISegmentPayload(payload),
            };
          },
        },
        html: {
          deserialize: (mdastNode, _deco, _options) => {
            const value = (mdastNode as { value?: string }).value;
            const payload = parseAISegmentPayload(value);
            if (!payload) {
              return { text: (value || "").replaceAll("<br />", "\n") };
            }

            return {
              aiSegmentId: payload.aiSegmentId,
              children: [{ text: payload.text }],
              type: AI_SEGMENT_TYPE,
            };
          },
        },
      },
    },
  }),
];
