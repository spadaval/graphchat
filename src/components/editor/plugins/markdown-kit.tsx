import { MarkdownPlugin, remarkMdx, remarkMention } from "@platejs/markdown";
import { KEYS, NodeApi } from "platejs";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { AI_SEGMENT_TYPE } from "./ai-segment-kit";
import { PLACEHOLDER_TYPE } from "./placeholder-kit";

interface AISegmentPayload {
  aiSegmentId?: string;
  nodeId?: string;
  text: string;
}

interface PlaceholderPayload {
  text: string;
}

const AI_SEGMENT_PREFIX = "<!--wc:ai-segment ";
const PLACEHOLDER_PREFIX = "<!--wc:placeholder ";
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
const serializePlaceholderPayload = (payload: PlaceholderPayload) =>
  `${PLACEHOLDER_PREFIX}${JSON.stringify(payload)}${AI_SEGMENT_SUFFIX}`;

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

const parsePlaceholderPayload = (value?: string | null) => {
  if (
    !value ||
    !value.startsWith(PLACEHOLDER_PREFIX) ||
    !value.endsWith(AI_SEGMENT_SUFFIX)
  ) {
    return null;
  }

  const json = value.slice(
    PLACEHOLDER_PREFIX.length,
    -AI_SEGMENT_SUFFIX.length,
  );
  try {
    const parsed = JSON.parse(json) as Partial<PlaceholderPayload>;
    if (typeof parsed.text !== "string") return null;
    return {
      text: decodeBase64(parsed.text),
    } satisfies PlaceholderPayload;
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
        placeholder: {
          serialize: (node) => ({
            type: "html",
            value: serializePlaceholderPayload({
              text: encodeBase64(NodeApi.string(node)),
            }),
          }),
        },
        html: {
          deserialize: (mdastNode, _deco, _options) => {
            const value = (mdastNode as { value?: string }).value;
            const aiSegmentPayload = parseAISegmentPayload(value);
            if (aiSegmentPayload) {
              return {
                aiSegmentId: aiSegmentPayload.aiSegmentId,
                children: [{ text: aiSegmentPayload.text }],
                type: AI_SEGMENT_TYPE,
              };
            }

            const placeholderPayload = parsePlaceholderPayload(value);
            if (placeholderPayload) {
              return {
                children: [{ text: placeholderPayload.text }],
                type: PLACEHOLDER_TYPE,
              };
            }

            if (!value) {
              return { text: (value || "").replaceAll("<br />", "\n") };
            }
            return { text: value.replaceAll("<br />", "\n") };
          },
        },
      },
    },
  }),
];
