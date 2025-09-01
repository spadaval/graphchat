/**
 * Examples of how to use the migrated neverthrow-based functions
 */

import { callLLM, callLLMStreaming } from "./state/llm";
import { modelProps$ } from "./state/llm";
import { logError } from "./neverthrow-utils";

/**
 * Example: Using callLLM with neverthrow
 */
export async function exampleCallLLM() {
  const messages = [
    {
      id: 1,
      role: "user" as const,
      variants: [{ id: "1", text: "Hello!", createdAt: new Date() }],
      currentVariantId: "1",
      createdAt: new Date(),
      isGenerating: false,
    },
  ];

  const result = await callLLM(messages, modelProps$.get());

  result.match(
    (response) => {
      console.log("Success:", response.content);
    },
    (error) => {
      console.error("Error:", error.message);
      // Handle different error types
      if (error.type === "NETWORK_ERROR") {
        // Show network error UI
      } else if (error.type === "API_ERROR") {
        // Show API error UI
      }
    },
  );
}

/**
 * Example: Using callLLMStreaming with neverthrow
 */
export async function exampleStreaming() {
  const messages = [
    {
      id: 1,
      role: "user" as const,
      variants: [{ id: "1", text: "Tell me a story", createdAt: new Date() }],
      currentVariantId: "1",
      createdAt: new Date(),
      isGenerating: false,
    },
  ];

  const stream = callLLMStreaming(messages, modelProps$.get());

  for await (const chunkResult of stream) {
    chunkResult.match(
      (chunk) => {
        if (chunk.done) {
          console.log("Stream complete");
        } else {
          console.log("Received chunk:", chunk.content);
          // Update UI with chunk.content
        }
      },
      (error) => {
        console.error("Streaming error:", error.message);
        // Handle streaming error in UI
      },
    );
  }
}

/**
 * Example: Error handling patterns
 */
export function exampleErrorHandling() {
  // Using logError utility
  const result = logError(
    // Some Result<T, AppError>
    {
      isOk: () => false,
      isErr: () => true,
      error: { message: "Test error", type: "API_ERROR" },
    } as any,
    "Example operation",
  );

  // Using match for different outcomes
  result.match(
    (success) => {
      // Handle success
    },
    (error) => {
      // Handle error based on type
      switch (error.type) {
        case "API_ERROR":
          // API-specific handling
          break;
        case "NETWORK_ERROR":
          // Network-specific handling
          break;
        default:
          // Generic error handling
          break;
      }
    },
  );
}
