import { describe, expect, it } from "vitest";
import {
  getStorageSafely,
  readDraft,
  resolveDraftRestore,
  writeDraft,
  type StorageHost,
  type StorageLike,
} from "@/lib/drafts/storage";

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

function createThrowingStorage(): StorageLike {
  return {
    getItem: () => {
      throw new DOMException("blocked", "SecurityError");
    },
    setItem: () => {
      throw new DOMException("blocked", "SecurityError");
    },
    removeItem: () => {
      throw new DOMException("blocked", "SecurityError");
    },
  };
}

const KEY = "youtube-creator-os:draft:analyzer:v1";

describe("getStorageSafely", () => {
  it("returns null when the host is undefined (server render)", () => {
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

describe("readDraft", () => {
  it("restores a previously saved draft", () => {
    const storage = createMemoryStorage({ [KEY]: "@mkbhd" });

    expect(readDraft(storage, KEY)).toBe("@mkbhd");
  });

  it("returns null when nothing is stored", () => {
    const storage = createMemoryStorage();

    expect(readDraft(storage, KEY)).toBeNull();
  });

  it("returns null instead of throwing when storage access fails", () => {
    const storage = createThrowingStorage();

    expect(() => readDraft(storage, KEY)).not.toThrow();
    expect(readDraft(storage, KEY)).toBeNull();
  });
});

describe("writeDraft", () => {
  it("saves the value when the field changes", () => {
    const storage = createMemoryStorage();

    writeDraft(storage, KEY, "@mkbhd");

    expect(storage.getItem(KEY)).toBe("@mkbhd");
  });

  it("removes the key once the field is fully cleared", () => {
    const storage = createMemoryStorage({ [KEY]: "@mkbhd" });

    writeDraft(storage, KEY, "");

    expect(storage.getItem(KEY)).toBeNull();
  });

  it("removes the key when the field is left whitespace-only", () => {
    const storage = createMemoryStorage({ [KEY]: "@mkbhd" });

    writeDraft(storage, KEY, "   \n  ");

    expect(storage.getItem(KEY)).toBeNull();
  });

  it("does not throw and leaves the interaction usable when storage access fails", () => {
    const storage = createThrowingStorage();

    expect(() => writeDraft(storage, KEY, "@mkbhd")).not.toThrow();
    expect(() => writeDraft(storage, KEY, "")).not.toThrow();
  });
});

describe("resolveDraftRestore", () => {
  it("keeps the field untouched when there is no priority value and no stored draft", () => {
    expect(resolveDraftRestore("", null)).toEqual({ kind: "keep" });
    expect(resolveDraftRestore("", "")).toEqual({ kind: "keep" });
  });

  it("restores the stored draft when there is no priority value", () => {
    expect(resolveDraftRestore("", "@mkbhd")).toEqual({ kind: "restore", value: "@mkbhd" });
  });

  it("prioritizes a non-empty priority value over any stored draft (Opportunity Feed initialInputs)", () => {
    expect(resolveDraftRestore("@fromWorkspace", "@staleDraft")).toEqual({
      kind: "persist",
      value: "@fromWorkspace",
    });
  });

  it("prioritizes a non-empty priority value even when there is no stored draft", () => {
    expect(resolveDraftRestore("@fromWorkspace", null)).toEqual({
      kind: "persist",
      value: "@fromWorkspace",
    });
  });
});
