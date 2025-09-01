import { Result } from "neverthrow";

/**
 * Base error class for GraphChat application
 */
export abstract class GraphChatError extends Error {
  abstract readonly type: string;

  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error types for different scenarios
 */
export class APIError extends GraphChatError {
  readonly type = "API_ERROR";

  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

export class NetworkError extends GraphChatError {
  readonly type = "NETWORK_ERROR";

  constructor(
    message: string,
    public readonly url?: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

export class ParsingError extends GraphChatError {
  readonly type = "PARSING_ERROR";

  constructor(
    message: string,
    public readonly data?: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

export class ValidationError extends GraphChatError {
  readonly type = "VALIDATION_ERROR";

  constructor(
    message: string,
    public readonly field?: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

export class LLMError extends GraphChatError {
  readonly type = "LLM_ERROR";

  constructor(
    message: string,
    public readonly model?: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

/**
 * Union type for all error types
 */
export type AppError =
  | APIError
  | NetworkError
  | ParsingError
  | ValidationError
  | LLMError;

/**
 * Type alias for Result types using our custom errors
 */
export type AppResult<T> = Result<T, AppError>;

/**
 * Helper function to create API errors
 */
export const createAPIError = (
  message: string,
  statusCode?: number,
  endpoint?: string,
  cause?: Error,
): APIError => new APIError(message, statusCode, endpoint, cause);

/**
 * Helper function to create network errors
 */
export const createNetworkError = (
  message: string,
  url?: string,
  cause?: Error,
): NetworkError => new NetworkError(message, url, cause);

/**
 * Helper function to create parsing errors
 */
export const createParsingError = (
  message: string,
  data?: string,
  cause?: Error,
): ParsingError => new ParsingError(message, data, cause);

/**
 * Helper function to create validation errors
 */
export const createValidationError = (
  message: string,
  field?: string,
  cause?: Error,
): ValidationError => new ValidationError(message, field, cause);

/**
 * Helper function to create LLM errors
 */
export const createLLMError = (
  message: string,
  model?: string,
  cause?: Error,
): LLMError => new LLMError(message, model, cause);

/**
 * Helper function to convert unknown errors to AppError
 */
export const toAppError = (error: unknown, context?: string): AppError => {
  if (error instanceof GraphChatError) {
    return error as AppError;
  }

  if (error instanceof Error) {
    return new APIError(
      context ? `${context}: ${error.message}` : error.message,
      undefined,
      undefined,
      error,
    );
  }

  return new APIError(
    context ? `${context}: Unknown error occurred` : "Unknown error occurred",
  );
};
