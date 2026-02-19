"use client";

import { type UseChatHelpers, useChat as useBaseChat } from "@ai-sdk/react";
import { AIChatPlugin, aiCommentToRange } from "@platejs/ai/react";
import { getCommentKey, getTransientCommentKey } from "@platejs/comment";
import { deserializeMd } from "@platejs/markdown";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { KEYS, NodeApi, nanoid, TextApi, type TNode } from "platejs";
import { useEditorRef, usePluginOption } from "platejs/react";
import * as React from "react";

import { aiChatPlugin } from "~/components/ai-kit";
import {
  discussionPlugin,
  type TDiscussion,
} from "~/components/discussion-kit";
import { callLLMStreaming, modelProps$ } from "~/lib/state/llm";
import type { Block, BlockId, MessageId, MessageType } from "~/lib/state/types";
import { uiPreferences$ } from "~/lib/state/ui";

export type ToolName = "comment" | "edit" | "generate";

export type TComment = {
  comment: {
    blockId: string;
    comment: string;
    content: string;
  } | null;
  status: "finished" | "streaming";
};

export type MessageDataPart = {
  toolName: ToolName;
  comment?: TComment;
};

export type Chat = UseChatHelpers<ChatMessage>;

export type ChatMessage = UIMessage<Record<string, never>, MessageDataPart>;

