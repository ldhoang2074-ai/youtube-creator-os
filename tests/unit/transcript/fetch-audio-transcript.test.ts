import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AudioTranscriptError,
  type AudioTranscriptErrorCode,
} from "@/lib/transcript/audio-errors";
import type {
  AudioTranscriptProvider,
  AudioTranscriptProviderPayload,
} from "@/lib/transcript/audio-provider";
import {
  DEFAULT_AUDIO_TRANSCRIPT_TIMEOUT_MS,
  MAX_AUDIO_TRANSCRIPT_NORMALIZED_CHARACTERS,
  MAX_AUDIO_TRANSCRIPT_SEGMENTS,
  fetchAudioTranscriptDocument,
} from "@/lib/transcript/fetch-audio-transcript";

function makeFile(): File {
  return new File(["audio-content"], "sample.mp3", {
    type: "audio/mpeg",
  });
}

function makePayload(
  overrides: Partial<AudioTranscriptProviderPayload> = {},
): AudioTranscriptProviderPayload {
  return {
    languageCode: "english",
    generationKind: "auto-generated",
    segments: [
      {
        startSeconds: 0,
        durationSeconds: 1.5,
        text: "Hello world",
      },
    ],
    ...overrides,
  };
}

function makeProvider(
  implementation: AudioTranscriptProvider["transcribe"] = async () =>
    makePayload(),
): {
  readonly provider: AudioTranscriptProvider;
  readonly transcribe: ReturnType<
    typeof vi.fn<AudioTranscriptProvider["transcribe"]>
  >;
} {
  const transcribe =
    vi.fn<AudioTranscriptProvider["transcribe"]>(implementation);

  return {
    provider: {
      id: "fake-audio",
      transcribe,
    },
    transcribe,
  };
}

async function captureError(
  action: () => Promise<unknown>,
): Promise<Error> {
  try {
    await action();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }

    throw error;
  }

  throw new Error("Expected action to throw");
}

