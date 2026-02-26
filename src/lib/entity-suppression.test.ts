import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearParagraphSuppressions,
  createParagraphSuppressionKey,
  createSuppressionSignature,
  isSuppressed,
  pruneSuppressionStore,
  recordSuppression,
} from "~/lib/entity-suppression";

const STORAGE_KEY = "entitySuppressionStore";

type LocalStorageLike = {
  clear: () => void;
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

function createMockLocalStorage(): LocalStorageLike {
  const store = new Map<string, string>();
  return {
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

function installWindow(): LocalStorageLike {
  const localStorage = createMockLocalStorage();
  (
    globalThis as unknown as {
      window: { localStorage: LocalStorageLike };
    }
  ).window = { localStorage };
  return localStorage;
}

describe("entity-suppression", () => {
  beforeEach(() => {
    const localStorage = installWindow();
    localStorage.clear();
  });

  it("records and reads suppression entries", () => {
    const docId = "doc-1";
    const paragraphKey = createParagraphSuppressionKey(
      docId,
      [2],
      "Aria lives in Sol",
    );
    const signature = createSuppressionSignature({
      end: 4,
      entityType: "person",
      spanText: "Aria",
      start: 0,
    });

    recordSuppression(docId, paragraphKey, signature);

    expect(isSuppressed(docId, paragraphKey, signature)).toBe(true);
  });

  it("invalidates suppression when paragraph text hash changes", () => {
    const docId = "doc-1";
    const oldKey = createParagraphSuppressionKey(
      docId,
      [2],
      "Aria lives in Sol",
    );
    const newKey = createParagraphSuppressionKey(
      docId,
      [2],
      "Aria moved to Sol",
    );
    const signature = createSuppressionSignature({
      end: 4,
      entityType: "person",
      spanText: "Aria",
      start: 0,
    });

    recordSuppression(docId, oldKey, signature);

    expect(isSuppressed(docId, newKey, signature)).toBe(false);
  });

  it("clears suppression entries for a paragraph key", () => {
    const docId = "doc-2";
    const paragraphKey = createParagraphSuppressionKey(
      docId,
      [4],
      "House Ravenfall",
    );
    const signature = createSuppressionSignature({
      end: 16,
      entityType: "organization",
      spanText: "House Ravenfall",
      start: 0,
    });

    recordSuppression(docId, paragraphKey, signature);
    clearParagraphSuppressions(docId, paragraphKey);

    expect(isSuppressed(docId, paragraphKey, signature)).toBe(false);
  });

  it("prunes expired entries", () => {
    const localStorage = installWindow();
    const now = Date.now();
    const expiredAgeMs = 8 * 24 * 60 * 60 * 1000;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        "doc-expired": [
          {
            key: "person|0|4|aria",
            lastSeenAt: now - expiredAgeMs,
            paragraphKey: "doc-expired|0|abc",
            recordedAt: now - expiredAgeMs,
            signature: {
              end: 4,
              entityType: "person",
              normalizedSpanText: "aria",
              start: 0,
            },
          },
        ],
      }),
    );

    pruneSuppressionStore();

    expect(localStorage.getItem(STORAGE_KEY)).toBe("{}");
  });

  it("caps document entries at 1000", () => {
    const localStorage = installWindow();
    const docId = "doc-cap";
    for (let i = 0; i < 1005; i += 1) {
      const paragraphKey = createParagraphSuppressionKey(
        docId,
        [i],
        `Name ${i}`,
      );
      recordSuppression(
        docId,
        paragraphKey,
        createSuppressionSignature({
          end: i + 1,
          entityType: "person",
          spanText: `Name ${i}`,
          start: i,
        }),
      );
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw ?? "{}") as Record<string, unknown[]>;
    expect((parsed[docId] ?? []).length).toBeLessThanOrEqual(1000);
  });
});
