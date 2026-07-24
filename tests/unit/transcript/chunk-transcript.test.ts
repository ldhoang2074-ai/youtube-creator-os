import { describe, expect, it } from "vitest";
import {
  chunkTranscript,
  TranscriptChunkingError,
} from "@/lib/transcript/chunk-transcript";
import { createTranscriptDocument } from "@/lib/transcript/domain";
import type {
  TranscriptDocument,
  TranscriptDocumentInput,
} from "@/lib/transcript/types";

function makeDocument(
  segments: TranscriptDocumentInput["segments"] = [
    { startSeconds: 0, durationSeconds: 1, text: "Alpha" },
    { startSeconds: 1, durationSeconds: 1, text: "Beta" },
    { startSeconds: 2, durationSeconds: 1, text: "Gamma" },
  ],
): TranscriptDocument {
  return createTranscriptDocument({
    videoId: "video-1",
    languageCode: "en",
    source: "manual",
    generationKind: "manual",
    segments,
  });
}

function captureChunkingError(
  document: TranscriptDocument,
  maxCharacters: number,
): TranscriptChunkingError {
  try {
    chunkTranscript(document, { maxCharacters });
  } catch (error) {
    if (error instanceof TranscriptChunkingError) {
      return error;
    }

    throw error;
  }

  throw new Error("Expected chunkTranscript to throw");
}

