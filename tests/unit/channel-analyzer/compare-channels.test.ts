import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/channel-analyzer/analyze-channel", () => ({
  analyzeChannel: vi.fn(),
}));

import { analyzeChannel } from "@/lib/channel-analyzer/analyze-channel";
import { compareChannels } from "@/lib/channel-analyzer/compare-channels";
import { YoutubeError } from "@/lib/youtube/errors";
import type { OutlierLevel } from "@/lib/analysis/outlier";
import type { ChannelAnalysisReport } from "@/lib/channel-analyzer/types";

const analyzeChannelMock = vi.mocked(analyzeChannel);

function makeVideo(outlierLevel: OutlierLevel, id: string) {
  return {
    videoId: id,
    title: `Title ${id}`,
    publishedAt: "2021-01-01T00:00:00Z",
    thumbnailUrl: null,
    durationSeconds: 60,
    viewCount: 100,
    likeCount: null,
    commentCount: null,
    outlierRatio: null,
    outlierLevel,
  };
}

function makeReport(
  channelId: string,
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
    analyzedVideoCount: 2,
    videos: [],
    ...overrides,
  };
}

describe("compareChannels", () => {
  beforeEach(() => {
    analyzeChannelMock.mockReset();
  });

  it("compares 2 channels successfully", async () => {
    analyzeChannelMock.mockImplementation(async (input: string) => {
      if (input === "UCaaa") return makeReport("UCaaa");
      if (input === "UCbbb") return makeReport("UCbbb");
      throw new Error(`unexpected input: ${input}`);
    });

    const result = await compareChannels(["UCaaa", "UCbbb"]);

    expect(result.results).toHaveLength(2);
    expect(result.results.every((entry) => entry.status === "success")).toBe(true);
  });

  it("compares 5 channels successfully", async () => {
    const ids = ["UC1", "UC2", "UC3", "UC4", "UC5"];
    analyzeChannelMock.mockImplementation(async (input: string) => makeReport(input));

    const result = await compareChannels(ids);

    expect(result.results).toHaveLength(5);
    expect(result.results.every((entry) => entry.status === "success")).toBe(true);
  });

  it("keeps results in the same order as the inputs", async () => {
    analyzeChannelMock.mockImplementation(async (input: string) => makeReport(input));

    const inputs = ["UCzzz", "UCaaa", "UCmmm"];
    const result = await compareChannels(inputs);

    expect(result.results.map((entry) => entry.input)).toEqual(inputs);
  });

  it("does not let one channel's error block the others", async () => {
    analyzeChannelMock.mockImplementation(async (input: string) => {
      if (input === "UCbad") {
        throw new YoutubeError("CHANNEL_NOT_FOUND", "No channel found for input: UCbad");
      }
      return makeReport(input);
    });

    const result = await compareChannels(["UCgood1", "UCbad", "UCgood2"]);

    expect(result.results[0]).toMatchObject({ input: "UCgood1", status: "success" });
    expect(result.results[1]).toMatchObject({
      input: "UCbad",
      status: "error",
      error: { code: "CHANNEL_NOT_FOUND" },
    });
    expect(result.results[2]).toMatchObject({ input: "UCgood2", status: "success" });
  });

  it("represents every channel failing safely and still resolves (never rejects)", async () => {
    analyzeChannelMock.mockImplementation(async (input: string) => {
      throw new YoutubeError("CHANNEL_NOT_FOUND", `No channel found for input: ${input}`);
    });

    const result = await compareChannels(["UCbad1", "UCbad2"]);

    expect(result.results).toHaveLength(2);
    expect(result.results.every((entry) => entry.status === "error")).toBe(true);
  });

  it("maps an unknown (non-YoutubeError) failure to a fixed safe message", async () => {
    analyzeChannelMock.mockImplementation(async () => {
      throw new Error("some internal detail that must not leak");
    });

    const result = await compareChannels(["UCaaa", "UCbbb"]);

    for (const entry of result.results) {
      expect(entry.status).toBe("error");
      if (entry.status === "error") {
        expect(entry.error.code).toBe("UNKNOWN_ERROR");
        expect(entry.error.message).not.toContain("some internal detail");
      }
    }
  });

  it("treats a channel with an empty playlist as success with outlierRate null", async () => {
    analyzeChannelMock.mockImplementation(async (input: string) =>
      makeReport(input, { videos: [], medianViews: null, analyzedVideoCount: 0 }),
    );

    const result = await compareChannels(["UCempty1", "UCempty2"]);

    for (const entry of result.results) {
      expect(entry.status).toBe("success");
      if (entry.status === "success") {
        expect(entry.report.videos).toEqual([]);
        expect(entry.report.medianViews).toBeNull();
        expect(entry.report.analyzedVideoCount).toBe(0);
        expect(entry.report.outlierRate).toBeNull();
      }
    }
  });

  it("attaches the correct outlierRate computed from the report's videos", async () => {
    analyzeChannelMock.mockImplementation(async (input: string) =>
      makeReport(input, {
        videos: [
          makeVideo("normal", "v1"),
          makeVideo("outlier", "v2"),
          makeVideo("strong-outlier", "v3"),
          makeVideo("insufficient-data", "v4"),
        ],
      }),
    );

    const result = await compareChannels(["UCaaa", "UCbbb"]);

    for (const entry of result.results) {
      expect(entry.status).toBe("success");
      if (entry.status === "success") {
        // 2 outlier-ish out of 3 counted videos (insufficient-data excluded)
        expect(entry.report.outlierRate).toBeCloseTo(2 / 3);
      }
    }
  });
});
