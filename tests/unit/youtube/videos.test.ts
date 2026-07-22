import { afterEach, describe, expect, it } from "vitest";
import { YoutubeError } from "@/lib/youtube/errors";
import { fetchVideos } from "@/lib/youtube/videos";

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

function makeVideoItem(id: string, viewCount?: string) {
  return {
    id,
    snippet: { title: `Title ${id}`, publishedAt: "2020-01-01T00:00:00Z" },
    contentDetails: { duration: "PT1M0S" },
    statistics: viewCount === undefined ? {} : { viewCount },
  };
}

describe("fetchVideos", () => {
  afterEach(() => {
    process.env.YOUTUBE_API_KEY = ORIGINAL_API_KEY;
  });

  it("returns [] without calling fetch when videoIds is empty", async () => {
    const fetchImpl = (() => {
      throw new Error("fetch should not be called for an empty videoIds array");
    }) as unknown as typeof fetch;

    const items = await fetchVideos([], { fetchImpl });

    expect(items).toEqual([]);
  });

  it("requests videos.list with the given IDs joined by commas, using only the injected fetch", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    let calledUrl = "";
    const fetchImpl = (async (url: string) => {
      calledUrl = url;
      return jsonResponse(200, {
        items: [makeVideoItem("vid1", "100"), makeVideoItem("vid2", "200")],
      });
    }) as unknown as typeof fetch;

    const items = await fetchVideos(["vid1", "vid2"], { fetchImpl });

    expect(items).toHaveLength(2);
    expect(calledUrl.startsWith("https://www.googleapis.com/youtube/v3/videos")).toBe(true);
    expect(calledUrl).toContain(encodeURIComponent("vid1,vid2"));
    expect(calledUrl).not.toContain("key=");
  });

  it("safely parses a video with missing statistics fields (no throw)", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () =>
      jsonResponse(200, { items: [makeVideoItem("vid1")] })) as unknown as typeof fetch;

    const items = await fetchVideos(["vid1"], { fetchImpl });

    expect(items[0]?.statistics.viewCount).toBeUndefined();
  });

  it("does not throw when a video item is missing contentDetails.duration", async () => {
    // Observed against a real channel: videos.list can return an item whose
    // contentDetails has every other field (dimension, definition, caption,
    // licensedContent, contentRating, projection) but omits `duration`.
    process.env.YOUTUBE_API_KEY = "test-key";
    const itemWithoutDuration = {
      ...makeVideoItem("vid1", "100"),
      contentDetails: {
        dimension: "2d",
        definition: "hd",
        caption: "false",
        licensedContent: false,
        contentRating: {},
        projection: "rectangular",
      },
    };
    const fetchImpl = (async () =>
      jsonResponse(200, { items: [itemWithoutDuration] })) as unknown as typeof fetch;

    const items = await fetchVideos(["vid1"], { fetchImpl });

    expect(items[0]?.contentDetails.duration).toBeUndefined();
  });

  it("still throws INVALID_RESPONSE_SCHEMA when contentDetails.duration is present but not a string", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () =>
      jsonResponse(200, {
        items: [{ ...makeVideoItem("vid1", "100"), contentDetails: { duration: 60 } }],
      })) as unknown as typeof fetch;

    const error = await captureAsyncError(() => fetchVideos(["vid1"], { fetchImpl }));

    expect(error.code).toBe("INVALID_RESPONSE_SCHEMA");
  });
});
