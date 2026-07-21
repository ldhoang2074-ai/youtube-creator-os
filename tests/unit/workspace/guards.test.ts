import { describe, expect, it } from "vitest";
import { isValidSavedResearchSession, parseStoredSessions } from "@/lib/workspace/guards";

function makeItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    videoId: "vid1",
    title: "Title",
    thumbnailUrl: null,
    publishedAt: "2021-01-01T00:00:00Z",
    durationSeconds: 60,
    viewCount: 200,
    channelId: "UC1",
    channelTitle: "Channel 1",
    channelMedianViews: 100,
    outlierRatio: 2,
    outlierLevel: "outlier",
    ...overrides,
  };
}

function makeFailure(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    input: "UCbad",
    error: { code: "CHANNEL_NOT_FOUND", message: "not found" },
    ...overrides,
  };
}

function makeSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "session-1",
    name: "My Research",
    savedAt: "2021-01-01T00:00:00Z",
    inputs: ["UCaaa", "UCbbb"],
    result: { items: [makeItem()], failures: [] },
    ...overrides,
  };
}

describe("parseStoredSessions", () => {
  it("does not throw on syntactically invalid JSON", () => {
    const result = parseStoredSessions("{not valid json");
    expect(result).toEqual({ sessions: [], skippedCount: 0 });
  });

  it("does not throw when the root is not an array", () => {
    const result = parseStoredSessions(JSON.stringify({ not: "an array" }));
    expect(result).toEqual({ sessions: [], skippedCount: 0 });
  });

  it("skips a session with the wrong schemaVersion", () => {
    const result = parseStoredSessions(JSON.stringify([makeSession({ schemaVersion: 2 })]));
    expect(result.sessions).toEqual([]);
    expect(result.skippedCount).toBe(1);
  });

  it("skips a session with an invalid id", () => {
    const result = parseStoredSessions(JSON.stringify([makeSession({ id: "" })]));
    expect(result.sessions).toEqual([]);
  });

  it("skips a session with an invalid name", () => {
    const result = parseStoredSessions(JSON.stringify([makeSession({ name: "" })]));
    expect(result.sessions).toEqual([]);
  });

  it("skips a session with an invalid savedAt", () => {
    const result = parseStoredSessions(JSON.stringify([makeSession({ savedAt: "not-a-date" })]));
    expect(result.sessions).toEqual([]);
  });

  it("skips a session with invalid inputs (out of 2-5 range)", () => {
    const result = parseStoredSessions(JSON.stringify([makeSession({ inputs: ["only-one"] })]));
    expect(result.sessions).toEqual([]);
  });

  it("skips a session whose result.items is not an array", () => {
    const result = parseStoredSessions(
      JSON.stringify([makeSession({ result: { items: "nope", failures: [] } })]),
    );
    expect(result.sessions).toEqual([]);
  });

  it("skips a session whose result.failures is not an array", () => {
    const result = parseStoredSessions(
      JSON.stringify([makeSession({ result: { items: [], failures: "nope" } })]),
    );
    expect(result.sessions).toEqual([]);
  });

  it("skips a session whose item is missing a required field", () => {
    const { videoId, ...itemWithoutVideoId } = makeItem();
    void videoId;
    const result = parseStoredSessions(
      JSON.stringify([makeSession({ result: { items: [itemWithoutVideoId], failures: [] } })]),
    );
    expect(result.sessions).toEqual([]);
  });

  it("skips a session whose item has a non-finite or negative numeric field", () => {
    for (const overrides of [{ durationSeconds: Number.NaN }, { viewCount: -5 }]) {
      const result = parseStoredSessions(
        JSON.stringify([makeSession({ result: { items: [makeItem(overrides)], failures: [] } })]),
      );
      expect(result.sessions).toEqual([]);
    }
  });

  it("skips a session whose item has outlierRatio below 2", () => {
    const result = parseStoredSessions(
      JSON.stringify([
        makeSession({ result: { items: [makeItem({ outlierRatio: 1.5 })], failures: [] } }),
      ]),
    );
    expect(result.sessions).toEqual([]);
  });

  it("skips a session whose item has an invalid outlierLevel", () => {
    const result = parseStoredSessions(
      JSON.stringify([
        makeSession({ result: { items: [makeItem({ outlierLevel: "normal" })], failures: [] } }),
      ]),
    );
    expect(result.sessions).toEqual([]);
  });

  it("skips a session whose failure has an invalid shape", () => {
    const result = parseStoredSessions(
      JSON.stringify([
        makeSession({ result: { items: [], failures: [makeFailure({ error: undefined })] } }),
      ]),
    );
    expect(result.sessions).toEqual([]);
  });

  it("skips only the corrupt session and keeps valid ones alongside it", () => {
    const result = parseStoredSessions(
      JSON.stringify([makeSession({ id: "good" }), makeSession({ id: "bad", schemaVersion: 2 })]),
    );
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.id).toBe("good");
    expect(result.skippedCount).toBe(1);
  });
});

describe("isValidSavedResearchSession", () => {
  it("accepts a fully valid session", () => {
    expect(isValidSavedResearchSession(makeSession())).toBe(true);
  });

  it("rejects an epoch-like numeric string as savedAt", () => {
    expect(isValidSavedResearchSession(makeSession({ savedAt: "0" }))).toBe(false);
  });

  it("rejects a bare date (no time component) as savedAt", () => {
    expect(isValidSavedResearchSession(makeSession({ savedAt: "2021-01-01" }))).toBe(false);
  });

  it("accepts an ISO datetime with a Z suffix as savedAt", () => {
    expect(
      isValidSavedResearchSession(makeSession({ savedAt: "2021-01-01T00:00:00.000Z" })),
    ).toBe(true);
  });

  it("accepts an ISO datetime with a numeric UTC offset as savedAt", () => {
    expect(
      isValidSavedResearchSession(makeSession({ savedAt: "2021-01-01T00:00:00+07:00" })),
    ).toBe(true);
  });

  it("rejects an item publishedAt that is not a full ISO datetime", () => {
    const session = makeSession({
      result: { items: [makeItem({ publishedAt: "2021-01-01" })], failures: [] },
    });
    expect(isValidSavedResearchSession(session)).toBe(false);
  });

  it("rejects a name longer than 80 characters", () => {
    expect(isValidSavedResearchSession(makeSession({ name: "x".repeat(81) }))).toBe(false);
  });

  it("rejects a session with a non-finite numeric field (NaN or Infinity)", () => {
    for (const overrides of [{ durationSeconds: Number.NaN }, { viewCount: Number.POSITIVE_INFINITY }]) {
      const session = makeSession({ result: { items: [makeItem(overrides)], failures: [] } });
      // Called directly (not via JSON.stringify/JSON.parse), since
      // JSON.stringify silently converts NaN/Infinity to null and would
      // exercise a different code path than genuinely non-finite data.
      expect(isValidSavedResearchSession(session)).toBe(false);
    }
  });
});