async function expectAudioError(
  action: () => Promise<unknown>,
  code: AudioTranscriptErrorCode,
): Promise<AudioTranscriptError> {
  const error = await captureError(action);

  expect(error).toBeInstanceOf(AudioTranscriptError);
  expect((error as AudioTranscriptError).code).toBe(code);

  return error as AudioTranscriptError;
}

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("fetchAudioTranscriptDocument", () => {
  it("passes only the validated file and abort signal to the provider", async () => {
    const file = makeFile();
    const { provider, transcribe } = makeProvider();

    await fetchAudioTranscriptDocument(file, { provider });

    expect(transcribe).toHaveBeenCalledTimes(1);

    const request = transcribe.mock.calls[0][0];

    expect(request.file).toBe(file);
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(Object.keys(request).sort()).toEqual(["file", "signal"]);
  });

  it("normalizes the provider payload into an immutable audio transcript", async () => {
    const { provider } = makeProvider(async () =>
      makePayload({
        languageCode: "spanish",
        segments: [
          {
            startSeconds: 0,
            durationSeconds: 1,
            text: "  Hola  ",
          },
          {
            startSeconds: 1,
            durationSeconds: 2,
            text: "  Mundo  ",
          },
        ],
      }),
    );

    const document = await fetchAudioTranscriptDocument(
      makeFile(),
      { provider },
    );

    expect(document).toEqual({
      videoId: "audio-upload",
      languageCode: "spanish",
      source: "audio-transcription",
      generationKind: "auto-generated",
      segments: [
        {
          index: 0,
          startSeconds: 0,
          durationSeconds: 1,
          text: "Hola",
        },
        {
          index: 1,
          startSeconds: 1,
          durationSeconds: 2,
          text: "Mundo",
        },
      ],
    });

    expect(Object.isFrozen(document)).toBe(true);
    expect(Object.isFrozen(document.segments)).toBe(true);
    expect(document.segments.every(Object.isFrozen)).toBe(true);
  });

  it("rejects an invalid file before calling the provider", async () => {
    const { provider, transcribe } = makeProvider();

    await expectAudioError(
      () => fetchAudioTranscriptDocument(null, { provider }),
      "INVALID_AUDIO_FILE",
    );

    expect(transcribe).not.toHaveBeenCalled();
  });

  it("maps an empty provider payload to transcript not found", async () => {
    const { provider } = makeProvider(async () =>
      makePayload({ segments: [] }),
    );

    await expectAudioError(
      () => fetchAudioTranscriptDocument(makeFile(), { provider }),
      "AUDIO_TRANSCRIPT_NOT_FOUND",
    );
  });

  it("maps invalid provider data to an invalid response", async () => {
    const { provider } = makeProvider(async () =>
      makePayload({
        segments: [
          {
            startSeconds: 2,
            durationSeconds: 1,
            text: "First",
          },
          {
            startSeconds: 1,
            durationSeconds: 1,
            text: "Second",
          },
        ],
      }),
    );

    await expectAudioError(
      () => fetchAudioTranscriptDocument(makeFile(), { provider }),
      "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
    );
  });

  it("rejects provider payloads that exceed the segment limit", async () => {
    const { provider } = makeProvider(async () =>
      makePayload({
        segments: Array.from(
          { length: MAX_AUDIO_TRANSCRIPT_SEGMENTS + 1 },
          (_, index) => ({
            startSeconds: index,
            durationSeconds: 1,
            text: `Segment ${index}`,
          }),
        ),
      }),
    );

    await expectAudioError(
      () => fetchAudioTranscriptDocument(makeFile(), { provider }),
      "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
    );
  });

  it("rejects provider payloads that exceed the character limit", async () => {
    const { provider } = makeProvider(async () =>
      makePayload({
        segments: [
          {
            startSeconds: 0,
            durationSeconds: 1,
            text: "x".repeat(
              MAX_AUDIO_TRANSCRIPT_NORMALIZED_CHARACTERS + 1,
            ),
          },
        ],
      }),
    );

    await expectAudioError(
      () => fetchAudioTranscriptDocument(makeFile(), { provider }),
      "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
    );
  });

  it("uses the exported default timeout and aborts a hanging provider", async () => {
    vi.useFakeTimers();

    let receivedSignal: AbortSignal | undefined;

    const { provider } = makeProvider(({ signal }) => {
      receivedSignal = signal;
      return new Promise<AudioTranscriptProviderPayload>(
        () => undefined,
      );
    });

    const outcome = fetchAudioTranscriptDocument(
      makeFile(),
      { provider },
    ).catch((error: unknown) => error);

    expect(DEFAULT_AUDIO_TRANSCRIPT_TIMEOUT_MS).toBe(120000);

    await vi.advanceTimersByTimeAsync(
      DEFAULT_AUDIO_TRANSCRIPT_TIMEOUT_MS,
    );

    const error = await outcome;

    expect(receivedSignal?.aborted).toBe(true);
    expect(error).toBeInstanceOf(AudioTranscriptError);
    expect((error as AudioTranscriptError).code).toBe(
      "AUDIO_TRANSCRIPTION_TIMEOUT",
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid timeout %s without calling the provider",
    async (timeoutMs) => {
      const { provider, transcribe } = makeProvider();

      await expectAudioError(
        () =>
          fetchAudioTranscriptDocument(makeFile(), {
            provider,
            timeoutMs,
          }),
        "AUDIO_TRANSCRIPTION_PROVIDER_ERROR",
      );

      expect(transcribe).not.toHaveBeenCalled();
    },
  );

  it("preserves an existing audio provider error", async () => {
    const providerError = new AudioTranscriptError(
      "AUDIO_TRANSCRIPT_NOT_FOUND",
    );
    const { provider } = makeProvider(async () => {
      throw providerError;
    });

    const error = await captureError(() =>
      fetchAudioTranscriptDocument(makeFile(), { provider }),
    );

    expect(error).toBe(providerError);
  });

  it("hides unknown provider error details", async () => {
    const privateMessage = "private provider response";
    const { provider } = makeProvider(async () => {
      throw new Error(privateMessage);
    });

    const error = await expectAudioError(
      () => fetchAudioTranscriptDocument(makeFile(), { provider }),
      "AUDIO_TRANSCRIPTION_PROVIDER_ERROR",
    );

    expect(error.message).not.toContain(privateMessage);
    expect(error.cause).toBeUndefined();
  });
});
