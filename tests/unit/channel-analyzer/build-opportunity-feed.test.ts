import { describe, expect, it } from "vitest";
import { buildOpportunityFeed } from "@/lib/channel-analyzer/build-opportunity-feed";
import type {
  ChannelAnalysisReport,
  ChannelCompareEntry,
  CompareChannelsResult,
  VideoAnalysis,
} from "@/lib/channel-analyzer/types";

function makeVideo(overrides: Partial<VideoAnalysis> = {}): VideoAnalysis {
  return {
    videoId: "vid1",
    title: "Title",
    publishedAt: "2021-01-01T00:00:00Z",
    thumbnailUrl: null,
    durationSeconds: 60,
    viewCount: 200,
    likeCount: null,
    commentCount: null,
    outlierRatio: 2,
    outlierLevel: "outlier",
    ...overrides,
  };
}

function makeReport(
  channelId: string,
  videos: VideoAnalysis[],
  overrides: Partial<ChannelAnalysisReport> = {},
): ChannelAnalysisReport {
  return {
    channelId,
    title: `Channel ${channelId}`,
    thumbnailUrl: null,
    subscriberCount: "1000",
    totalViewCount: "50000",
    videoCount: "10",
    medianViews: 100,
    analyzedVideoCount: videos.length,
    videos,
    ...overrides,
  };
}

function successEntry(
  input: string,
  channelId: string,
  videos: VideoAnalysis[],
  reportOverrides: Partial<ChannelAnalysisReport> = {},
): ChannelCompareEntry {
  return {
    input,
    status: "success",
    report: { ...makeReport(channelId, videos, reportOverrides), outlierRate: null },
  };
}

function failureEntry(input: string, code: string, message: string): ChannelCompareEntry {
  return { input, status: "error", error: { code, message } };
}

function makeCompareResult(results: ChannelCompareEntry[]): CompareChannelsResult {
  return { results };
}

