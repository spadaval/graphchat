import type { EntityType } from "~/lib/entity-types";

const STORAGE_KEY = "entitySuppressionStore";
const SUPPRESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES_PER_DOCUMENT = 1000;

type SuppressionSignature = {
  end: number;
  entityType: EntityType;
  normalizedSpanText: string;
  start: number;
};

type SuppressionEntry = {
  key: string;
  lastSeenAt: number;
  paragraphKey: string;
  recordedAt: number;
  signature: SuppressionSignature;
};

type SuppressionStore = Record<string, SuppressionEntry[]>;

function normalizeSpanText(text: string): string {
  return text.trim().toLocaleLowerCase();
}

function hashText(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function toParagraphPathKey(paragraphPath: number[]): string {
  return paragraphPath.join(".");
}

export function createParagraphSuppressionKey(
  docId: string,
  paragraphPath: number[],
  paragraphText: string,
): string {
  const paragraphPathKey = toParagraphPathKey(paragraphPath);
  return `${docId}|${paragraphPathKey}|${hashText(paragraphText)}`;
}

export function createSuppressionSignature(input: {
  end: number;
  entityType: EntityType;
  spanText: string;
  start: number;
}): SuppressionSignature {
  return {
    end: input.end,
    entityType: input.entityType,
    normalizedSpanText: normalizeSpanText(input.spanText),
    start: input.start,
  };
}

function toEntryKey(signature: SuppressionSignature): string {
  return [
    signature.entityType,
    signature.start,
    signature.end,
    signature.normalizedSpanText,
  ].join("|");
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readStore(): SuppressionStore {
  if (!isBrowser()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as SuppressionStore;
  } catch {
    return {};
  }
}

function writeStore(store: SuppressionStore): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Best-effort cache only; ignore storage write failures.
  }
}

function pruneStore(store: SuppressionStore): SuppressionStore {
  const now = Date.now();
  const next: SuppressionStore = {};

  for (const [docId, entries] of Object.entries(store)) {
    const unexpired = entries.filter(
      (entry) => now - entry.recordedAt <= SUPPRESSION_TTL_MS,
    );
    if (!unexpired.length) continue;

    unexpired.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    next[docId] = unexpired.slice(0, MAX_ENTRIES_PER_DOCUMENT);
  }

  return next;
}

export function pruneSuppressionStore(): void {
  const store = readStore();
  writeStore(pruneStore(store));
}

export function recordSuppression(
  docId: string,
  paragraphKey: string,
  signature: SuppressionSignature,
): void {
  const store = pruneStore(readStore());
  const docEntries = [...(store[docId] ?? [])];
  const now = Date.now();
  const key = toEntryKey(signature);

  const existingIndex = docEntries.findIndex(
    (entry) => entry.paragraphKey === paragraphKey && entry.key === key,
  );

  if (existingIndex >= 0) {
    docEntries[existingIndex] = {
      ...docEntries[existingIndex],
      lastSeenAt: now,
      recordedAt: now,
    };
  } else {
    docEntries.push({
      key,
      lastSeenAt: now,
      paragraphKey,
      recordedAt: now,
      signature,
    });
  }

  docEntries.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  store[docId] = docEntries.slice(0, MAX_ENTRIES_PER_DOCUMENT);
  writeStore(store);
}

export function isSuppressed(
  docId: string,
  paragraphKey: string,
  signature: SuppressionSignature,
): boolean {
  const store = pruneStore(readStore());
  const docEntries = store[docId] ?? [];
  const key = toEntryKey(signature);
  const now = Date.now();

  const entry = docEntries.find(
    (item) => item.paragraphKey === paragraphKey && item.key === key,
  );

  if (!entry) {
    writeStore(store);
    return false;
  }

  entry.lastSeenAt = now;
  writeStore(store);
  return true;
}

export function clearParagraphSuppressions(
  docId: string,
  paragraphKey: string,
): void {
  const store = pruneStore(readStore());
  const next = (store[docId] ?? []).filter(
    (entry) => entry.paragraphKey !== paragraphKey,
  );

  if (next.length === 0) {
    delete store[docId];
  } else {
    store[docId] = next;
  }

  writeStore(store);
}
