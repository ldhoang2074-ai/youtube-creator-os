import { afterEach, describe, expect, it } from "vitest";
import { fetchUploadsPlaylistVideoIds } from "@/lib/youtube/playlist-items";

const ORIGINAL_API_KEY = process.env.YOUTUBE_API_KEY;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchUploadsPlaylistVideoIds", () => {
  afterEach(() => {
    process.env.YOUTUBE_API_KEY = ORIGINAL_API_KEY;
  });

  it("returns video IDs in playlist order, using only the injected fetch", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    let calledUrl = "";
    const fetchImpl = (async (url: string) => {
      calledUrl = url;
      return jsonResponse(200, {
        items: [
          { contentDetails: { videoId: "vid1" } },
          { contentDetails: { videoId: "vid2" } },
          { contentDetails: { videoId: "vid3" } },
        ],
      });
    }) as unknown as typeof fetch;

    const ids = await fetchUploadsPlaylistVideoIds("UUplaylist", 25, { fetchImpl });

    expect(ids).toEqual(["vid1", "vid2", "vid3"]);
    expect(calledUrl.startsWith("https://www.googleapis.com/youtube/v3/playlistItems")).toBe(true);
    expect(calledUrl).not.toContain("key=");
  });

  it("dedupes a duplicate videoId, keeping only the first occurrence", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () =>
      jsonResponse(200, {
        items: [
          { contentDetails: { videoId: "vid1" } },
          { contentDetails: { videoId: "vid2" } },
          { contentDetails: { videoId: "vid1" } },
        ],
      })) as unknown as typeof fetch;

    const ids = await fetchUploadsPlaylistVideoIds("UUplaylist", 25, { fetchImpl });

    expect(ids).toEqual(["vid1", "vid2"]);
  });

  it("filters out items missing a videoId", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () =>
      jsonResponse(200, {
        items: [
          { contentDetails: { videoId: "vid1" } },
          { contentDetails: {} },
          {},
          { contentDetails: { videoId: "vid2" } },
        ],
      })) as unknown as typeof fetch;

    const ids = await fetchUploadsPlaylistVideoIds("UUplaylist", 25, { fetchImpl });

    expect(ids).toEqual(["vid1", "vid2"]);
  });

  it("returns an empty array when the playlist has no items", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = (async () => jsonResponse(200, { items: [] })) as unknown as typeof fetch;

    const ids = await fetchUploadsPlaylistVideoIds("UUplaylist", 25, { fetchImpl });

    expect(ids).toEqual([]);
  });
});
