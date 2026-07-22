import { afterEach, describe, expect, it } from "vitest";
import { analyzeChannel } from "@/lib/channel-analyzer/analyze-channel";
import { YoutubeError } from "@/lib/youtube/errors";

const VALID_CHANNEL_ID = "UCabcdefghijklmnopqrstuv";
const UPLOADS_PLAYLIST_ID = "UUabcdefghijklmnopqrstuv";
const ORIGINAL_API_KEY = process.env.YOUTUBE_API_KEY;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function channelResponseBody() {
  return {
    items: [
      {
        id: VALID_CHANNEL_ID,
        snippet: {
          title: "Test Channel",
          description: "A test channel",
          publishedAt: "2020-01-01T00:00:00Z",
        },
        statistics: { subscriberCount: "1000", viewCount: "50000", videoCount: "10" },
        contentDetails: { relatedPlaylists: { uploads: UPLOADS_PLAYLIST_ID } },
      },
    ],
  };
}

function playlistResponseBody(videoIds: string[]) {
  return { items: videoIds.map((videoId) => ({ contentDetails: { videoId } })) };
}

function videoItem(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    snippet: {
      title: `Title ${id}`,
      publishedAt: "2021-01-01T00:00:00Z",
      thumbnails: { default: { url: `${id}-default.jpg` } },
    },
    contentDetails: { duration: "PT1M0S" },
    statistics: {},
    ...overrides,
  };
}

interface Router {
  channels?: () => unknown;
  playlistItems?: () => unknown;
  videos?: () => unknown;
}

function createFetchImpl(router: Router): typeof fetch {
  return (async (url: string) => {
    if (url.includes("/channels")) {
      if (!router.channels) throw new Error("Unexpected call to channels.list in this test");
      return jsonResponse(200, router.channels());
    }
    if (url.includes("/playlistItems")) {
      if (!router.playlistItems) throw new Error("Unexpected call to playlistItems.list in this test");
      return jsonResponse(200, router.playlistItems());
    }
    if (url.includes("/videos")) {
      if (!router.videos) throw new Error("Unexpected call to videos.list in this test");
      return jsonResponse(200, router.videos());
    }
    throw new Error(`Unexpected URL in test: ${url}`);
  }) as unknown as typeof fetch;
}

