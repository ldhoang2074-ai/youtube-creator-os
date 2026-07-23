import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { TranscriptError, type TranscriptErrorCode } from "@/lib/transcript/errors";
import {
  DEFAULT_TRANSCRIPT_TIMEOUT_MS,
  fetchTranscriptDocument,
  MAX_TRANSCRIPT_NORMALIZED_CHARACTERS,
  MAX_TRANSCRIPT_SEGMENTS,
} from "@/lib/transcript/fetch-transcript";
import type {
  TranscriptProvider,
  TranscriptProviderPayload,
} from "@/lib/transcript/provider";
import type { TranscriptGenerationKind } from "@/lib/transcript/types";
import { YoutubeVideoReferenceError } from "@/lib/youtube/video-id-parser";

const VIDEO_ID = "dQw4w9WgXcQ";
const OTHER_VIDEO_ID = "AbCdEfGhI-J";

function makePayload(
  overrides: Partial<TranscriptProviderPayload> = {},
): TranscriptProviderPayload {
  return {
    languageCode: "en",
    generationKind: "unknown",
    segments: [{ startSeconds: 0, durationSeconds: 1, text: "Hello" }],
    ...overrides,
  };
}

function makeProvider(
  implementation: TranscriptProvider["fetchTranscript"] = async () => makePayload(),
): {
  readonly provider: TranscriptProvider;
  readonly fetchTranscript: ReturnType<typeof vi.fn<TranscriptProvider["fetchTranscript"]>>;
} {
  const fetchTranscript = vi.fn<TranscriptProvider["fetchTranscript"]>(implementation);
  return {
    provider: { id: "fake", fetchTranscript },
    fetchTranscript,
  };
}