describe("buildOpportunityFeed", () => {
  it("keeps an outlier video", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([successEntry("in1", "UC1", [makeVideo({ outlierLevel: "outlier" })])]),
    );
    expect(feed.items).toHaveLength(1);
  });

  it("keeps a strong-outlier video", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [
          makeVideo({ outlierLevel: "strong-outlier", outlierRatio: 5 }),
        ]),
      ]),
    );
    expect(feed.items).toHaveLength(1);
  });

  it("keeps a video with a ratio of exactly 2 (boundary)", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [makeVideo({ outlierLevel: "outlier", outlierRatio: 2 })]),
      ]),
    );
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]?.outlierRatio).toBe(2);
  });

  it("drops a video whose ratio is below 2, regardless of its reported level", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [makeVideo({ outlierLevel: "outlier", outlierRatio: 1.99 })]),
      ]),
    );
    expect(feed.items).toHaveLength(0);
  });

  it("drops a normal video", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [
          makeVideo({ outlierLevel: "normal", outlierRatio: 1, viewCount: 100 }),
        ]),
      ]),
    );
    expect(feed.items).toHaveLength(0);
  });

  it("drops an insufficient-data video", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [
          makeVideo({ outlierLevel: "insufficient-data", outlierRatio: null, viewCount: null }),
        ]),
      ]),
    );
    expect(feed.items).toHaveLength(0);
  });

  it("drops videos with a non-finite viewCount", () => {
    for (const viewCount of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const feed = buildOpportunityFeed(
        makeCompareResult([successEntry("in1", "UC1", [makeVideo({ viewCount })])]),
      );
      expect(feed.items).toHaveLength(0);
    }
  });

  it("drops videos when the channel's medianViews is null, non-finite, or not positive", () => {
    for (const medianViews of [null, Number.NaN, 0, -10]) {
      const feed = buildOpportunityFeed(
        makeCompareResult([successEntry("in1", "UC1", [makeVideo()], { medianViews })]),
      );
      expect(feed.items).toHaveLength(0);
    }
  });

  it("drops videos with a non-finite or null outlierRatio", () => {
    for (const outlierRatio of [null, Number.NaN, Number.POSITIVE_INFINITY]) {
      const feed = buildOpportunityFeed(
        makeCompareResult([successEntry("in1", "UC1", [makeVideo({ outlierRatio })])]),
      );
      expect(feed.items).toHaveLength(0);
    }
  });

  it("drops videos with a non-finite or negative durationSeconds", () => {
    for (const durationSeconds of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      const feed = buildOpportunityFeed(
        makeCompareResult([successEntry("in1", "UC1", [makeVideo({ durationSeconds })])]),
      );
      expect(feed.items).toHaveLength(0);
    }
  });

  it("drops videos with an empty (or whitespace-only) videoId", () => {
    for (const videoId of ["", "   "]) {
      const feed = buildOpportunityFeed(
        makeCompareResult([successEntry("in1", "UC1", [makeVideo({ videoId })])]),
      );
      expect(feed.items).toHaveLength(0);
    }
  });

  it("drops videos whose publishedAt cannot be parsed", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [makeVideo({ publishedAt: "not-a-date" })]),
      ]),
    );
    expect(feed.items).toHaveLength(0);
  });

  it("attaches the correct channelId/channelTitle/channelMedianViews to a valid item", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UCabc", [makeVideo()], {
          title: "My Channel",
          medianViews: 150,
        }),
      ]),
    );
    expect(feed.items[0]).toMatchObject({
      channelId: "UCabc",
      channelTitle: "My Channel",
      channelMedianViews: 150,
    });
  });

  it("deduplicates the same videoId appearing in two different success entries, keeping the first occurrence", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [makeVideo({ videoId: "dup", title: "First" })], {
          title: "Channel One",
        }),
        successEntry("in2", "UC2", [makeVideo({ videoId: "dup", title: "Second" })], {
          title: "Channel Two",
        }),
      ]),
    );
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]?.title).toBe("First");
    expect(feed.items[0]?.channelId).toBe("UC1");
  });

  it("does not lose failures when deduplication removes an item", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [makeVideo({ videoId: "dup" })]),
        successEntry("in2", "UC2", [makeVideo({ videoId: "dup" })]),
        failureEntry("in3", "CHANNEL_NOT_FOUND", "not found"),
      ]),
    );
    expect(feed.items).toHaveLength(1);
    expect(feed.failures).toHaveLength(1);
    expect(feed.failures[0]?.input).toBe("in3");
  });

  it("sorts items by outlierRatio descending", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [
          makeVideo({ videoId: "low", outlierRatio: 2 }),
          makeVideo({ videoId: "high", outlierRatio: 8 }),
          makeVideo({ videoId: "mid", outlierRatio: 4 }),
        ]),
      ]),
    );
    expect(feed.items.map((item) => item.videoId)).toEqual(["high", "mid", "low"]);
  });

  it("breaks a tied ratio by more recent publishedAt first", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [
          makeVideo({ videoId: "older", outlierRatio: 3, publishedAt: "2020-01-01T00:00:00Z" }),
          makeVideo({ videoId: "newer", outlierRatio: 3, publishedAt: "2022-01-01T00:00:00Z" }),
        ]),
      ]),
    );
    expect(feed.items.map((item) => item.videoId)).toEqual(["newer", "older"]);
  });

  it("breaks a tied ratio and publishedAt by videoId ascending as the final tie-break", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [
          makeVideo({ videoId: "zzz", outlierRatio: 3, publishedAt: "2021-01-01T00:00:00Z" }),
          makeVideo({ videoId: "aaa", outlierRatio: 3, publishedAt: "2021-01-01T00:00:00Z" }),
        ]),
      ]),
    );
    expect(feed.items.map((item) => item.videoId)).toEqual(["aaa", "zzz"]);
  });

  it("keeps failures in the same order as the inputs", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        failureEntry("bad1", "CHANNEL_NOT_FOUND", "not found 1"),
        successEntry("good1", "UC1", [makeVideo()]),
        failureEntry("bad2", "TIMEOUT", "timed out"),
      ]),
    );
    expect(feed.failures.map((failure) => failure.input)).toEqual(["bad1", "bad2"]);
  });

  it("produces a correct mixed result of successes and failures", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("good1", "UC1", [makeVideo({ videoId: "vidA" })]),
        failureEntry("bad1", "CHANNEL_NOT_FOUND", "not found"),
      ]),
    );
    expect(feed.items).toHaveLength(1);
    expect(feed.failures).toHaveLength(1);
  });

  it("returns items:[] with failures fully populated when every channel fails", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        failureEntry("bad1", "CHANNEL_NOT_FOUND", "not found 1"),
        failureEntry("bad2", "CHANNEL_NOT_FOUND", "not found 2"),
      ]),
    );
    expect(feed.items).toEqual([]);
    expect(feed.failures).toHaveLength(2);
  });

  it("returns items:[] and failures:[] when no channel has any qualifying video", () => {
    const feed = buildOpportunityFeed(
      makeCompareResult([
        successEntry("in1", "UC1", [makeVideo({ outlierLevel: "normal", outlierRatio: 1 })]),
        successEntry("in2", "UC2", [
          makeVideo({ outlierLevel: "insufficient-data", outlierRatio: null, viewCount: null }),
        ]),
      ]),
    );
    expect(feed.items).toEqual([]);
    expect(feed.failures).toEqual([]);
  });

  it("does not mutate the input CompareChannelsResult", () => {
    const compareResult = makeCompareResult([
      successEntry("in1", "UC1", [makeVideo({ videoId: "vidA" })]),
      failureEntry("bad1", "CHANNEL_NOT_FOUND", "not found"),
    ]);
    const snapshot = JSON.parse(JSON.stringify(compareResult));

    buildOpportunityFeed(compareResult);

    expect(compareResult).toEqual(snapshot);
  });
});
