import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AudioTranscriptError } from "@/lib/transcript/audio-errors";
import { openAiAudioTranscriptProvider } from "@/lib/transcript/providers/openai-audio";

let testCredential = "";

function makeAudioFile(): File {
  return new File(["audio-content"], "sample.mp3", {
    type: "audio/mpeg",
  });
}

function makeTranscriptBody(): unknown {
  return {
    language: "english",
    duration: 4,
    text: "Hello world. Second segment.",
    segments: [
      {
        start: 0,
        end: 1.5,
        text: " Hello world. ",
      },
      {
        start: 1.5,
        end: 4,
        text: " Second segment. ",
      },
    ],
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installFetchMock(): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function transcribe(
  signal = new AbortController().signal,
) {
  return openAiAudioTranscriptProvider.transcribe({
    file: makeAudioFile(),
    signal,
  });
}

async function captureError(
  action: () => Promise<unknown>,
): Promise<AudioTranscriptError> {
  try {
    await action();
  } catch (error) {
    if (error instanceof AudioTranscriptError) {
      return error;
    }

    throw error;
  }

  throw new Error("Expected action to throw AudioTranscriptError");
}

beforeEach(() => {
  testCredential = `unit-test-${randomUUID()}`;
  vi.stubEnv("OPENAI_API_KEY", testCredential);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  testCredential = "";
});

describe("openAiAudioTranscriptProvider", () => {
  it("maps a valid verbose transcript into normalized segments", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, makeTranscriptBody()),
    );

    await expect(transcribe()).resolves.toEqual({
      languageCode: "english",
      generationKind: "auto-generated",
      segments: [
        {
          startSeconds: 0,
          durationSeconds: 1.5,
          text: "Hello world.",
        },
        {
          startSeconds: 1.5,
          durationSeconds: 2.5,
          text: "Second segment.",
        },
      ],
    });
  });

  it("sends the approved endpoint, authorization header, and multipart fields", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, makeTranscriptBody()),
    );

    await transcribe();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [input, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);

    expect(String(input)).toBe(
      "https://api.openai.com/v1/audio/transcriptions",
    );
    expect(init?.method).toBe("POST");
    expect(headers.get("authorization")).toBe(
      `Bearer ${testCredential}`,
    );
    expect(headers.has("content-type")).toBe(false);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.body).toBeInstanceOf(FormData);

    const formData = init?.body as FormData;
    const uploadedFile = formData.get("file");

    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe("sample.mp3");
    expect(formData.get("model")).toBe("whisper-1");
    expect(formData.get("response_format")).toBe("verbose_json");
    expect(formData.get("timestamp_granularities[]")).toBe(
      "segment",
    );
    expect(String(input)).not.toContain(testCredential);
  });

  it.each([undefined, "   "])(
    "rejects missing or blank provider configuration",
    async (configuration) => {
      vi.stubEnv("OPENAI_API_KEY", configuration);
      const fetchMock = installFetchMock();

      const error = await captureError(transcribe);

      expect(error.code).toBe(
        "MISSING_AUDIO_TRANSCRIPTION_CONFIGURATION",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("maps an empty segment list to transcript not found", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        language: "english",
        duration: 0,
        text: "",
        segments: [],
      }),
    );

    const error = await captureError(transcribe);

    expect(error.code).toBe("AUDIO_TRANSCRIPT_NOT_FOUND");
  });

  it("maps HTTP failures to a stable provider error", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, {
        message: "private provider detail",
      }),
    );

    const error = await captureError(transcribe);

    expect(error.code).toBe(
      "AUDIO_TRANSCRIPTION_PROVIDER_ERROR",
    );
    expect(error.message).not.toContain("private provider detail");
  });

  it("maps network failures to a stable provider error", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockRejectedValueOnce(
      new Error("private network detail"),
    );

    const error = await captureError(transcribe);

    expect(error.code).toBe(
      "AUDIO_TRANSCRIPTION_PROVIDER_ERROR",
    );
    expect(error.message).not.toContain("private network detail");
  });

  it("maps an aborted request to a timeout error", async () => {
    const fetchMock = installFetchMock();
    const controller = new AbortController();
    const abortError = new Error("private abort detail");
    abortError.name = "AbortError";
    controller.abort();
    fetchMock.mockRejectedValueOnce(abortError);

    const error = await captureError(() =>
      transcribe(controller.signal),
    );

    expect(error.code).toBe("AUDIO_TRANSCRIPTION_TIMEOUT");
    expect(error.message).not.toContain("private abort detail");
  });

  it("rejects invalid JSON", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      new Response("{not-json", { status: 200 }),
    );

    const error = await captureError(transcribe);

    expect(error.code).toBe(
      "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
    );
  });

  it("rejects an invalid response schema", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        language: "",
        segments: [{ start: 2, end: 1, text: "Invalid" }],
      }),
    );

    const error = await captureError(transcribe);

    expect(error.code).toBe(
      "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
    );
  });

  it("does not expose the credential in thrown errors", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockRejectedValueOnce(new Error(testCredential));

    const error = await captureError(transcribe);

    expect(error.message).not.toContain(testCredential);
    expect(error.stack).not.toContain(testCredential);
  });
});