async function captureError(action: () => Promise<unknown>): Promise<Error> {
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

async function expectTranscriptError(
  action: () => Promise<unknown>,
  code: TranscriptErrorCode,
): Promise<TranscriptError> {
  const error = await captureError(action);
  expect(error).toBeInstanceOf(TranscriptError);
  expect((error as TranscriptError).code).toBe(code);
  return error as TranscriptError;
}

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("fetchTranscriptDocument input parsing", () => {
  it.each([
    [`https://www.youtube.com/watch?v=${VIDEO_ID}`, VIDEO_ID],
    [`https://youtu.be/${VIDEO_ID}`, VIDEO_ID],
    [`https://www.youtube.com/shorts/${VIDEO_ID}`, VIDEO_ID],
    [VIDEO_ID, VIDEO_ID],
  ])("passes only the parsed video ID for %s", async (input, expectedVideoId) => {
    const { provider, fetchTranscript } = makeProvider();

    await fetchTranscriptDocument(input, { provider });

    expect(fetchTranscript).toHaveBeenCalledTimes(1);
    const request = fetchTranscript.mock.calls[0][0];
    expect(request.videoId).toBe(expectedVideoId);
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(Object.keys(request).sort()).toEqual(["signal", "videoId"]);
    if (input !== expectedVideoId) {
      expect(Object.values(request)).not.toContain(input);
    }
  });

  it.each([
    [`https://example.com/watch?v=${VIDEO_ID}`, "UNSUPPORTED_YOUTUBE_HOST"],
    ["https://www.youtube.com/channel/UC123", "UNSUPPORTED_YOUTUBE_PATH"],
  ] as const)("rejects unsupported reference %s before calling the provider", async (input, code) => {
    const { provider, fetchTranscript } = makeProvider();

    const error = await captureError(() => fetchTranscriptDocument(input, { provider }));

    expect(error).toBeInstanceOf(YoutubeVideoReferenceError);
    expect((error as YoutubeVideoReferenceError).code).toBe(code);
    expect(fetchTranscript).not.toHaveBeenCalled();
  });

  it("uses the parsed video ID instead of a provider-supplied extra video ID", async () => {
    const payload = { ...makePayload(), videoId: OTHER_VIDEO_ID };
    const { provider } = makeProvider(async () => payload);

    const document = await fetchTranscriptDocument(VIDEO_ID, { provider });

    expect(document.videoId).toBe(VIDEO_ID);
  });
});

describe("fetchTranscriptDocument normalization", () => {
  it("maps provider metadata and normalizes only through the transcript domain", async () => {
    const segments = [
      { index: 99, startSeconds: 0, durationSeconds: 1, text: "  First  " },
      { index: 42, startSeconds: 1, durationSeconds: 2, text: "  Second  " },
    ];
    const { provider } = makeProvider(async () =>
      makePayload({ languageCode: "es", generationKind: "unknown", segments }),
    );

    const document = await fetchTranscriptDocument(VIDEO_ID, { provider });

    expect(document).toEqual({
      videoId: VIDEO_ID,
      languageCode: "es",
      source: "youtube-captions",
      generationKind: "unknown",
      segments: [
        { index: 0, startSeconds: 0, durationSeconds: 1, text: "First" },
        { index: 1, startSeconds: 1, durationSeconds: 2, text: "Second" },
      ],
    });
    expect(Object.isFrozen(document)).toBe(true);
    expect(Object.isFrozen(document.segments)).toBe(true);
    expect(document.segments.every(Object.isFrozen)).toBe(true);
  });

  it("preserves Spanish and Unicode text", async () => {
    const { provider } = makeProvider(async () =>
      makePayload({
        languageCode: "es",
        segments: [{ startSeconds: 0, durationSeconds: 1, text: "  ¡Hola, señor! 你好 🌎  " }],
      }),
    );

    const document = await fetchTranscriptDocument(VIDEO_ID, { provider });

    expect(document.languageCode).toBe("es");
    expect(document.segments[0]?.text).toBe("¡Hola, señor! 你好 🌎");
  });

  it("preserves duplicate timestamps and overlapping segments in source order", async () => {
    const { provider } = makeProvider(async () =>
      makePayload({
        segments: [
          { startSeconds: 1, durationSeconds: 5, text: "First" },
          { startSeconds: 1, durationSeconds: 1, text: "Second" },
          { startSeconds: 3, durationSeconds: 1, text: "Third" },
        ],
      }),
    );

    const document = await fetchTranscriptDocument(VIDEO_ID, { provider });

    expect(document.segments.map(({ startSeconds, durationSeconds, text }) => ({
      startSeconds,
      durationSeconds,
      text,
    }))).toEqual([
      { startSeconds: 1, durationSeconds: 5, text: "First" },
      { startSeconds: 1, durationSeconds: 1, text: "Second" },
      { startSeconds: 3, durationSeconds: 1, text: "Third" },
    ]);
  });

  it("maps decreasing timestamps to an invalid provider response", async () => {
    const { provider } = makeProvider(async () =>
      makePayload({
        segments: [
          { startSeconds: 2, durationSeconds: 1, text: "First" },
          { startSeconds: 1, durationSeconds: 1, text: "Second" },
        ],
      }),
    );

    await expectTranscriptError(
      () => fetchTranscriptDocument(VIDEO_ID, { provider }),
      "INVALID_PROVIDER_RESPONSE",
    );
  });

  it("maps blank segment text to an invalid provider response", async () => {
    const { provider } = makeProvider(async () =>
      makePayload({ segments: [{ startSeconds: 0, durationSeconds: 1, text: "   " }] }),
    );

    await expectTranscriptError(
      () => fetchTranscriptDocument(VIDEO_ID, { provider }),
      "INVALID_PROVIDER_RESPONSE",
    );
  });

  it("maps invalid timestamps to an invalid provider response", async () => {
    const { provider } = makeProvider(async () =>
      makePayload({ segments: [{ startSeconds: -1, durationSeconds: 1, text: "Invalid" }] }),
    );

    await expectTranscriptError(
      () => fetchTranscriptDocument(VIDEO_ID, { provider }),
      "INVALID_PROVIDER_RESPONSE",
    );
  });

  it("maps an invalid language code to an invalid provider response", async () => {
    const { provider } = makeProvider(async () => makePayload({ languageCode: "   " }));

    await expectTranscriptError(
      () => fetchTranscriptDocument(VIDEO_ID, { provider }),
      "INVALID_PROVIDER_RESPONSE",
    );
  });

  it("maps an invalid generation kind to an invalid provider response", async () => {
    const generationKind = "provider-specific" as TranscriptGenerationKind;
    const { provider } = makeProvider(async () => makePayload({ generationKind }));

    await expectTranscriptError(
      () => fetchTranscriptDocument(VIDEO_ID, { provider }),
      "INVALID_PROVIDER_RESPONSE",
    );
  });
});

describe("fetchTranscriptDocument limits", () => {
  it("maps an empty provider payload to transcript not found", async () => {
    const { provider } = makeProvider(async () => makePayload({ segments: [] }));

    await expectTranscriptError(
      () => fetchTranscriptDocument(VIDEO_ID, { provider }),
      "TRANSCRIPT_NOT_FOUND",
    );
  });

  it("accepts exactly the maximum segment count", async () => {
    const segments = Array.from({ length: MAX_TRANSCRIPT_SEGMENTS }, (_, index) => ({
      startSeconds: index,
      durationSeconds: 1,
      text: "x",
    }));
    const { provider } = makeProvider(async () => makePayload({ segments }));

    const document = await fetchTranscriptDocument(VIDEO_ID, { provider });

    expect(document.segments).toHaveLength(MAX_TRANSCRIPT_SEGMENTS);
  });

  it("rejects one segment above the maximum", async () => {
    const segments = Array.from({ length: MAX_TRANSCRIPT_SEGMENTS + 1 }, (_, index) => ({
      startSeconds: index,
      durationSeconds: 1,
      text: "x",
    }));
    const { provider } = makeProvider(async () => makePayload({ segments }));

    await expectTranscriptError(
      () => fetchTranscriptDocument(VIDEO_ID, { provider }),
      "INVALID_PROVIDER_RESPONSE",
    );
  });

  it("accepts exactly the maximum normalized character count", async () => {
    const text = `  ${"x".repeat(MAX_TRANSCRIPT_NORMALIZED_CHARACTERS)}  `;
    const { provider } = makeProvider(async () =>
      makePayload({ segments: [{ startSeconds: 0, durationSeconds: 1, text }] }),
    );

    const document = await fetchTranscriptDocument(VIDEO_ID, { provider });

    expect(document.segments[0]?.text.length).toBe(MAX_TRANSCRIPT_NORMALIZED_CHARACTERS);
  });

  it("rejects one normalized character above the maximum", async () => {
    const text = "x".repeat(MAX_TRANSCRIPT_NORMALIZED_CHARACTERS + 1);
    const { provider } = makeProvider(async () =>
      makePayload({ segments: [{ startSeconds: 0, durationSeconds: 1, text }] }),
    );

    await expectTranscriptError(
      () => fetchTranscriptDocument(VIDEO_ID, { provider }),
      "INVALID_PROVIDER_RESPONSE",
    );
  });

  it("counts exactly one ASCII separator between normalized segments", async () => {
    const first = "a".repeat(250000);
    const secondAtLimit = "b".repeat(249999);
    const secondAboveLimit = "b".repeat(250000);
    const atLimit = makeProvider(async () =>
      makePayload({
        segments: [
          { startSeconds: 0, durationSeconds: 1, text: ` ${first} ` },
          { startSeconds: 1, durationSeconds: 1, text: ` ${secondAtLimit} ` },
        ],
      }),
    );
    const aboveLimit = makeProvider(async () =>
      makePayload({
        segments: [
          { startSeconds: 0, durationSeconds: 1, text: first },
          { startSeconds: 1, durationSeconds: 1, text: secondAboveLimit },
        ],
      }),
    );

    await expect(fetchTranscriptDocument(VIDEO_ID, { provider: atLimit.provider })).resolves.toBeDefined();
    await expectTranscriptError(
      () => fetchTranscriptDocument(VIDEO_ID, { provider: aboveLimit.provider }),
      "INVALID_PROVIDER_RESPONSE",
    );
  });
});

describe("fetchTranscriptDocument timeout behavior", () => {
  it("uses the exported 8-second default and aborts with a stable timeout error", async () => {
    vi.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;
    const { provider } = makeProvider(
      ({ signal }) => {
        receivedSignal = signal;
        return new Promise<TranscriptProviderPayload>(() => undefined);
      },
    );
    const outcome = fetchTranscriptDocument(VIDEO_ID, { provider }).catch((error: unknown) => error);

    expect(DEFAULT_TRANSCRIPT_TIMEOUT_MS).toBe(8000);
    await vi.advanceTimersByTimeAsync(DEFAULT_TRANSCRIPT_TIMEOUT_MS - 1);
    expect(receivedSignal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const error = await outcome;

    expect(receivedSignal?.aborted).toBe(true);
    expect(error).toBeInstanceOf(TranscriptError);
    expect((error as TranscriptError).code).toBe("TRANSCRIPT_PROVIDER_TIMEOUT");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not allow a provider that ignores AbortSignal to return success after timeout", async () => {
    vi.useFakeTimers();
    let resolveProvider!: (payload: TranscriptProviderPayload) => void;
    const { provider } = makeProvider(
      () =>
        new Promise<TranscriptProviderPayload>((resolve) => {
          resolveProvider = resolve;
        }),
    );
    const outcome = fetchTranscriptDocument(VIDEO_ID, { provider, timeoutMs: 25 }).catch(
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(25);
    const error = await outcome;
    resolveProvider(makePayload());
    await Promise.resolve();

    expect(error).toBeInstanceOf(TranscriptError);
    expect((error as TranscriptError).code).toBe("TRANSCRIPT_PROVIDER_TIMEOUT");
  });

  it("clears the timeout after success", async () => {
    vi.useFakeTimers();
    const { provider } = makeProvider();

    await fetchTranscriptDocument(VIDEO_ID, { provider, timeoutMs: 25 });

    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the timeout after a provider error", async () => {
    vi.useFakeTimers();
    const providerError = new TranscriptError("TRANSCRIPT_UNAVAILABLE");
    const { provider } = makeProvider(async () => {
      throw providerError;
    });

    await expectTranscriptError(
      () => fetchTranscriptDocument(VIDEO_ID, { provider, timeoutMs: 25 }),
      "TRANSCRIPT_UNAVAILABLE",
    );

    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid timeout %s without calling the provider",
    async (timeoutMs) => {
      const { provider, fetchTranscript } = makeProvider();

      await expectTranscriptError(
        () => fetchTranscriptDocument(VIDEO_ID, { provider, timeoutMs }),
        "TRANSCRIPT_PROVIDER_ERROR",
      );

      expect(fetchTranscript).not.toHaveBeenCalled();
    },
  );
});

describe("fetchTranscriptDocument provider error translation", () => {
  it("preserves an existing provider TranscriptError instance", async () => {
    const providerError = new TranscriptError("TRANSCRIPT_UNAVAILABLE");
    const { provider } = makeProvider(async () => {
      throw providerError;
    });

    const error = await captureError(() => fetchTranscriptDocument(VIDEO_ID, { provider }));

    expect(error).toBe(providerError);
  });

  it("maps unknown provider exceptions without exposing their message or cause", async () => {
    const privateMessage = "private provider body and request identifier";
    const { provider } = makeProvider(async () => {
      throw new Error(privateMessage);
    });

    const error = await expectTranscriptError(
      () => fetchTranscriptDocument(VIDEO_ID, { provider }),
      "TRANSCRIPT_PROVIDER_ERROR",
    );

    expect(error.message).not.toContain(privateMessage);
    expect(error.cause).toBeUndefined();
  });
});
