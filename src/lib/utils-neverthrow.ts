import { fromPromise, type Result } from "neverthrow";
import { type AppError, toAppError } from "./errors";

/**
 * Wraps a promise-returning function with neverthrow error handling
 */
export function safePromise<T>(
  promise: Promise<T>,
  errorContext?: string,
): Promise<Result<T, AppError>> {
  return fromPromise(promise, (error) => toAppError(error, errorContext)).then(
    (result) => result,
  );
}

/**
 * Logs errors for debugging purposes
 */
export function logError<T>(
  result: Result<T, AppError>,
  context?: string,
): Result<T, AppError> {
  if (result.isErr()) {
    const prefix = context ? `[${context}] ` : "";
    console.error(`${prefix}Error:`, result.error.message);
    if (result.error.cause) {
      console.error(`${prefix}Cause:`, result.error.cause);
    }
  }
  return result;
}
