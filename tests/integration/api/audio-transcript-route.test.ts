import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/transcript/fetch-audio-transcript", () => ({
  fetchAudioTranscriptDocument: vi.fn(),
}));

import { POST } from "@/app/api/transcript/audio/route";
import {
  AudioTranscriptError,
  type AudioTranscriptErrorCode,
} from "@/lib/transcript/audio-errors";
import { fetchAudioTranscriptDocument } from "@/lib/transcript/fetch-audio-transcript";
import type { TranscriptDocument } from "@/lib/transcript/types";

const fetchAudioTranscriptDocumentMock = vi.mocked(
  fetchAudioTranscriptDocument,
);

const SAMPLE_TRANSCRIPT_DOCUMENT: TranscriptDocument = {
  videoId: "audio-upload",
  languageCode: "english",
  source: "audio-transcription",
  generationKind: "auto-generated",
  segments: [
    {
      index: 0,
      startSeconds: 0,
      durationSeconds: 1.5,
      text: "Hello world",
    },
  ],
};

function makeAudioFile(name = "sample.mp3"): File {
  return new File(["audio-content"], name, {
    type: "audio/mpeg",
  });
}

function makeMultipartRequest(formData: FormData): Request {
  return new Request("http://localhost/api/transcript/audio", {
    method: "POST",
    body: formData,
  });
}

function expectExactErrorShape(json: unknown): void {
  expect(typeof json).toBe("object");
  expect(json).not.toBeNull();

  const body = json as {
    readonly error: Record<string, unknown>;
  };

  expect(Object.keys(body)).toEqual(["error"]);
  expect(Object.keys(body.error).sort()).toEqual([
    "code",
    "message",
  ]);
}