export const useChat = () => {
  const editor = useEditorRef();
  const options = usePluginOption(aiChatPlugin, "chatOptions");

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const _abortFakeStream = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const fetchImplementation = React.useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      const isCopilot = url.includes("/api/ai/copilot");
      const bodyOptions = editor.getOptions(aiChatPlugin).chatOptions?.body;
      const initBody = JSON.parse(init?.body as string);
      const { messages, prompt, toolName } = {
        ...initBody,
        ...bodyOptions,
      };

      const { aiEnabled, inlineCompletion } = uiPreferences$.get();
      if (!aiEnabled) {
        return new Response("AI is disabled in settings.", { status: 403 });
      }

      if (isCopilot && !inlineCompletion) {
        return new Response("Inline completion is disabled.", {
          status: 403,
        });
      }

      let blockMessages: Block[] = [];

      if (isCopilot) {
        blockMessages = [
          {
            id: `blk-${crypto.randomUUID()}` as BlockId,
            messageId: `msg-${crypto.randomUUID()}` as MessageId,
            text: initBody.prompt || "",
            role: "user",
            type: "paragraph",
            isGenerating: false,
            createdAt: new Date(),
            linkedDocuments: [],
            viewMode: "preview",
          },
        ];
      } else {
        blockMessages = (messages as unknown[]).map((m, _i: number) => {
          const msg = m as { content: string; role: MessageType };

          return {
            id: `blk-${crypto.randomUUID()}` as BlockId,
            messageId: `msg-${crypto.randomUUID()}` as MessageId,
            text: msg.content,
            role: msg.role,
            type: "paragraph",
            isGenerating: false,
            createdAt: new Date(),
            linkedDocuments: [],
            viewMode: "preview",
          } satisfies Block;
        });

        if (prompt) {
          blockMessages.push({
            id: `blk-${crypto.randomUUID()}` as BlockId,
            messageId: `msg-${crypto.randomUUID()}` as MessageId,
            text:
              typeof prompt === "string"
                ? prompt
                : prompt.selecting || prompt.default || "",
            role: "system",
            type: "paragraph",
            isGenerating: false,
            createdAt: new Date(),
            linkedDocuments: [],
            viewMode: "preview",
          });
        }
      }

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const responseStream = callLLMStreaming(
            blockMessages,
            modelProps$.get(),
          );

          if (isCopilot) {
            try {
              for await (const chunkResult of responseStream) {
                chunkResult.match(
                  (chunk) => {
                    if (chunk.response.done) return;
                    controller.enqueue(encoder.encode(chunk.response.content));
                  },
                  (error) => console.error("Copilot Stream error:", error),
                );
              }
            } finally {
              controller.close();
            }
            return;
          }

          if (toolName) {
            controller.enqueue(
              encoder.encode(
                `data: {"type":"data-toolName","data":"${toolName}"}\n\n`,
              ),
            );
          }

          controller.enqueue(encoder.encode('data: {"type":"start"}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"start-step"}\n\n'));
          const messageId = `msg_${nanoid()}`;
          controller.enqueue(
            encoder.encode(
              `data: {"type":"text-start","id":"${messageId}"}\n\n`,
            ),
          );

          try {
            for await (const chunkResult of responseStream) {
              chunkResult.match(
                (chunk) => {
                  if (chunk.response.done) return;
                  const escapedContent = JSON.stringify(
                    chunk.response.content,
                  ).slice(1, -1);
                  controller.enqueue(
                    encoder.encode(
                      `data: {"type":"text-delta","id":"${messageId}","delta":"${escapedContent}"}\n\n`,
                    ),
                  );
                },
                (error) => {
                  console.error("LLM Stream error:", error);
                },
              );
            }
          } catch (err) {
            console.error("Critical stream error:", err);
          } finally {
            controller.enqueue(
              encoder.encode(
                `data: {"type":"text-end","id":"${messageId}"}\n\n`,
              ),
            );
            controller.enqueue(
              encoder.encode('data: {"type":"finish-step"}\n\n'),
            );
            controller.enqueue(encoder.encode('data: {"type":"finish"}\n\n'));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": isCopilot
            ? "text/plain; charset=utf-8"
            : "text/plain",
          Connection: "keep-alive",
        },
      });
    },
    [editor],
  );

  const onData = React.useCallback(
    (data: unknown) => {
      const typedData = data as {
        type: string;
        data: {
          status?: string;
          comment?: TComment["comment"];
        };
      };
      if (typedData.type === "data-toolName") {
        editor.setOption(AIChatPlugin, "toolName", typedData.data);
      }

      if (typedData.type === "data-comment" && typedData.data) {
        if (typedData.data.status === "finished") {
          editor.getApi(BlockSelectionPlugin).blockSelection.deselect();

          return;
        }

        const aiComment = typedData.data.comment;

        if (!aiComment) return;

        const range = aiCommentToRange(editor, aiComment);

        if (!range) return console.warn("No range found for AI comment");

        const discussions =
          (editor.getOption(
            discussionPlugin,
            "discussions",
          ) as TDiscussion[]) || [];

        const discussionId = nanoid();

        const newComment = {
          id: nanoid(),
          contentRich: [{ children: [{ text: aiComment.comment }], type: "p" }],
          createdAt: new Date(),
          discussionId,
          isEdited: false,
          userId: editor.getOption(discussionPlugin, "currentUserId"),
        };

        const newDiscussion = {
          id: discussionId,
          comments: [newComment],
          createdAt: new Date(),
          documentContent: deserializeMd(editor, aiComment.content)
            .map((node: TNode) => NodeApi.string(node))
            .join("\n"),
          isResolved: false,
          userId: editor.getOption(discussionPlugin, "currentUserId"),
        };

        const updatedDiscussions = [...discussions, newDiscussion];
        editor.setOption(discussionPlugin, "discussions", updatedDiscussions);

        editor.tf.withMerging(() => {
          editor.tf.setNodes(
            {
              [getCommentKey(newDiscussion.id)]: true,
              [getTransientCommentKey()]: true,
              [KEYS.comment]: true,
            },
            {
              at: range,
              match: TextApi.isText,
              split: true,
            },
          );
        });
      }
    },
    [editor],
  );

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: options.api || "/api/ai/command",
        fetch: fetchImplementation as typeof fetch,
      }),
    [options.api, fetchImplementation],
  );

  const baseChat = useBaseChat<ChatMessage>({
    id: "editor",
    transport,
    onData,
    ...options,
  });

  const chat = React.useMemo(
    () => ({
      ...baseChat,
      _abortFakeStream,
    }),
    [baseChat, _abortFakeStream],
  );

  React.useEffect(() => {
    editor.setOption(AIChatPlugin, "chat", chat);
  }, [chat, editor.setOption]);

  return chat;
};
