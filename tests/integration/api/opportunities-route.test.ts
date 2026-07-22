import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/channel-analyzer/compare-channels", () => ({
  compareChannels: vi.fn(),
}));

import { compareChannels } from "@/lib/channel-analyzer/compare-channels";
import { POST } from "@/app/api/opportunities/route";
import type { CompareChannelsResult, VideoAnalysis } from "@/lib/channel-analyzer/types";

const compareChannelsMock = vi.mocked(compareChannels);

function makeRequest(body: string): Request {
  return new Request("http://localhost/api/opportunities", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

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

describe("POST /api/opportunities", () => {
  beforeEach(() => {
    compareChannelsMock.mockReset();
  });

  describe("malformed / invalid request bodies", () => {
    const cases: Array<{ name: string; body: string }> = [
      { name: "syntactically invalid JSON", body: "{not valid json" },
      { name: "JSON null", body: "null" },
      { name: "JSON array", body: "[]" },
      { name: "missing inputs", body: "{}" },
      { name: "inputs not an array", body: JSON.stringify({ inputs: "UCaaa" }) },
      { name: "fewer than 2 inputs", body: JSON.stringify({ inputs: ["UCaaa"] }) },
      { name: "more than 5 inputs", body: JSON.stringify({ inputs: ["a", "b", "c", "d", "e", "f"] }) },
      { name: "element not a string", body: JSON.stringify({ inputs: ["UCaaa", 123] }) },
      { name: "whitespace-only element", body: JSON.stringify({ inputs: ["UCaaa", "   "] }) },
      { name: "duplicate elements after trim", body: JSON.stringify({ inputs: ["UCaaa", " UCaaa "] }) },
    ];

    for (const { name, body } of cases) {
      it(`returns 400 INVALID_INPUT for ${name} and never calls compareChannels`, async () => {
        const response = await POST(makeRequest(body));
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error.code).toBe("INVALID_INPUT");
        expect(compareChannelsMock).not.toHaveBeenCalled();
      });
    }
  });

  it("trims inputs, preserves order, and calls compareChannels exactly once", async () => {
    compareChannelsMock.mockResolvedValueOnce({ results: [] });

    await POST(makeRequest(JSON.stringify({ inputs: [" UCaaa ", "UCbbb  "] })));

    expect(compareChannelsMock).toHaveBeenCalledTimes(1);
    expect(compareChannelsMock).toHaveBeenCalledWith(["UCaaa", "UCbbb"]);
  });

  it("returns 200 with a populated feed and channel summaries for a valid successful request", async () => {
    const compareResult: CompareChannelsResult = {
      results: [
        {
          input: "UCaaa",
          status: "success",
          report: {
            channelId: "UCaaa",
            title: "Channel A",
            thumbnailUrl: null,
            subscriberCount: "1000",
            totalViewCount: "5000",
            videoCount: "10",
            medianViews: 100,
            analyzedVideoCount: 1,
            videos: [makeVideo({ videoId: "vidA" })],
            outlierRate: 1,
          },
        },
      ],
    };
    compareChannelsMock.mockResolvedValueOnce(compareResult);

    const response = await POST(makeRequest(JSON.stringify({ inputs: ["UCaaa", "UCbbb"] })));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.feed.items).toHaveLength(1);
    expect(json.feed.items[0].videoId).toBe("vidA");
    expect(json.feed.failures).toEqual([]);
    expect(json.channels).toEqual([
      {
        channelId: "UCaaa",
        title: "Channel A",
        thumbnailUrl: null,
        subscriberCount: "1000",
        totalViewCount: "5000",
        videoCount: "10",
        medianViews: 100,
        analyzedVideoCount: 1,
        outlierRate: 1,
      },
    ]);
  });

  it("returns 200 for a mixed success/failure result", async () => {
    const compareResult: CompareChannelsResult = {
      results: [
        {
          input: "UCaaa",
          status: "success",
          report: {
            channelId: "UCaaa",
            title: "Channel A",
            thumbnailUrl: null,
            subscriberCount: "1000",
            totalViewCount: "5000",
            videoCount: "10",
            medianViews: 100,
            analyzedVideoCount: 1,
            videos: [makeVideo({ videoId: "vidA" })],
            outlierRate: 1,
          },
        },
        {
          input: "UCbad",
          status: "error",
          error: { code: "CHANNEL_NOT_FOUND", message: "No channel found for input: UCbad" },
        },
      ],
    };
    compareChannelsMock.mockResolvedValueOnce(compareResult);

    const response = await POST(makeRequest(JSON.stringify({ inputs: ["UCaaa", "UCbad"] })));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.feed.items).toHaveLength(1);
    expect(json.feed.failures).toHaveLength(1);
    expect(json.feed.failures[0].input).toBe("UCbad");
    expect(json.channels.map((channel: { channelId: string }) => channel.channelId)).toEqual(["UCaaa"]);
  });

  it("returns 200 with an empty feed and no channel summaries when every channel fails", async () => {
    const compareResult: CompareChannelsResult = {
      results: [
        {
          input: "UCbad1",
          status: "error",
          error: { code: "CHANNEL_NOT_FOUND", message: "No channel found for input: UCbad1" },
        },
        {
          input: "UCbad2",
          status: "error",
          error: { code: "CHANNEL_NOT_FOUND", message: "No channel found for input: UCbad2" },
        },
      ],
    };
    compareChannelsMock.mockResolvedValueOnce(compareResult);

    const response = await POST(makeRequest(JSON.stringify({ inputs: ["UCbad1", "UCbad2"] })));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.feed.items).toEqual([]);
    expect(json.feed.failures).toHaveLength(2);
    expect(json.channels).toEqual([]);
  });

  it("returns 200 with an empty feed when no channel has a qualifying video", async () => {
    const compareResult: CompareChannelsResult = {
      results: [
        {
          input: "UCaaa",
          status: "success",
          report: {
            channelId: "UCaaa",
            title: "Channel A",
            thumbnailUrl: null,
            subscriberCount: "1000",
            totalViewCount: "5000",
            videoCount: "10",
            medianViews: 100,
            analyzedVideoCount: 1,
            videos: [makeVideo({ outlierLevel: "normal", outlierRatio: 1 })],
            outlierRate: 0,
          },
        },
      ],
    };
    compareChannelsMock.mockResolvedValueOnce(compareResult);

    const response = await POST(makeRequest(JSON.stringify({ inputs: ["UCaaa", "UCbbb"] })));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.feed.items).toEqual([]);
    expect(json.feed.failures).toEqual([]);
    expect(json.channels).toHaveLength(1);
    expect(json.channels[0].channelId).toBe("UCaaa");
  });

  it("preserves successful compare/input order in channel summaries", async () => {
    const compareResult: CompareChannelsResult = {
      results: [
        {
          input: "UCsecond",
          status: "success",
          report: {
            channelId: "UCsecond",
            title: "Second channel",
            thumbnailUrl: null,
            subscriberCount: "2",
            totalViewCount: "20",
            videoCount: "2",
            medianViews: 2,
            analyzedVideoCount: 1,
            videos: [],
            outlierRate: 0,
          },
        },
        {
          input: "UCbad",
          status: "error",
          error: { code: "CHANNEL_NOT_FOUND", message: "No channel found" },
        },
        {
          input: "UCfirst",
          status: "success",
          report: {
            channelId: "UCfirst",
            title: "First channel",
            thumbnailUrl: null,
            subscriberCount: "1",
            totalViewCount: "10",
            videoCount: "1",
            medianViews: 1,
            analyzedVideoCount: 1,
            videos: [],
            outlierRate: 0,
          },
        },
      ],
    };
    compareChannelsMock.mockResolvedValueOnce(compareResult);

    const response = await POST(
      makeRequest(JSON.stringify({ inputs: ["UCsecond", "UCbad", "UCfirst"] })),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.channels.map((channel: { channelId: string }) => channel.channelId)).toEqual([
      "UCsecond",
      "UCfirst",
    ]);
  });

  it("does not leak internal data in a validation error body", async () => {
    const response = await POST(makeRequest("{}"));
    const json = await response.json();

    expect(Object.keys(json)).toEqual(["error"]);
    expect(Object.keys(json.error).sort()).toEqual(["code", "message"]);
  });
});
