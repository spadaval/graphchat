"use client";

import { useChat as useBaseChat } from "@ai-sdk/react";
import { usePluginOption } from "platejs/react";
import * as React from "react";

import { aiChatPlugin } from "~/components/editor/ai-kit";
import type { Block } from "~/lib/state/block";
import { callLLMStreaming, modelProps$ } from "~/lib/state/llm";

export const useChat = () => {
  const options = usePluginOption(aiChatPlugin, "chatOptions");

  const chat = useBaseChat({
    id: "editor",
    api: "/v1/chat/completions",
    ...options,
  });

  return { ...chat };
};

// Custom hook to handle LLM streaming with our own implementation
export const useLLMChat = () => {
  const [messages, setMessages] = React.useState<
    { role: string; content: string }[]
  >([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [abortController, setAbortController] =
    React.useState<AbortController | null>(null);

  // Convert messages to blocks for LLM call
  const convertMessagesToBlocks = (
    messages: { role: string; content: string }[]
  ): Block[] => {
    return messages.map((msg, index) => ({
      id: `blk-${index + 1}`,
      messageId: index + 1,
      text: msg.content,
      role: msg.role as "user" | "assistant",
      isGenerating: false,
      createdAt: new Date(),
      linkedDocuments: [],
    }));
  };

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    // Add user message to chat
    const userMessage = { role: "user", content: messageContent };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Create a new AbortController for this request
      const controller = new AbortController();
      setAbortController(controller);

      // Convert messages to blocks for LLM call
      const blocks = convertMessagesToBlocks(newMessages);

      // Get current model properties
      const modelProperties = modelProps$.get();

      // Call LLM streaming
      const stream = callLLMStreaming(blocks, modelProperties);

      // Add assistant message placeholder
      const assistantMessage = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistantMessage]);

      // Process the stream
      for await (const chunkResult of stream) {
        if (controller.signal.aborted) {
          break;
        }

        chunkResult.match(
          (chunk) => {
            if (chunk.done) {
              return;
            }

            // Update assistant message with new content
            setMessages((prev) => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage.role === "assistant") {
                updated[updated.length - 1] = {
                  ...lastMessage,
                  content: lastMessage.content + chunk.content,
                };
              }
              return updated;
            });
          },
          (error) => {
            console.error("Streaming error:", error.message);
            // Update assistant message with error
            setMessages((prev) => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage.role === "assistant") {
                updated[updated.length - 1] = {
                  ...lastMessage,
                  content: `${lastMessage.content}
[Error: ${error.message}]`,
                };
              }
              return updated;
            });
          }
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Update assistant message with error
      setMessages((prev) => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];
        if (lastMessage.role === "assistant") {
          updated[updated.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}
[Error: Failed to get response]`,
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const stopStreaming = () => {
    if (abortController) {
      abortController.abort();
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    stopStreaming,
  };
};