async function captureError(fn: () => Promise<unknown>): Promise<YoutubeError> {
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

describe("analyzeChannel", () => {
  afterEach(() => {
    process.env.YOUTUBE_API_KEY = ORIGINAL_API_KEY;
  });

  it("resolves a channel end-to-end and computes median/outlier correctly", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = createFetchImpl({
      channels: channelResponseBody,
      playlistItems: () => playlistResponseBody(["vidA", "vidB", "vidC"]),
      videos: () => ({
        items: [
          videoItem("vidA", { statistics: { viewCount: "1000" } }),
          videoItem("vidB", {
            statistics: { viewCount: "2000" },
            snippet: { title: "Title vidB", publishedAt: "2021-01-01T00:00:00Z", thumbnails: { high: { url: "vidB-high.jpg" } } },
          }),
          videoItem("vidC", { statistics: { viewCount: "8000" } }),
        ],
      }),
    });

    const report = await analyzeChannel(VALID_CHANNEL_ID, { fetchImpl });

    expect(report.channelId).toBe(VALID_CHANNEL_ID);
    expect(report.subscriberCount).toBe("1000");
    expect(report.medianViews).toBe(2000);
    expect(report.analyzedVideoCount).toBe(3);
    expect(report.videos.map((v) => v.videoId)).toEqual(["vidA", "vidB", "vidC"]);
    expect(report.videos[0]?.outlierLevel).toBe("normal");
    expect(report.videos[1]?.outlierLevel).toBe("normal");
    expect(report.videos[2]?.outlierRatio).toBe(4);
    expect(report.videos[2]?.outlierLevel).toBe("strong-outlier");
    expect(report.videos[1]?.thumbnailUrl).toBe("vidB-high.jpg");
  });

  it("orders videos by playlist order even when videos.list returns a different order", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = createFetchImpl({
      channels: channelResponseBody,
      playlistItems: () => playlistResponseBody(["vidA", "vidB", "vidC"]),
      videos: () => ({
        items: [
          videoItem("vidC", { statistics: { viewCount: "300" } }),
          videoItem("vidA", { statistics: { viewCount: "100" } }),
          videoItem("vidB", { statistics: { viewCount: "200" } }),
        ],
      }),
    });

    const report = await analyzeChannel(VALID_CHANNEL_ID, { fetchImpl });

    expect(report.videos.map((v) => v.videoId)).toEqual(["vidA", "vidB", "vidC"]);
  });

  it("does not crash when videos.list returns fewer videos than requested (deleted/private video)", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = createFetchImpl({
      channels: channelResponseBody,
      playlistItems: () => playlistResponseBody(["vidA", "vidB", "vidC"]),
      videos: () => ({
        items: [
          videoItem("vidA", { statistics: { viewCount: "100" } }),
          videoItem("vidC", { statistics: { viewCount: "300" } }),
        ],
      }),
    });

    const report = await analyzeChannel(VALID_CHANNEL_ID, { fetchImpl });

    expect(report.videos.map((v) => v.videoId)).toEqual(["vidA", "vidC"]);
    expect(report.analyzedVideoCount).toBe(2);
  });

  it("marks a video with a missing viewCount as insufficient-data and excludes it from the median", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = createFetchImpl({
      channels: channelResponseBody,
      playlistItems: () => playlistResponseBody(["vidA", "vidB", "vidC"]),
      videos: () => ({
        items: [
          videoItem("vidA", { statistics: { viewCount: "100" } }),
          videoItem("vidB", { statistics: {} }), // missing viewCount
          videoItem("vidC", { statistics: { viewCount: "300" } }),
        ],
      }),
    });

    const report = await analyzeChannel(VALID_CHANNEL_ID, { fetchImpl });

    const vidB = report.videos.find((v) => v.videoId === "vidB");
    expect(vidB?.viewCount).toBeNull();
    expect(vidB?.outlierRatio).toBeNull();
    expect(vidB?.outlierLevel).toBe("insufficient-data");
    expect(report.medianViews).toBe(200); // median of [100, 300], vidB excluded
    expect(report.analyzedVideoCount).toBe(2);
  });

  it("returns medianViews null and analyzedVideoCount 0 when every video is missing viewCount", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = createFetchImpl({
      channels: channelResponseBody,
      playlistItems: () => playlistResponseBody(["vidA", "vidB"]),
      videos: () => ({
        items: [videoItem("vidA", { statistics: {} }), videoItem("vidB", { statistics: {} })],
      }),
    });

    const report = await analyzeChannel(VALID_CHANNEL_ID, { fetchImpl });

    expect(report.medianViews).toBeNull();
    expect(report.analyzedVideoCount).toBe(0);
    expect(report.videos.every((v) => v.outlierLevel === "insufficient-data")).toBe(true);
  });

  it("throws INVALID_RESPONSE_SCHEMA when a video's viewCount is malformed", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = createFetchImpl({
      channels: channelResponseBody,
      playlistItems: () => playlistResponseBody(["vidA"]),
      videos: () => ({ items: [videoItem("vidA", { statistics: { viewCount: "not-a-number" } })] }),
    });

    const error = await captureError(() => analyzeChannel(VALID_CHANNEL_ID, { fetchImpl }));

    expect(error.code).toBe("INVALID_RESPONSE_SCHEMA");
  });

  it("throws INVALID_RESPONSE_SCHEMA when a video's viewCount exceeds Number.MAX_SAFE_INTEGER", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = createFetchImpl({
      channels: channelResponseBody,
      playlistItems: () => playlistResponseBody(["vidA"]),
      videos: () => ({
        items: [videoItem("vidA", { statistics: { viewCount: "9007199254740992" } })],
      }),
    });

    const error = await captureError(() => analyzeChannel(VALID_CHANNEL_ID, { fetchImpl }));

    expect(error.code).toBe("INVALID_RESPONSE_SCHEMA");
  });

  it("returns an empty report without calling videos.list when the uploads playlist has no valid videos", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = createFetchImpl({
      channels: channelResponseBody,
      playlistItems: () => playlistResponseBody([]),
      // no `videos` handler: createFetchImpl throws if /videos is ever called
    });

    const report = await analyzeChannel(VALID_CHANNEL_ID, { fetchImpl });

    expect(report.videos).toEqual([]);
    expect(report.medianViews).toBeNull();
    expect(report.analyzedVideoCount).toBe(0);
  });

  it("drops a video item missing contentDetails.duration, preserving order and excluding it from the median", async () => {
    // Observed against a real channel: videos.list can return an item with
    // every other contentDetails field present but no `duration`. It must
    // be dropped like a deleted/private video, never fabricated as 0s, and
    // must not contaminate the median even though it has a valid viewCount.
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = createFetchImpl({
      channels: channelResponseBody,
      playlistItems: () => playlistResponseBody(["vidA", "vidB", "vidC"]),
      videos: () => ({
        items: [
          videoItem("vidA", { statistics: { viewCount: "100" } }),
          videoItem("vidB", { contentDetails: {}, statistics: { viewCount: "999999" } }),
          videoItem("vidC", { statistics: { viewCount: "300" } }),
        ],
      }),
    });

    const report = await analyzeChannel(VALID_CHANNEL_ID, { fetchImpl });

    expect(report.videos.map((v) => v.videoId)).toEqual(["vidA", "vidC"]);
    expect(report.analyzedVideoCount).toBe(2);
    expect(report.medianViews).toBe(200); // median of [100, 300]; vidB's 999999 excluded
  });

  it("throws INVALID_RESPONSE_SCHEMA when a video's contentDetails.duration is present but malformed", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = createFetchImpl({
      channels: channelResponseBody,
      playlistItems: () => playlistResponseBody(["vidA"]),
      videos: () => ({
        items: [videoItem("vidA", { contentDetails: { duration: 60 }, statistics: { viewCount: "100" } })],
      }),
    });

    const error = await captureError(() => analyzeChannel(VALID_CHANNEL_ID, { fetchImpl }));

    expect(error.code).toBe("INVALID_RESPONSE_SCHEMA");
  });

  it("returns null for likeCount/commentCount when missing, without throwing", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchImpl = createFetchImpl({
      channels: channelResponseBody,
      playlistItems: () => playlistResponseBody(["vidA"]),
      videos: () => ({ items: [videoItem("vidA", { statistics: { viewCount: "100" } })] }),
    });

    const report = await analyzeChannel(VALID_CHANNEL_ID, { fetchImpl });

    expect(report.videos[0]?.likeCount).toBeNull();
    expect(report.videos[0]?.commentCount).toBeNull();
  });
});
