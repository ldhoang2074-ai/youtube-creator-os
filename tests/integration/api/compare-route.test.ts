import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/channel-analyzer/compare-channels", () => ({
  compareChannels: vi.fn(),
}));

import { compareChannels } from "@/lib/channel-analyzer/compare-channels";
import { POST } from "@/app/api/compare/route";
import type { CompareChannelsResult } from "@/lib/channel-analyzer/types";

const compareChannelsMock = vi.mocked(compareChannels);

function makeRequest(body: string): Request {
  return new Request("http://localhost/api/compare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("POST /api/compare", () => {
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

  it("trims inputs and preserves order before calling compareChannels", async () => {
    compareChannelsMock.mockResolvedValueOnce({ results: [] });

    await POST(makeRequest(JSON.stringify({ inputs: [" UCaaa ", "UCbbb  "] })));

    expect(compareChannelsMock).toHaveBeenCalledWith(["UCaaa", "UCbbb"]);
  });

  it("returns 200 for a valid request with all channels successful", async () => {
    const sampleResult: CompareChannelsResult = {
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
            analyzedVideoCount: 2,
            videos: [],
            outlierRate: null,
          },
        },
      ],
    };
    compareChannelsMock.mockResolvedValueOnce(sampleResult);

    const response = await POST(makeRequest(JSON.stringify({ inputs: ["UCaaa", "UCbbb"] })));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(sampleResult);
  });

  it("returns 200 when some channels succeed and some fail", async () => {
    const sampleResult: CompareChannelsResult = {
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
            analyzedVideoCount: 2,
            videos: [],
            outlierRate: null,
          },
        },
        {
          input: "UCbad",
          status: "error",
          error: { code: "CHANNEL_NOT_FOUND", message: "No channel found for input: UCbad" },
        },
      ],
    };
    compareChannelsMock.mockResolvedValueOnce(sampleResult);

    const response = await POST(makeRequest(JSON.stringify({ inputs: ["UCaaa", "UCbad"] })));

    expect(response.status).toBe(200);
  });

  it("returns 200 even when every channel fails", async () => {
    const sampleResult: CompareChannelsResult = {
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
    compareChannelsMock.mockResolvedValueOnce(sampleResult);

    const response = await POST(makeRequest(JSON.stringify({ inputs: ["UCbad1", "UCbad2"] })));

    expect(response.status).toBe(200);
  });

  it("does not leak internal data in a validation error body", async () => {
    const response = await POST(makeRequest("{}"));
    const json = await response.json();

    expect(Object.keys(json)).toEqual(["error"]);
    expect(Object.keys(json.error).sort()).toEqual(["code", "message"]);
  });
});
