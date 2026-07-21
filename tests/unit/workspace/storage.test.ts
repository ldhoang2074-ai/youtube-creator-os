import { describe, expect, it } from "vitest";
import {
  applyRetentionPolicy,
  deleteSession,
  getStorageSafely,
  listSessions,
  saveSession,
  WORKSPACE_STORAGE_KEY,
  type StorageHost,
  type StorageLike,
} from "@/lib/workspace/storage";
import type { SavedResearchSession } from "@/lib/workspace/types";
import type { OpportunityFeedResult } from "@/lib/channel-analyzer/types";

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) ?? null) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

const EMPTY_RESULT: OpportunityFeedResult = { items: [], failures: [] };

function makeSession(overrides: Partial<SavedResearchSession> = {}): SavedResearchSession {
  return {
    schemaVersion: 1,
    id: "session-id",
    name: "My Research",
    savedAt: "2021-01-01T00:00:00.000Z",
    inputs: ["UCaaa", "UCbbb"],
    result: EMPTY_RESULT,
    ...overrides,
  };
}

describe("getStorageSafely", () => {
  it("returns null when the host is undefined", () => {
    expect(getStorageSafely(undefined)).toBeNull();
  });

  it("returns null instead of throwing when reading localStorage throws", () => {
    const host: StorageHost = {
      get localStorage(): StorageLike {
        throw new DOMException("blocked", "SecurityError");
      },
    };

    expect(() => getStorageSafely(host)).not.toThrow();
    expect(getStorageSafely(host)).toBeNull();
  });

  it("returns the storage from a valid host", () => {
    const storage = createMemoryStorage();
    const host: StorageHost = { localStorage: storage };

    expect(getStorageSafely(host)).toBe(storage);
  });
});

describe("saveSession / listSessions", () => {
  it("saves a valid session and reads it back", () => {
    const storage = createMemoryStorage();

    const saved = saveSession(storage, { name: "My Research", inputs: ["UCaaa", "UCbbb"], result: EMPTY_RESULT });
    expect(saved.ok).toBe(true);

    const listed = listSessions(storage);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.sessions).toHaveLength(1);
      expect(listed.sessions[0]?.name).toBe("My Research");
      expect(listed.sessions[0]?.inputs).toEqual(["UCaaa", "UCbbb"]);
    }
  });

  it("trims the session name", () => {
    const storage = createMemoryStorage();

    const saved = saveSession(storage, { name: "  Spaced Name  ", inputs: ["UCaaa", "UCbbb"], result: EMPTY_RESULT });

    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.session.name).toBe("Spaced Name");
    }
  });

  it("trims each input before saving", () => {
    const storage = createMemoryStorage();

    const saved = saveSession(storage, {
      name: "x",
      inputs: ["  UCaaa  ", " UCbbb"],
      result: EMPTY_RESULT,
    });

    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.session.inputs).toEqual(["UCaaa", "UCbbb"]);
    }
  });

  it("uses a default name when the given name is empty", () => {
    const storage = createMemoryStorage();

    const saved = saveSession(storage, { name: "   ", inputs: ["UCaaa", "UCbbb"], result: EMPTY_RESULT });

    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.session.name.startsWith("Research ")).toBe(true);
      expect(saved.session.name.length).toBeGreaterThan("Research ".length);
    }
  });

  it("truncates a name longer than 80 characters", () => {
    const storage = createMemoryStorage();
    const longName = "x".repeat(120);

    const saved = saveSession(storage, { name: longName, inputs: ["UCaaa", "UCbbb"], result: EMPTY_RESULT });

    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.session.name).toHaveLength(80);
    }
  });

  it("rejects fewer than 2 inputs", () => {
    const storage = createMemoryStorage();

    const saved = saveSession(storage, { name: "x", inputs: ["UCaaa"], result: EMPTY_RESULT });

    expect(saved).toEqual({ ok: false, reason: "invalid-inputs" });
  });

  it("rejects more than 5 inputs", () => {
    const storage = createMemoryStorage();

    const saved = saveSession(storage, {
      name: "x",
      inputs: ["a", "b", "c", "d", "e", "f"],
      result: EMPTY_RESULT,
    });

    expect(saved).toEqual({ ok: false, reason: "invalid-inputs" });
  });

  it("rejects inputs containing an empty string", () => {
    const storage = createMemoryStorage();

    const saved = saveSession(storage, { name: "x", inputs: ["UCaaa", "   "], result: EMPTY_RESULT });

    expect(saved).toEqual({ ok: false, reason: "invalid-inputs" });
  });

  it("does not crash when getItem throws a SecurityError", () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => {},
      removeItem: () => {},
    };

    const saved = saveSession(storage, { name: "x", inputs: ["UCaaa", "UCbbb"], result: EMPTY_RESULT });
    expect(saved).toEqual({ ok: false, reason: "storage-unavailable" });

    const listed = listSessions(storage);
    expect(listed).toEqual({ ok: false, reason: "storage-unavailable" });
  });

  it("does not crash when setItem throws a QuotaExceededError", () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
      removeItem: () => {},
    };

    const saved = saveSession(storage, { name: "x", inputs: ["UCaaa", "UCbbb"], result: EMPTY_RESULT });
    expect(saved).toEqual({ ok: false, reason: "storage-full" });
  });

  it("creates two separate sessions when saving the same inputs twice", () => {
    const storage = createMemoryStorage();

    const first = saveSession(storage, { name: "First", inputs: ["UCaaa", "UCbbb"], result: EMPTY_RESULT });
    const second = saveSession(storage, { name: "Second", inputs: ["UCaaa", "UCbbb"], result: EMPTY_RESULT });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.session.id).not.toBe(second.session.id);
    }

    const listed = listSessions(storage);
    if (listed.ok) {
      expect(listed.sessions).toHaveLength(2);
    }
  });

  it("returns sessions newest-first for display", () => {
    const storage = createMemoryStorage({
      [WORKSPACE_STORAGE_KEY]: JSON.stringify([
        makeSession({ id: "older", savedAt: "2021-01-01T00:00:00.000Z" }),
        makeSession({ id: "newer", savedAt: "2022-01-01T00:00:00.000Z" }),
      ]),
    });

    const listed = listSessions(storage);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.sessions.map((session) => session.id)).toEqual(["newer", "older"]);
    }
  });

  it("breaks a tied savedAt in display order by id ascending", () => {
    const storage = createMemoryStorage({
      [WORKSPACE_STORAGE_KEY]: JSON.stringify([
        makeSession({ id: "b", savedAt: "2021-01-01T00:00:00.000Z" }),
        makeSession({ id: "a", savedAt: "2021-01-01T00:00:00.000Z" }),
      ]),
    });

    const listed = listSessions(storage);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.sessions.map((session) => session.id)).toEqual(["a", "b"]);
    }
  });
});