describe("chunkTranscript", () => {
  it("returns one chunk when all segments fit", () => {
    const chunks = chunkTranscript(makeDocument(), {
      maxCharacters: 16,
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe("Alpha\nBeta\nGamma");
    expect(chunks[0]?.characterCount).toBe(16);
  });

  it("allows a chunk whose text exactly equals maxCharacters", () => {
    const document = makeDocument([
      { startSeconds: 0, durationSeconds: 1, text: "Hello" },
      { startSeconds: 1, durationSeconds: 1, text: "Test" },
    ]);

    const chunks = chunkTranscript(document, {
      maxCharacters: 10,
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe("Hello\nTest");
    expect(chunks[0]?.characterCount).toBe(10);
  });

  it("counts newline separators in characterCount", () => {
    const document = makeDocument([
      { startSeconds: 0, durationSeconds: 1, text: "A" },
      { startSeconds: 1, durationSeconds: 1, text: "BC" },
      { startSeconds: 2, durationSeconds: 1, text: "DEF" },
    ]);

    const [chunk] = chunkTranscript(document, {
      maxCharacters: 8,
    });

    expect(chunk?.text).toBe("A\nBC\nDEF");
    expect(chunk?.characterCount).toBe(8);
    expect(chunk?.characterCount).toBe(chunk?.text.length);
  });

  it("starts a new chunk when adding the next segment would overflow", () => {
    const document = makeDocument([
      { startSeconds: 0, durationSeconds: 1, text: "Hello" },
      { startSeconds: 1, durationSeconds: 1, text: "World" },
    ]);

    const chunks = chunkTranscript(document, {
      maxCharacters: 10,
    });

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      "Hello",
      "World",
    ]);
  });

  it("preserves source order across multiple chunks", () => {
    const chunks = chunkTranscript(makeDocument(), {
      maxCharacters: 5,
    });

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ]);
  });

  it("includes every source segment exactly once", () => {
    const document = makeDocument();

    const chunks = chunkTranscript(document, {
      maxCharacters: 5,
    });

    const chunkedIndexes = chunks.flatMap((chunk) =>
      chunk.segments.map((segment) => segment.index),
    );

    expect(chunkedIndexes).toEqual([0, 1, 2]);
    expect(new Set(chunkedIndexes).size).toBe(
      document.segments.length,
    );
  });

  it("keeps a single oversized segment whole", () => {
    const document = makeDocument([
      {
        startSeconds: 0,
        durationSeconds: 2,
        text: "This is longer than the limit",
      },
    ]);

    const chunks = chunkTranscript(document, {
      maxCharacters: 5,
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe(
      "This is longer than the limit",
    );
    expect(chunks[0]?.segments).toHaveLength(1);
    expect(chunks[0]?.characterCount).toBeGreaterThan(5);
  });

  it("uses the maximum derived segment end time", () => {
    const document = makeDocument([
      {
        startSeconds: 0,
        durationSeconds: 10,
        text: "Long overlap",
      },
      {
        startSeconds: 5,
        durationSeconds: 1,
        text: "Later start",
      },
    ]);

    const [chunk] = chunkTranscript(document, {
      maxCharacters: 100,
    });

    expect(chunk?.startSeconds).toBe(0);
    expect(chunk?.endSeconds).toBe(10);
  });

  it("assigns zero-based chunk indexes and inclusive segment indexes", () => {
    const document = makeDocument([
      { startSeconds: 0, durationSeconds: 1, text: "A" },
      { startSeconds: 1, durationSeconds: 1, text: "B" },
      { startSeconds: 2, durationSeconds: 1, text: "C" },
    ]);

    const chunks = chunkTranscript(document, {
      maxCharacters: 3,
    });

    expect(chunks.map((chunk) => ({
      index: chunk.index,
      startSegmentIndex: chunk.startSegmentIndex,
      endSegmentIndex: chunk.endSegmentIndex,
    }))).toEqual([
      {
        index: 0,
        startSegmentIndex: 0,
        endSegmentIndex: 1,
      },
      {
        index: 1,
        startSegmentIndex: 2,
        endSegmentIndex: 2,
      },
    ]);
  });

  it("returns a frozen empty array for an empty segment collection", () => {
    const emptyDocument = {
      videoId: "video-1",
      languageCode: "en",
      source: "manual",
      generationKind: "manual",
      segments: [],
    } as unknown as TranscriptDocument;

    const chunks = chunkTranscript(emptyDocument, {
      maxCharacters: 100,
    });

    expect(chunks).toEqual([]);
    expect(Object.isFrozen(chunks)).toBe(true);
  });

  it.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rejects invalid maxCharacters value %s", (maxCharacters) => {
    const error = captureChunkingError(
      makeDocument(),
      maxCharacters,
    );

    expect(error.code).toBe("INVALID_MAX_CHARACTERS");
    expect(error.message).toBe(
      "maxCharacters must be a positive safe integer",
    );
    expect(error.message).not.toContain("Alpha");
  });

  it("returns deterministic equal output across repeated calls", () => {
    const document = makeDocument();

    const first = chunkTranscript(document, {
      maxCharacters: 10,
    });
    const second = chunkTranscript(document, {
      maxCharacters: 10,
    });

    expect(second).toEqual(first);
  });

  it("does not modify the source document", () => {
    const document = makeDocument();
    const snapshot = JSON.parse(
      JSON.stringify(document),
    ) as TranscriptDocument;

    chunkTranscript(document, {
      maxCharacters: 10,
    });

    expect(document).toEqual(snapshot);
  });

  it("freezes the output and every nested chunk value", () => {
    const chunks = chunkTranscript(makeDocument(), {
      maxCharacters: 10,
    });

    expect(Object.isFrozen(chunks)).toBe(true);

    for (const chunk of chunks) {
      expect(Object.isFrozen(chunk)).toBe(true);
      expect(Object.isFrozen(chunk.segments)).toBe(true);
      expect(chunk.segments.every(Object.isFrozen)).toBe(true);
    }
  });

  it("defensively copies mutable external segment objects", () => {
    const mutableSegment = {
      index: 0,
      startSeconds: 0,
      durationSeconds: 1,
      text: "Original",
    };

    const mutableDocument = {
      videoId: "video-1",
      languageCode: "en",
      source: "manual",
      generationKind: "manual",
      segments: [mutableSegment],
    } as unknown as TranscriptDocument;

    const chunks = chunkTranscript(mutableDocument, {
      maxCharacters: 100,
    });

    mutableSegment.index = 99;
    mutableSegment.startSeconds = 50;
    mutableSegment.durationSeconds = 20;
    mutableSegment.text = "Mutated";

    expect(chunks[0]?.segments[0]).toEqual({
      index: 0,
      startSeconds: 0,
      durationSeconds: 1,
      text: "Original",
    });
    expect(chunks[0]?.text).toBe("Original");
  });
});
