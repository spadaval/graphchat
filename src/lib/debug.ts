import { uiPreferences$ } from "~/lib/state/ui";

export function isDebugModeEnabled(): boolean {
  return uiPreferences$.debugMode.get() === true;
}

export function debugInfo(message?: unknown, ...optionalParams: unknown[]) {
  if (!isDebugModeEnabled()) return;
  console.info(message, ...optionalParams);
}

export function debugLog(message?: unknown, ...optionalParams: unknown[]) {
  if (!isDebugModeEnabled()) return;
  console.debug(message, ...optionalParams);
}

export function debugWarn(message?: unknown, ...optionalParams: unknown[]) {
  if (!isDebugModeEnabled()) return;
  console.warn(message, ...optionalParams);
}

export function debugError(message?: unknown, ...optionalParams: unknown[]) {
  if (!isDebugModeEnabled()) return;
  console.error(message, ...optionalParams);
}