describe("deleteSession", () => {
  it("deletes the session matching the given id", () => {
    const storage = createMemoryStorage({
      [WORKSPACE_STORAGE_KEY]: JSON.stringify([makeSession({ id: "to-delete" })]),
    });

    const result = deleteSession(storage, "to-delete");
    expect(result).toEqual({ ok: true });

    const listed = listSessions(storage);
    if (listed.ok) {
      expect(listed.sessions).toEqual([]);
    }
  });

  it("does not affect other sessions when deleting one", () => {
    const storage = createMemoryStorage({
      [WORKSPACE_STORAGE_KEY]: JSON.stringify([
        makeSession({ id: "keep-1" }),
        makeSession({ id: "to-delete" }),
        makeSession({ id: "keep-2" }),
      ]),
    });

    deleteSession(storage, "to-delete");

    const listed = listSessions(storage);
    if (listed.ok) {
      expect(listed.sessions.map((session) => session.id).sort()).toEqual(["keep-1", "keep-2"]);
    }
  });

  it("does not throw when setItem fails and reports an error result instead", () => {
    const storage: StorageLike = {
      getItem: () => JSON.stringify([makeSession({ id: "to-delete" })]),
      setItem: () => {
        throw new Error("disk write failed");
      },
      removeItem: () => {},
    };

    let result;
    expect(() => {
      result = deleteSession(storage, "to-delete");
    }).not.toThrow();
    expect(result).toEqual({ ok: false, reason: "unknown-error" });
  });
});

describe("applyRetentionPolicy (oldest-saved-session eviction)", () => {
  it("keeps all sessions when at or under the limit", () => {
    const sessions = Array.from({ length: 10 }, (_, index) =>
      makeSession({ id: `s${index}`, savedAt: `2021-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z` }),
    );

    expect(applyRetentionPolicy(sessions)).toHaveLength(10);
  });

  it("evicts exactly the session with the oldest savedAt when adding an 11th", () => {
    const sessions = Array.from({ length: 10 }, (_, index) =>
      makeSession({ id: `s${index}`, savedAt: `2021-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z` }),
    );
    const eleventh = makeSession({ id: "s10", savedAt: "2021-01-11T00:00:00.000Z" });

    const result = applyRetentionPolicy([...sessions, eleventh]);

    expect(result).toHaveLength(10);
    expect(result.some((session) => session.id === "s0")).toBe(false); // oldest, evicted
    expect(result.some((session) => session.id === "s10")).toBe(true); // newest, kept
  });

  it("breaks a tied savedAt by evicting the session with the lowest id", () => {
    const sessions = [
      makeSession({ id: "b", savedAt: "2021-01-01T00:00:00.000Z" }),
      makeSession({ id: "a", savedAt: "2021-01-01T00:00:00.000Z" }),
      ...Array.from({ length: 9 }, (_, index) =>
        makeSession({ id: `later-${index}`, savedAt: `2021-02-${String(index + 1).padStart(2, "0")}T00:00:00.000Z` }),
      ),
    ];

    const result = applyRetentionPolicy(sessions);

    expect(result).toHaveLength(10);
    expect(result.some((session) => session.id === "a")).toBe(false); // tie-break: lowest id evicted
    expect(result.some((session) => session.id === "b")).toBe(true);
  });
});
