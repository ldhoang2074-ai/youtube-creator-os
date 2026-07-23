import { describe, expect, it } from "vitest";
import {
  createTranscriptDocument,
  getTranscriptDurationSeconds,
  getTranscriptPlainText,
  getTranscriptSegmentEndSeconds,
  TranscriptDomainError,
  type TranscriptDomainErrorCode,
} from "@/lib/transcript/domain";
import type {
  TranscriptDocumentInput,
  TranscriptGenerationKind,
} from "@/lib/transcript/types";

function makeInput(overrides: Partial<TranscriptDocumentInput> = {}): TranscriptDocumentInput {
  return {
    videoId: "video-1",
    languageCode: "en",
    source: "manual",
    generationKind: "manual",
    segments: [
      { startSeconds: 0, durationSeconds: 2, text: "First" },
      { startSeconds: 2, durationSeconds: 3, text: "Second" },
    ],
    ...overrides,
  };
}

function captureError(fn: () => unknown): TranscriptDomainError {
  try {
    fn();
  } catch (error) {
    if (error instanceof TranscriptDomainError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected function to throw TranscriptDomainError");
}

function expectErrorCode(input: TranscriptDocumentInput, code: TranscriptDomainErrorCode): void {
  expect(captureError(() => createTranscriptDocument(input)).code).toBe(code);
}

describe("createTranscriptDocument", () => {
  it("creates a valid provider-agnostic transcript document", () => {
    expect(createTranscriptDocument(makeInput())).toEqual({
      videoId: "video-1",
      languageCode: "en",
      source: "manual",
      generationKind: "manual",
      segments: [
        { index: 0, startSeconds: 0, durationSeconds: 2, text: "First" },
        { index: 1, startSeconds: 2, durationSeconds: 3, text: "Second" },
      ],
    });
  });

  it.each(["manual", "auto-generated", "unknown"] as const)(
    "accepts the %s transcript generation kind",
    (generationKind: TranscriptGenerationKind) => {
      expect(createTranscriptDocument(makeInput({ generationKind })).generationKind).toBe(
        generationKind,
      );
    },
  );

  it("trims document identifiers and segment text", () => {
    const document = createTranscriptDocument(
      makeInput({
        videoId: "  video-1  ",
        languageCode: "  en-US  ",
        segments: [{ startSeconds: 0, durationSeconds: 1, text: "  Hello world  " }],
      }),
    );

    expect(document.videoId).toBe("video-1");
    expect(document.languageCode).toBe("en-US");
    expect(document.segments[0]?.text).toBe("Hello world");
  });

  it("assigns zero-based indexes instead of trusting index-like input fields", () => {
    const segments = [
      { index: 99, startSeconds: 0, durationSeconds: 1, text: "A" },
      { index: 42, startSeconds: 1, durationSeconds: 1, text: "B" },
      { index: -1, startSeconds: 2, durationSeconds: 1, text: "C" },
    ];

    const document = createTranscriptDocument(makeInput({ segments }));

    expect(document.segments.map((segment) => segment.index)).toEqual([0, 1, 2]);
  });

  it("preserves source order", () => {
    const document = createTranscriptDocument(
      makeInput({
        segments: [
          { startSeconds: 1, durationSeconds: 1, text: "First in source" },
          { startSeconds: 1, durationSeconds: 1, text: "Second in source" },
          { startSeconds: 2, durationSeconds: 1, text: "Third in source" },
        ],
      }),
    );

    expect(document.segments.map((segment) => segment.text)).toEqual([
      "First in source",
      "Second in source",
      "Third in source",
    ]);
  });

  it("allows segments with equal startSeconds", () => {
    const document = createTranscriptDocument(
      makeInput({
        segments: [
          { startSeconds: 1, durationSeconds: 1, text: "A" },
          { startSeconds: 1, durationSeconds: 1, text: "B" },
        ],
      }),
    );

    expect(document.segments).toHaveLength(2);
  });

  it("allows overlapping caption segments", () => {
    const document = createTranscriptDocument(
      makeInput({
        segments: [
          { startSeconds: 0, durationSeconds: 10, text: "A" },
          { startSeconds: 5, durationSeconds: 2, text: "B" },
        ],
      }),
    );

    expect(document.segments).toHaveLength(2);
  });

  it("rejects decreasing startSeconds without sorting the input", () => {
    const input = makeInput({
      segments: [
        { startSeconds: 2, durationSeconds: 1, text: "A" },
        { startSeconds: 1, durationSeconds: 1, text: "B" },
      ],
    });

    expectErrorCode(input, "UNSORTED_SEGMENTS");
  });

  it.each([
    [Number.NaN, "INVALID_SEGMENT_START"],
    [Number.POSITIVE_INFINITY, "INVALID_SEGMENT_START"],
    [-1, "INVALID_SEGMENT_START"],
  ] as const)("rejects invalid startSeconds %s", (startSeconds, code) => {
    expectErrorCode(
      makeInput({ segments: [{ startSeconds, durationSeconds: 1, text: "A" }] }),
      code,
    );
  });

  it.each([
    [Number.NaN, "INVALID_SEGMENT_DURATION"],
    [Number.POSITIVE_INFINITY, "INVALID_SEGMENT_DURATION"],
    [-1, "INVALID_SEGMENT_DURATION"],
  ] as const)("rejects invalid durationSeconds %s", (durationSeconds, code) => {
    expectErrorCode(
      makeInput({ segments: [{ startSeconds: 0, durationSeconds, text: "A" }] }),
      code,
    );
  });

  it("rejects finite segment values whose derived end time overflows", () => {
    expectErrorCode(
      makeInput({
        segments: [
          {
            startSeconds: Number.MAX_VALUE,
            durationSeconds: Number.MAX_VALUE,
            text: "A",
          },
        ],
      }),
      "INVALID_SEGMENT_DURATION",
    );
  });

  it("allows a zero-duration segment", () => {
    const document = createTranscriptDocument(
      makeInput({ segments: [{ startSeconds: 3, durationSeconds: 0, text: "Instant" }] }),
    );

    expect(document.segments[0]?.durationSeconds).toBe(0);
  });

  it("rejects empty segment text without reflecting transcript content in the error", () => {
    const error = captureError(() =>
      createTranscriptDocument(
        makeInput({ segments: [{ startSeconds: 0, durationSeconds: 1, text: "   " }] }),
      ),
    );

    expect(error.code).toBe("EMPTY_SEGMENT_TEXT");
    expect(error.message).not.toContain("   ");
  });

  it("rejects empty videoId", () => {
    expectErrorCode(makeInput({ videoId: "   " }), "INVALID_VIDEO_ID");
  });

  it("rejects empty languageCode", () => {
    expectErrorCode(makeInput({ languageCode: "   " }), "INVALID_LANGUAGE_CODE");
  });

  it("rejects an empty transcript", () => {
    expectErrorCode(makeInput({ segments: [] }), "EMPTY_TRANSCRIPT");
  });

  it("rejects an unsupported source with a stable provider-agnostic error", () => {
    // The assertion deliberately crosses the static type boundary so the
    // factory's runtime defense can be tested against external/untyped input.
    const invalidInput = {
      ...makeInput(),
      source: "provider-specific",
    } as unknown as TranscriptDocumentInput;

    const error = captureError(() => createTranscriptDocument(invalidInput));

    expect(error.code).toBe("INVALID_TRANSCRIPT_SOURCE");
    expect(error.message).not.toContain("provider-specific");
  });

  it("rejects an unsupported generation kind with a stable provider-agnostic error", () => {
    const invalidInput = {
      ...makeInput(),
      generationKind: "provider-specific",
    } as unknown as TranscriptDocumentInput;

    const error = captureError(() => createTranscriptDocument(invalidInput));

    expect(error.code).toBe("INVALID_TRANSCRIPT_GENERATION_KIND");
    expect(error.message).not.toContain("provider-specific");
  });

  it("makes defensive copies of the input array and segment objects", () => {
    const segments = [{ startSeconds: 0, durationSeconds: 1, text: "Original" }];
    const document = createTranscriptDocument(makeInput({ segments }));

    segments.push({ startSeconds: 2, durationSeconds: 1, text: "Added later" });
    segments[0].startSeconds = 99;
    segments[0].text = "Mutated";

    expect(document.segments).toEqual([
      { index: 0, startSeconds: 0, durationSeconds: 1, text: "Original" },
    ]);
  });

  it("freezes the document, segment collection, and individual segments", () => {
    const document = createTranscriptDocument(makeInput());

    expect(Object.isFrozen(document)).toBe(true);
    expect(Object.isFrozen(document.segments)).toBe(true);
    expect(document.segments.every(Object.isFrozen)).toBe(true);
  });
});

describe("transcript helpers", () => {
  it("calculates a segment end from startSeconds plus durationSeconds", () => {
    const document = createTranscriptDocument(
      makeInput({ segments: [{ startSeconds: 4, durationSeconds: 3, text: "A" }] }),
    );

    expect(getTranscriptSegmentEndSeconds(document.segments[0])).toBe(7);
  });

  it("uses the maximum segment end as transcript duration instead of summing durations", () => {
    const document = createTranscriptDocument(
      makeInput({
        segments: [
          { startSeconds: 0, durationSeconds: 20, text: "A" },
          { startSeconds: 10, durationSeconds: 3, text: "B" },
          { startSeconds: 12, durationSeconds: 2, text: "C" },
        ],
      }),
    );
    const sourceOrder = document.segments.map((segment) => segment.text);

    expect(getTranscriptDurationSeconds(document)).toBe(20);
    expect(document.segments.map((segment) => segment.text)).toEqual(sourceOrder);
  });

  it("joins normalized text in segment order with one space", () => {
    const document = createTranscriptDocument(
      makeInput({
        segments: [
          { startSeconds: 0, durationSeconds: 1, text: "  Hello  " },
          { startSeconds: 1, durationSeconds: 1, text: "  transcript  " },
          { startSeconds: 2, durationSeconds: 1, text: "world" },
        ],
      }),
    );

    expect(getTranscriptPlainText(document)).toBe("Hello transcript world");
  });
});
