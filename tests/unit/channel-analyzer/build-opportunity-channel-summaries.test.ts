import { describe, expect, it } from "vitest";
import { buildOpportunityChannelSummaries } from "@/lib/channel-analyzer/build-opportunity-channel-summaries";
import type {
  ChannelAnalysisReport,
  ChannelCompareEntry,
  CompareChannelsResult,
  VideoAnalysis,
} from "@/lib/channel-analyzer/types";

function makeVideo(overrides: Partial<VideoAnalysis> = {}): VideoAnalysis {
  return {
    videoId: "vid1",
    title: "Video title",
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
  videos: readonly VideoAnalysis[],
  overrides: Partial<ChannelAnalysisReport> = {},
): ChannelAnalysisReport {
  return {
    channelId,
    title: `Channel ${channelId}`,
    thumbnailUrl: "https://example.com/channel.jpg",
    subscriberCount: "1000",
    totalViewCount: "5000",
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
  videos: readonly VideoAnalysis[],
  reportOverrides: Partial<ChannelAnalysisReport> = {},
  outlierRate: number | null = 0.5,
): ChannelCompareEntry {
  return {
    input,
    status: "success",
    report: { ...makeReport(channelId, videos, reportOverrides), outlierRate },
  };
}

function failureEntry(input: string): ChannelCompareEntry {
  return {
    input,
    status: "error",
    error: { code: "CHANNEL_NOT_FOUND", message: "not found" },
  };
}

function makeCompareResult(results: readonly ChannelCompareEntry[]): CompareChannelsResult {
  return { results };
}

describe("buildOpportunityChannelSummaries", () => {
  it("maps every required field from a successful report", () => {
    const summaries = buildOpportunityChannelSummaries(
      makeCompareResult([
        successEntry("@channel", "UC1", [makeVideo()], {
          title: "Channel One",
          thumbnailUrl: "https://example.com/one.jpg",
          subscriberCount: "9007199254740993",
          totalViewCount: "123456789",
          videoCount: "42",
          medianViews: 250,
          analyzedVideoCount: 12,
        }, 0.25),
      ]),
    );

    expect(summaries).toEqual([
      {
        channelId: "UC1",
        title: "Channel One",
        thumbnailUrl: "https://example.com/one.jpg",
        subscriberCount: "9007199254740993",
        totalViewCount: "123456789",
        videoCount: "42",
        medianViews: 250,
        analyzedVideoCount: 12,
        outlierRate: 0.25,
      },
    ]);
  });

  it("excludes failures and preserves successful input order", () => {
    const summaries = buildOpportunityChannelSummaries(
      makeCompareResult([
        successEntry("first", "UC1", [makeVideo()]),
        failureEntry("missing"),
        successEntry("third", "UC3", [makeVideo({ videoId: "vid3" })]),
      ]),
    );

    expect(summaries.map((summary) => summary.channelId)).toEqual(["UC1", "UC3"]);
  });

  it("includes successful channels with zero videos or no qualifying feed items", () => {
    const summaries = buildOpportunityChannelSummaries(
      makeCompareResult([
        successEntry("empty", "UCempty", []),
        successEntry("normal", "UCnormal", [makeVideo({ outlierLevel: "normal", outlierRatio: 1 })]),
      ]),
    );

    expect(summaries.map((summary) => summary.channelId)).toEqual(["UCempty", "UCnormal"]);
  });

  it("preserves null medianViews and outlierRate", () => {
    const summaries = buildOpportunityChannelSummaries(
      makeCompareResult([
        successEntry("nulls", "UCnull", [], { medianViews: null }, null),
      ]),
    );

    expect(summaries[0]).toMatchObject({ medianViews: null, outlierRate: null });
  });

  it("does not include report videos or mutate CompareChannelsResult", () => {
    const compareResult = makeCompareResult([
      successEntry("channel", "UC1", [makeVideo(), makeVideo({ videoId: "vid2" })]),
    ]);
    const snapshot = JSON.parse(JSON.stringify(compareResult));

    const summaries = buildOpportunityChannelSummaries(compareResult);

    expect(summaries[0]).not.toHaveProperty("videos");
    expect(compareResult).toEqual(snapshot);
  });
});
