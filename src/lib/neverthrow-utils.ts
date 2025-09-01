import { Result, err, ok, fromPromise } from "neverthrow";
import { AppError, toAppError } from "./errors";

/**
 * Utility functions for common neverthrow patterns
 */

/**
 * Wraps a promise-returning function with neverthrow error handling
 */
export function safePromise<T>(
  promise: Promise<T>,
  errorContext?: string,
): Promise<Result<T, AppError>> {
  return fromPromise(promise, (error) => toAppError(error, errorContext));
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

/**
 * Wraps a function that returns a Result with additional error context
 */
export const withContext = <T>(
  result: Result<T, AppError>,
  context: string,
): Result<T, AppError> => {
  if (result.isErr()) {
    const originalError = result.error;
    return err({
      ...originalError,
      message: `${context}: ${originalError.message}`,
    } as AppError);
  }
  return result;
};

/**
 * Combines multiple Results, returning the first error if any fail
 */
export const combineResults = <T>(
  results: Result<T, AppError>[],
): Result<T[], AppError> => {
  const values: T[] = [];
  for (const result of results) {
    if (result.isErr()) {
      return err(result.error);
    }
    values.push(result.value);
  }
  return ok(values);
};

/**
 * Transforms a Result's success value using a mapping function
 */
export const mapResult = <T, U>(
  result: Result<T, AppError>,
  mapper: (value: T) => U,
): Result<U, AppError> => {
  return result.map(mapper);
};

/**
 * Transforms a Result's error using a mapping function
 */
export const mapError = <T>(
  result: Result<T, AppError>,
  errorMapper: (error: AppError) => AppError,
): Result<T, AppError> => {
  return result.mapErr(errorMapper);
};

/**
 * Chains Results together, applying a function that returns a Result to the success value
 */
export const chainResult = <T, U>(
  result: Result<T, AppError>,
  chainFn: (value: T) => Result<U, AppError>,
): Result<U, AppError> => {
  return result.andThen(chainFn);
};

/**
 * Provides a default value if the Result is an error
 */
export const withDefault = <T>(
  result: Result<T, AppError>,
  defaultValue: T,
): T => {
  return result.unwrapOr(defaultValue);
};

/**
 * Executes a side effect on success without changing the Result
 */
export const tapResult = <T>(
  result: Result<T, AppError>,
  onSuccess: (value: T) => void,
  onError?: (error: AppError) => void,
): Result<T, AppError> => {
  if (result.isOk()) {
    onSuccess(result.value);
  } else if (onError) {
    onError(result.error);
  }
  return result;
};

/**
 * Logs errors for debugging purposes
 */
export const logError = <T>(
  result: Result<T, AppError>,
  context?: string,
): Result<T, AppError> => {
  if (result.isErr()) {
    const prefix = context ? `[${context}] ` : "";
    console.error(`${prefix}Error:`, result.error.message);
    if (result.error.cause) {
      console.error(`${prefix}Cause:`, result.error.cause);
    }
  }
  return result;
};

/**
 * Creates a Result from a value that might be null or undefined
 */
export const fromNullable = <T>(
  value: T | null | undefined,
  errorMessage: string = "Value is null or undefined",
): Result<T, AppError> => {
  if (value == null) {
    return err(toAppError(new Error(errorMessage)));
  }
  return ok(value);
};

/**
 * Validates a condition and returns an error if false
 */
export const validate = (
  condition: boolean,
  errorMessage: string,
): Result<void, AppError> => {
  if (!condition) {
    return err(toAppError(new Error(errorMessage)));
  }
  return ok(undefined);
};
