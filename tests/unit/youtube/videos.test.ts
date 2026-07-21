import { afterEach, describe, expect, it } from "vitest";
import { fetchVideos } from "@/lib/youtube/videos";

const ORIGINAL_API_KEY = process.env.YOUTUBE_API_KEY;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
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
});
