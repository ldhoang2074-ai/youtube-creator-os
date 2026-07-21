import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/channel-analyzer/analyze-channel", () => ({
  analyzeChannel: vi.fn(),
}));

import { analyzeChannel } from "@/lib/channel-analyzer/analyze-channel";
import { POST } from "@/app/api/analyzer/route";
import { YoutubeError, type YoutubeErrorCode } from "@/lib/youtube/errors";

const analyzeChannelMock = vi.mocked(analyzeChannel);

function makeRequest(body: string): Request {
  return new Request("http://localhost/api/analyzer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

const SAMPLE_REPORT = {
  channelId: "UCabcdefghijklmnopqrstuv",
  title: "Test Channel",
  thumbnailUrl: null,
  subscriberCount: "1000",
  totalViewCount: "50000",
  videoCount: "10",
  medianViews: 100,
  analyzedVideoCount: 1,
  videos: [],
};

describe("POST /api/analyzer", () => {
  beforeEach(() => {
    analyzeChannelMock.mockReset();
  });

  describe("malformed request bodies", () => {
    it("returns 400 INVALID_INPUT for syntactically invalid JSON", async () => {
      const response = await POST(makeRequest("{not valid json"));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("INVALID_INPUT");
      expect(analyzeChannelMock).not.toHaveBeenCalled();
    });

    it("returns 400 INVALID_INPUT when the body is JSON null", async () => {
      const response = await POST(makeRequest("null"));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("INVALID_INPUT");
    });

    it("returns 400 INVALID_INPUT when the body is a JSON array", async () => {
      const response = await POST(makeRequest("[]"));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("INVALID_INPUT");
    });

    it("returns 400 INVALID_INPUT when 'input' is missing", async () => {
      const response = await POST(makeRequest("{}"));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("INVALID_INPUT");
    });

    it("returns 400 INVALID_INPUT when 'input' is not a string", async () => {
      const response = await POST(makeRequest(JSON.stringify({ input: 123 })));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("INVALID_INPUT");
    });

    it("never falls through to a 500 unknown-error response for malformed bodies", async () => {
      const bodies = ["{not valid json", "null", "[]", "{}", JSON.stringify({ input: 123 })];
      for (const body of bodies) {
        const response = await POST(makeRequest(body));
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe("successful analysis", () => {
    it("returns 200 with the report and calls analyzeChannel with the given input", async () => {
      analyzeChannelMock.mockResolvedValueOnce(SAMPLE_REPORT);

      const response = await POST(makeRequest(JSON.stringify({ input: "UCabcdefghijklmnopqrstuv" })));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual(SAMPLE_REPORT);
      expect(analyzeChannelMock).toHaveBeenCalledWith("UCabcdefghijklmnopqrstuv");
    });
  });

  describe("HTTP error mapping", () => {
    const cases: Array<{ code: YoutubeErrorCode; status: number }> = [
      { code: "INVALID_INPUT", status: 400 },
      { code: "UNSUPPORTED_CHANNEL_FORMAT", status: 400 },
      { code: "CHANNEL_NOT_FOUND", status: 404 },
      { code: "MISSING_API_KEY", status: 500 },
      { code: "QUOTA_EXCEEDED", status: 429 },
      { code: "TIMEOUT", status: 504 },
      { code: "INVALID_RESPONSE_SCHEMA", status: 502 },
      { code: "YOUTUBE_API_ERROR", status: 502 },
    ];

    for (const { code, status } of cases) {
      it(`maps ${code} to HTTP ${status}`, async () => {
        analyzeChannelMock.mockRejectedValueOnce(new YoutubeError(code, `simulated ${code}`));

        const response = await POST(makeRequest(JSON.stringify({ input: "UCabcdefghijklmnopqrstuv" })));
        const json = await response.json();

        expect(response.status).toBe(status);
        expect(json.error.code).toBe(code);
        expect(json.error.message).toBe(`simulated ${code}`);
      });
    }

    it("maps a non-YoutubeError exception to 500 with a fixed safe message", async () => {
      analyzeChannelMock.mockRejectedValueOnce(new Error("some internal detail that must not leak"));

      const response = await POST(makeRequest(JSON.stringify({ input: "UCabcdefghijklmnopqrstuv" })));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error.code).toBe("UNKNOWN_ERROR");
      expect(json.error.message).not.toContain("some internal detail");
    });
  });

  describe("error response shape", () => {
    it("only ever includes error.code and error.message, never cause/stack/raw data", async () => {
      analyzeChannelMock.mockRejectedValueOnce(new YoutubeError("YOUTUBE_API_ERROR", "boom"));

      const response = await POST(makeRequest(JSON.stringify({ input: "UCabcdefghijklmnopqrstuv" })));
      const json = await response.json();

      expect(Object.keys(json)).toEqual(["error"]);
      expect(Object.keys(json.error).sort()).toEqual(["code", "message"]);
    });
  });
});