describe("POST /api/transcript/audio", () => {
  beforeEach(() => {
    fetchAudioTranscriptDocumentMock.mockReset();
  });

  describe("request validation", () => {
    it("rejects a non-multipart request without calling the service", async () => {
      const request = new Request(
        "http://localhost/api/transcript/audio",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ file: "sample.mp3" }),
        },
      );

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({
        error: {
          code: "INVALID_AUDIO_UPLOAD",
          message:
            "Request must contain exactly one audio or video file",
        },
      });
      expectExactErrorShape(json);
      expect(
        fetchAudioTranscriptDocumentMock,
      ).not.toHaveBeenCalled();
    });

    it("rejects a missing file without calling the service", async () => {
      const response = await POST(
        makeMultipartRequest(new FormData()),
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("INVALID_AUDIO_UPLOAD");
      expect(
        fetchAudioTranscriptDocumentMock,
      ).not.toHaveBeenCalled();
    });

    it("rejects a text value instead of a file", async () => {
      const formData = new FormData();
      formData.append("file", "sample.mp3");

      const response = await POST(
        makeMultipartRequest(formData),
      );

      expect(response.status).toBe(400);
      expect(
        fetchAudioTranscriptDocumentMock,
      ).not.toHaveBeenCalled();
    });

    it("rejects multiple files without calling the service", async () => {
      const formData = new FormData();
      formData.append("file", makeAudioFile("first.mp3"));
      formData.append("file", makeAudioFile("second.mp3"));

      const response = await POST(
        makeMultipartRequest(formData),
      );

      expect(response.status).toBe(400);
      expect(
        fetchAudioTranscriptDocumentMock,
      ).not.toHaveBeenCalled();
    });

    it("rejects extra form fields without calling the service", async () => {
      const formData = new FormData();
      formData.append("file", makeAudioFile());
      formData.append("provider", "openai");

      const response = await POST(
        makeMultipartRequest(formData),
      );

      expect(response.status).toBe(400);
      expect(
        fetchAudioTranscriptDocumentMock,
      ).not.toHaveBeenCalled();
    });
  });

  describe("successful response", () => {
    it("passes the uploaded file to the orchestration service exactly once", async () => {
      fetchAudioTranscriptDocumentMock.mockResolvedValueOnce(
        SAMPLE_TRANSCRIPT_DOCUMENT,
      );

      const formData = new FormData();
      const file = makeAudioFile();
      formData.append("file", file);

      const response = await POST(
        makeMultipartRequest(formData),
      );

      expect(response.status).toBe(200);
      expect(
        fetchAudioTranscriptDocumentMock,
      ).toHaveBeenCalledTimes(1);

      const receivedFile =
        fetchAudioTranscriptDocumentMock.mock.calls[0][0];

      expect(receivedFile).toBeInstanceOf(File);
      expect((receivedFile as File).name).toBe("sample.mp3");
    });

    it("returns only the normalized transcript wrapper", async () => {
      fetchAudioTranscriptDocumentMock.mockResolvedValueOnce(
        SAMPLE_TRANSCRIPT_DOCUMENT,
      );

      const formData = new FormData();
      formData.append("file", makeAudioFile());

      const response = await POST(
        makeMultipartRequest(formData),
      );
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({
        transcript: SAMPLE_TRANSCRIPT_DOCUMENT,
      });
      expect(Object.keys(json)).toEqual(["transcript"]);
      expect(json).not.toHaveProperty("provider");
      expect(json).not.toHaveProperty("raw");
      expect(json).not.toHaveProperty("file");
      expect(json).not.toHaveProperty("timeoutMs");
    });
  });

  describe("audio transcript errors", () => {
    const cases: ReadonlyArray<{
      readonly code: AudioTranscriptErrorCode;
      readonly status: number;
    }> = [
      { code: "INVALID_AUDIO_FILE", status: 400 },
      { code: "UNSUPPORTED_AUDIO_FORMAT", status: 415 },
      { code: "AUDIO_FILE_TOO_LARGE", status: 413 },
      { code: "AUDIO_TRANSCRIPT_NOT_FOUND", status: 404 },
      { code: "AUDIO_TRANSCRIPTION_TIMEOUT", status: 504 },
      {
        code: "AUDIO_TRANSCRIPTION_PROVIDER_ERROR",
        status: 502,
      },
      {
        code: "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
        status: 502,
      },
      {
        code: "MISSING_AUDIO_TRANSCRIPTION_CONFIGURATION",
        status: 500,
      },
    ];

    for (const { code, status } of cases) {
      it(`maps ${code} to HTTP ${status}`, async () => {
        const audioError = new AudioTranscriptError(code);

        fetchAudioTranscriptDocumentMock.mockRejectedValueOnce(
          audioError,
        );

        const formData = new FormData();
        formData.append("file", makeAudioFile());

        const response = await POST(
          makeMultipartRequest(formData),
        );
        const json = await response.json();

        expect(response.status).toBe(status);
        expect(json).toEqual({
          error: {
            code,
            message: audioError.message,
          },
        });
        expectExactErrorShape(json);
      });
    }
  });

  describe("unknown errors and response safety", () => {
    it("returns a fixed error without leaking private values", async () => {
      const privateMessage = "private provider message";
      const privateCredential = "private-api-key";
      const unknownError = Object.assign(
        new Error(privateMessage),
        {
          credential: privateCredential,
          raw: "private response body",
          requestId: "private request identifier",
        },
      );

      fetchAudioTranscriptDocumentMock.mockRejectedValueOnce(
        unknownError,
      );

      const formData = new FormData();
      formData.append("file", makeAudioFile());

      const response = await POST(
        makeMultipartRequest(formData),
      );
      const json = await response.json();
      const serialized = JSON.stringify(json);

      expect(response.status).toBe(500);
      expect(json).toEqual({
        error: {
          code: "UNKNOWN_ERROR",
          message: "Unexpected server error",
        },
      });
      expectExactErrorShape(json);

      for (const privateValue of [
        privateMessage,
        privateCredential,
        unknownError.raw,
        unknownError.requestId,
      ]) {
        expect(serialized).not.toContain(privateValue);
      }

      expect(serialized).not.toContain("stack");
      expect(serialized).not.toContain("cause");
    });
  });
});
