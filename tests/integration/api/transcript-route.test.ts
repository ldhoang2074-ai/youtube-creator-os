import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/transcript/fetch-transcript", () => ({
  fetchTranscriptDocument: vi.fn(),
}));

import { POST } from "@/app/api/transcript/route";
import { TranscriptError, type TranscriptErrorCode } from "@/lib/transcript/errors";
import { fetchTranscriptDocument } from "@/lib/transcript/fetch-transcript";
import type { TranscriptDocument } from "@/lib/transcript/types";
import {
  YoutubeVideoReferenceError,
  type YoutubeVideoReferenceErrorCode,
} from "@/lib/youtube/video-id-parser";

const fetchTranscriptDocumentMock = vi.mocked(fetchTranscriptDocument);
const VIDEO_ID = "dQw4w9WgXcQ";
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

const SAMPLE_TRANSCRIPT_DOCUMENT: TranscriptDocument = {
  videoId: VIDEO_ID,
  languageCode: "es",
  source: "youtube-captions",
  generationKind: "unknown",
  segments: [
    {
      index: 0,
      startSeconds: 1.25,
      durationSeconds: 2.5,
      text: "¡Hola, señor! 你好 🌎",
    },
  ],
};

function makeRequest(body: string): Request {
  return new Request("http://localhost/api/transcript", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

function expectExactErrorShape(json: unknown): void {
  expect(typeof json).toBe("object");
  expect(json).not.toBeNull();
  const body = json as { readonly error: Record<string, unknown> };
  expect(Object.keys(body)).toEqual(["error"]);
  expect(Object.keys(body.error).sort()).toEqual(["code", "message"]);
}

describe("POST /api/transcript", () => {
  beforeEach(() => {
    fetchTranscriptDocumentMock.mockReset();
  });

  describe("request validation", () => {
    it("returns the fixed malformed-JSON error without calling the service", async () => {
      const response = await POST(makeRequest("{not valid json"));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({
        error: { code: "INVALID_INPUT", message: "Request body must be valid JSON" },
      });
      expectExactErrorShape(json);
      expect(fetchTranscriptDocumentMock).not.toHaveBeenCalled();
    });

    const invalidBodies: ReadonlyArray<{ readonly name: string; readonly body: string }> = [
      { name: "JSON null", body: "null" },
      { name: "JSON array", body: "[]" },
      { name: "missing input", body: "{}" },
      { name: "numeric input", body: JSON.stringify({ input: 123 }) },
      { name: "boolean input", body: JSON.stringify({ input: true }) },
      { name: "empty string", body: JSON.stringify({ input: "" }) },
      { name: "whitespace-only string", body: JSON.stringify({ input: "   " }) },
      { name: "language selector", body: JSON.stringify({ input: VIDEO_ID, languageCode: "es" }) },
      { name: "provider selector", body: JSON.stringify({ input: VIDEO_ID, provider: "supadata" }) },
      { name: "timeout option", body: JSON.stringify({ input: VIDEO_ID, timeout: 1000 }) },
      { name: "options object", body: JSON.stringify({ input: VIDEO_ID, options: {} }) },
    ];

    for (const { name, body } of invalidBodies) {
      it(`returns the fixed schema error for ${name} without calling the service`, async () => {
        const response = await POST(makeRequest(body));
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json).toEqual({
          error: {
            code: "INVALID_INPUT",
            message: "Request body must be an object with a non-empty string 'input'",
          },
        });
        expectExactErrorShape(json);
        expect(fetchTranscriptDocumentMock).not.toHaveBeenCalled();
      });
    }

    it("never maps malformed or invalid bodies to UNKNOWN_ERROR", async () => {
      const bodies = ["{not valid json", ...invalidBodies.map(({ body }) => body)];

      for (const body of bodies) {
        const response = await POST(makeRequest(body));
        const json = await response.json();
        expect(response.status).toBe(400);
        expect(json.error.code).toBe("INVALID_INPUT");
      }

      expect(fetchTranscriptDocumentMock).not.toHaveBeenCalled();
    });
  });

  describe("successful response", () => {
    it.each([
      ["YouTube URL", VIDEO_URL],
      ["raw video ID", VIDEO_ID],
    ])("calls the orchestration service exactly once for a valid %s", async (_name, input) => {
      fetchTranscriptDocumentMock.mockResolvedValueOnce(SAMPLE_TRANSCRIPT_DOCUMENT);

      const response = await POST(makeRequest(JSON.stringify({ input })));

      expect(response.status).toBe(200);
      expect(fetchTranscriptDocumentMock).toHaveBeenCalledTimes(1);
      expect(fetchTranscriptDocumentMock).toHaveBeenCalledWith(input);
    });

    it("trims leading and trailing input whitespace before orchestration", async () => {
      fetchTranscriptDocumentMock.mockResolvedValueOnce(SAMPLE_TRANSCRIPT_DOCUMENT);

      await POST(makeRequest(JSON.stringify({ input: `  ${VIDEO_URL}  ` })));

      expect(fetchTranscriptDocumentMock).toHaveBeenCalledWith(VIDEO_URL);
    });

    it("returns only the transcript wrapper and preserves the normalized document", async () => {
      fetchTranscriptDocumentMock.mockResolvedValueOnce(SAMPLE_TRANSCRIPT_DOCUMENT);

      const response = await POST(makeRequest(JSON.stringify({ input: VIDEO_URL })));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ transcript: SAMPLE_TRANSCRIPT_DOCUMENT });
      expect(Object.keys(json)).toEqual(["transcript"]);
      expect(Object.keys(json.transcript).sort()).toEqual([
        "generationKind",
        "languageCode",
        "segments",
        "source",
        "videoId",
      ]);
      expect(json.transcript.segments[0]).toEqual({
        index: 0,
        startSeconds: 1.25,
        durationSeconds: 2.5,
        text: "¡Hola, señor! 你好 🌎",
      });
      expect(json).not.toHaveProperty("provider");
      expect(json).not.toHaveProperty("raw");
      expect(json).not.toHaveProperty("availableLangs");
      expect(json).not.toHaveProperty("timeoutMs");
      expect(json).not.toHaveProperty("input");
    });
  });

  describe("YouTube reference errors", () => {
    const referenceErrorCodes: readonly YoutubeVideoReferenceErrorCode[] = [
      "EMPTY_YOUTUBE_REFERENCE",
      "INVALID_YOUTUBE_REFERENCE",
      "UNSUPPORTED_YOUTUBE_HOST",
      "UNSUPPORTED_YOUTUBE_PATH",
      "MISSING_VIDEO_ID",
      "INVALID_VIDEO_ID",
    ];

    for (const code of referenceErrorCodes) {
      it(`maps ${code} to the fixed unsupported-reference response`, async () => {
        const privateMessage = `private parser detail for ${code}`;
        fetchTranscriptDocumentMock.mockRejectedValueOnce(
          new YoutubeVideoReferenceError(code, privateMessage),
        );

        const response = await POST(makeRequest(JSON.stringify({ input: VIDEO_URL })));
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json).toEqual({
          error: {
            code: "UNSUPPORTED_YOUTUBE_REFERENCE",
            message: "YouTube reference is not supported",
          },
        });
        expectExactErrorShape(json);
        expect(JSON.stringify(json)).not.toContain(privateMessage);
      });
    }
  });

  describe("transcript errors", () => {
    const cases: ReadonlyArray<{ readonly code: TranscriptErrorCode; readonly status: number }> = [
      { code: "TRANSCRIPT_NOT_FOUND", status: 404 },
      { code: "TRANSCRIPT_UNAVAILABLE", status: 422 },
      { code: "TRANSCRIPT_PROVIDER_TIMEOUT", status: 504 },
      { code: "TRANSCRIPT_PROVIDER_ERROR", status: 502 },
      { code: "INVALID_PROVIDER_RESPONSE", status: 502 },
      { code: "MISSING_TRANSCRIPT_PROVIDER_CONFIGURATION", status: 500 },
    ];

    for (const { code, status } of cases) {
      it(`maps ${code} to HTTP ${status} with its stable message`, async () => {
        const transcriptError = new TranscriptError(code);
        fetchTranscriptDocumentMock.mockRejectedValueOnce(transcriptError);

        const response = await POST(makeRequest(JSON.stringify({ input: VIDEO_ID })));
        const json = await response.json();

        expect(response.status).toBe(status);
        expect(json).toEqual({
          error: { code, message: transcriptError.message },
        });
        expectExactErrorShape(json);
      });
    }
  });

  describe("unknown errors and response safety", () => {
    it("returns only a fixed UNKNOWN_ERROR response without leaking arbitrary fields", async () => {
      const privateMessage = "private exception message";
      const privateCause = "private exception cause";
      const privateCredential = "private credential sentinel";
      const unknownError = Object.assign(new Error(privateMessage, { cause: privateCause }), {
        raw: "private raw body",
        provider: "private provider name",
        requestId: "private request identifier",
        credential: privateCredential,
        transcript: "private transcript data",
      });
      fetchTranscriptDocumentMock.mockRejectedValueOnce(unknownError);

      const response = await POST(makeRequest(JSON.stringify({ input: VIDEO_ID })));
      const json = await response.json();
      const serialized = JSON.stringify(json);

      expect(response.status).toBe(500);
      expect(json).toEqual({
        error: { code: "UNKNOWN_ERROR", message: "Unexpected server error" },
      });
      expectExactErrorShape(json);
      for (const privateValue of [
        privateMessage,
        privateCause,
        privateCredential,
        unknownError.raw,
        unknownError.provider,
        unknownError.requestId,
        unknownError.transcript,
      ]) {
        expect(serialized).not.toContain(privateValue);
      }
      expect(serialized).not.toContain("stack");
      expect(serialized).not.toContain("cause");
    });
  });
});
