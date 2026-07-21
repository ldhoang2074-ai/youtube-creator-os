import { afterEach, describe, expect, it } from "vitest";
import { fetchChannel } from "@/lib/youtube/client";
import { YoutubeError } from "@/lib/youtube/errors";

const VALID_CHANNEL_ID = "UCabcdefghijklmnopqrstuv";
const ORIGINAL_API_KEY = process.env.YOUTUBE_API_KEY;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function captureAsyncError(fn: () => Promise<unknown>): Promise<YoutubeError> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof YoutubeError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected function to throw a YoutubeError");
}

describe("fetchChannel", () => {
  afterEach(() => {
    process.env.YOUTUBE_API_KEY = ORIGINAL_API_KEY;
  });

  it("throws MISSING_API_KEY when the key is not set, without calling fetch", async () => {
    delete process.env.YOUTUBE_API_KEY;
    const fetchImpl = (() => {
      throw new Error("fetch should not be called when the API key is missing");
    }) as unknown as typeof fetch;

    const error = await captureAsyncError(() =>
      fetchChannel({ channelId: VALID_CHANNEL_ID }, { fetchImpl }),
    );

    expect(error.code).toBe("MISSING_API_KEY");
  });

  it("maps a generic 403 response to YOUTUBE_API_ERROR", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () =>
      jsonResponse(403, {
        error: { code: 403, message: "Forbidden", errors: [{ reason: "forbidden" }] },
      })) as unknown as typeof fetch;

    const error = await captureAsyncError(() =>
      fetchChannel({ channelId: VALID_CHANNEL_ID }, { fetchImpl }),
    );

    expect(error.code).toBe("YOUTUBE_API_ERROR");
  });

  it("maps a quota-exceeded 403 response to QUOTA_EXCEEDED", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () =>
      jsonResponse(403, {
        error: { code: 403, message: "Quota exceeded", errors: [{ reason: "quotaExceeded" }] },
      })) as unknown as typeof fetch;

    const error = await captureAsyncError(() =>
      fetchChannel({ channelId: VALID_CHANNEL_ID }, { fetchImpl }),
    );

    expect(error.code).toBe("QUOTA_EXCEEDED");
  });

  it("throws INVALID_RESPONSE_SCHEMA when the response does not match the expected shape", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () => jsonResponse(200, { items: [{ id: "UCabc" }] })) as unknown as typeof fetch;

    const error = await captureAsyncError(() =>
      fetchChannel({ channelId: VALID_CHANNEL_ID }, { fetchImpl }),
    );

    expect(error.code).toBe("INVALID_RESPONSE_SCHEMA");
  });

  it("throws TIMEOUT when the request does not complete before the timeout", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const abortError = new Error("The operation was aborted");
          abortError.name = "AbortError";
          reject(abortError);
        });
      })) as unknown as typeof fetch;

    const error = await captureAsyncError(() =>
      fetchChannel({ channelId: VALID_CHANNEL_ID }, { fetchImpl, timeoutMs: 10 }),
    );

    expect(error.code).toBe("TIMEOUT");
  });

  it("returns a parsed channel item for a valid response, using only the injected fetch", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    let calledUrl = "";
    const fetchImpl = (async (url: string) => {
      calledUrl = url;
      return jsonResponse(200, {
        items: [
          {
            id: VALID_CHANNEL_ID,
            snippet: {
              title: "Test Channel",
              description: "A test channel",
              publishedAt: "2020-01-01T00:00:00Z",
            },
            statistics: {
              subscriberCount: "12345",
              viewCount: "678910",
              videoCount: "42",
            },
            contentDetails: {
              relatedPlaylists: { uploads: "UUabcdefghijklmnopqrstuv" },
            },
          },
        ],
      });
    }) as unknown as typeof fetch;

    const item = await fetchChannel({ channelId: VALID_CHANNEL_ID }, { fetchImpl });

    expect(item?.id).toBe(VALID_CHANNEL_ID);
    expect(calledUrl.startsWith("https://www.googleapis.com/youtube/v3/channels")).toBe(true);
  });

  it("never puts the API key in the request URL", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    let calledUrl = "";
    const fetchImpl = (async (url: string) => {
      calledUrl = url;
      return jsonResponse(200, {
        items: [
          {
            id: VALID_CHANNEL_ID,
            snippet: { title: "Test Channel", description: "", publishedAt: "2020-01-01T00:00:00Z" },
            statistics: {},
            contentDetails: { relatedPlaylists: { uploads: "UUabcdefghijklmnopqrstuv" } },
          },
        ],
      });
    }) as unknown as typeof fetch;

    await fetchChannel({ channelId: VALID_CHANNEL_ID }, { fetchImpl });

    expect(calledUrl).not.toContain("key=");
    expect(calledUrl).not.toContain("test-key");
  });

  it("sends the API key via the x-goog-api-key header", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    let calledHeaders: HeadersInit | undefined;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      calledHeaders = init?.headers;
      return jsonResponse(200, {
        items: [
          {
            id: VALID_CHANNEL_ID,
            snippet: { title: "Test Channel", description: "", publishedAt: "2020-01-01T00:00:00Z" },
            statistics: {},
            contentDetails: { relatedPlaylists: { uploads: "UUabcdefghijklmnopqrstuv" } },
          },
        ],
      });
    }) as unknown as typeof fetch;

    await fetchChannel({ channelId: VALID_CHANNEL_ID }, { fetchImpl });

    expect(calledHeaders).toMatchObject({ "x-goog-api-key": "test-key" });
  });

  it("does not leak the API key when the underlying fetch throws a network error", async () => {
    const secretKey = "super-secret-test-key";
    process.env.YOUTUBE_API_KEY = secretKey;
    let calledUrl = "";
    const fetchImpl = (async (url: string) => {
      calledUrl = url;
      throw new Error(`request to ${url} failed`);
    }) as unknown as typeof fetch;

    const error = await captureAsyncError(() =>
      fetchChannel({ channelId: VALID_CHANNEL_ID }, { fetchImpl }),
    );

    expect(calledUrl).not.toContain(secretKey);
    expect(error.code).toBe("YOUTUBE_API_ERROR");
    expect(error.message).not.toContain(secretKey);
    expect(JSON.stringify(error)).not.toContain(secretKey);
    expect(error.cause).toBeUndefined();
  });
});
