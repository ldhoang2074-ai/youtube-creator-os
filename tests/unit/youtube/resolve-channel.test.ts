import { afterEach, describe, expect, it } from "vitest";
import { resolveChannel } from "@/lib/youtube/resolve-channel";
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

describe("resolveChannel", () => {
  afterEach(() => {
    process.env.YOUTUBE_API_KEY = ORIGINAL_API_KEY;
  });

  it("resolves a channel to a normalized domain object and selects the best thumbnail", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () =>
      jsonResponse(200, {
        items: [
          {
            id: VALID_CHANNEL_ID,
            snippet: {
              title: "Test Channel",
              description: "A test channel",
              customUrl: "@testchannel",
              publishedAt: "2020-01-01T00:00:00Z",
              thumbnails: {
                default: { url: "https://example.com/default.jpg" },
                medium: { url: "https://example.com/medium.jpg" },
                high: { url: "https://example.com/high.jpg" },
                maxres: { url: "https://example.com/maxres.jpg" },
              },
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
      })) as unknown as typeof fetch;

    const result = await resolveChannel(VALID_CHANNEL_ID, { fetchImpl });

    expect(result).toEqual({
      channelId: VALID_CHANNEL_ID,
      title: "Test Channel",
      description: "A test channel",
      customUrl: "@testchannel",
      publishedAt: "2020-01-01T00:00:00Z",
      thumbnailUrl: "https://example.com/maxres.jpg",
      subscriberCount: "12345",
      viewCount: "678910",
      videoCount: "42",
      uploadsPlaylistId: "UUabcdefghijklmnopqrstuv",
    });
  });

  it("uses the default thumbnail when it is the only available size", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () =>
      jsonResponse(200, {
        items: [
          {
            id: VALID_CHANNEL_ID,
            snippet: {
              title: "Default Thumbnail Channel",
              description: "",
              publishedAt: "2020-01-01T00:00:00Z",
              thumbnails: { default: { url: "https://example.com/default.jpg" } },
            },
            statistics: {},
            contentDetails: {
              relatedPlaylists: { uploads: "UUabcdefghijklmnopqrstuv" },
            },
          },
        ],
      })) as unknown as typeof fetch;

    const result = await resolveChannel(VALID_CHANNEL_ID, { fetchImpl });

    expect(result.thumbnailUrl).toBe("https://example.com/default.jpg");
  });

  it("returns null when the channel has no usable thumbnail", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () =>
      jsonResponse(200, {
        items: [
          {
            id: VALID_CHANNEL_ID,
            snippet: {
              title: "No Thumbnail Channel",
              description: "",
              publishedAt: "2020-01-01T00:00:00Z",
              thumbnails: {},
            },
            statistics: {},
            contentDetails: {
              relatedPlaylists: { uploads: "UUabcdefghijklmnopqrstuv" },
            },
          },
        ],
      })) as unknown as typeof fetch;

    const result = await resolveChannel(VALID_CHANNEL_ID, { fetchImpl });

    expect(result.thumbnailUrl).toBeNull();
  });

  it("throws CHANNEL_NOT_FOUND when the API returns no items", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () => jsonResponse(200, { items: [] })) as unknown as typeof fetch;

    const error = await captureAsyncError(() => resolveChannel(VALID_CHANNEL_ID, { fetchImpl }));

    expect(error.code).toBe("CHANNEL_NOT_FOUND");
  });

  it("propagates parse errors for unsupported input before calling fetch", async () => {
    const fetchImpl = (() => {
      throw new Error("fetch should not be called for invalid input");
    }) as unknown as typeof fetch;

    const error = await captureAsyncError(() =>
      resolveChannel("https://www.youtube.com/c/SomeCustomName", { fetchImpl }),
    );

    expect(error.code).toBe("UNSUPPORTED_CHANNEL_FORMAT");
  });
});
