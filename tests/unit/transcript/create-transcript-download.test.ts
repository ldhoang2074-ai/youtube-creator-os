import { describe, expect, it } from "vitest";

import {
  createTranscriptDownloadFilename,
  createTranscriptDownloadText,
} from "@/lib/transcript/create-transcript-download";
import type {
  TranscriptDocument,
  TranscriptGenerationKind,
  TranscriptSegment,
} from "@/lib/transcript/types";

function createTranscript(
  generationKind: TranscriptGenerationKind = "unknown",
  segments: readonly TranscriptSegment[] = [
    {
      index: 0,
      startSeconds: 1.99,
      durationSeconds: 98_765.4321,
      text: "First segment text",
    },
    {
      index: 1,
      startSeconds: 62,
      durationSeconds: 7,
      text: "Second segment text",
    },
  ],
): TranscriptDocument {
  return {
    videoId: "dQw4w9WgXcQ",
    languageCode: "en",
    source: "youtube-captions",
    generationKind,
    segments,
  };
}

describe("createTranscriptDownloadText", () => {
  it("creates exactly the timestamped segment lines", () => {
    const text = createTranscriptDownloadText(createTranscript());

    expect(text).toBe(
      [
        "[0:01] First segment text",
        "[1:02] Second segment text",
        "",
      ].join("\n"),
    );
  });

  it.each(["manual", "auto-generated", "unknown"] as const)(
    "omits %s generation metadata",
    (generationKind) => {
    const text = createTranscriptDownloadText(createTranscript(generationKind));

      expect(text).not.toContain("Generation:");
    },
  );

  it("uses existing timestamp behavior below, at, and above one hour", () => {
    const transcript = createTranscript("unknown", [
      {
        index: 0,
        startSeconds: 59.99,
        durationSeconds: 1,
        text: "Below hour",
      },
      {
        index: 1,
        startSeconds: 3_600,
        durationSeconds: 1,
        text: "At hour",
      },
      {
        index: 2,
        startSeconds: 3_661.9,
        durationSeconds: 1,
        text: "Above hour fractional",
      },
    ]);

    expect(createTranscriptDownloadText(transcript)).toContain(
      "[0:59] Below hour\n[1:00:00] At hour\n[1:01:01] Above hour fractional\n",
    );
  });

  it("preserves source order, duplicate timestamps, and overlapping segments", () => {
    const transcript = createTranscript("unknown", [
      {
        index: 0,
        startSeconds: 1,
        durationSeconds: 10,
        text: "Long first segment",
      },
      {
        index: 1,
        startSeconds: 1,
        durationSeconds: 2,
        text: "Duplicate timestamp",
      },
      {
        index: 2,
        startSeconds: 5,
        durationSeconds: 1,
        text: "Overlapping third segment",
      },
    ]);
    const text = createTranscriptDownloadText(transcript);

    expect(text.match(/\[0:01\]/g)).toHaveLength(2);
    expect(text.indexOf("Long first segment")).toBeLessThan(
      text.indexOf("Duplicate timestamp"),
    );
    expect(text.indexOf("Duplicate timestamp")).toBeLessThan(
      text.indexOf("Overlapping third segment"),
    );
  });

  it("preserves Unicode and leading and trailing segment whitespace exactly", () => {
    const segmentText = "  Xin chào — ¡Hola, señor! 你好 🌎  ";
    const transcript = createTranscript("manual", [
      {
        index: 0,
        startSeconds: 0,
        durationSeconds: 1,
        text: segmentText,
      },
    ]);
    const text = createTranscriptDownloadText(transcript);

    expect(text).toContain(`[0:00] ${segmentText}\n`);
  });

  it("does not include heading, metadata, duration, provider, or raw JSON", () => {
    const text = createTranscriptDownloadText(createTranscript());

    expect(text).not.toContain("YouTube Transcript");
    expect(text).not.toContain("Video ID:");
    expect(text).not.toContain("dQw4w9WgXcQ");
    expect(text).not.toContain("Language:");
    expect(text).not.toContain("Generation:");
    expect(text).not.toContain("98765.4321");
    expect(text).not.toContain("youtube-captions");
    expect(text).not.toContain("Provider:");
    expect(text).not.toContain('"segments"');
  });

  it("uses no blank separator and ends with exactly one final newline", () => {
    const text = createTranscriptDownloadText(createTranscript());

    expect(text.startsWith("[0:01] First segment text")).toBe(true);
    expect(text).not.toContain("\n\n");
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });

  it("returns an empty string when there are no segments", () => {
    expect(createTranscriptDownloadText(createTranscript("unknown", []))).toBe("");
  });
});

describe("createTranscriptDownloadFilename", () => {
  it("creates the deterministic YouTube video ID filename", () => {
    expect(
      createTranscriptDownloadFilename(createTranscript()),
    ).toBe("youtube-transcript-dQw4w9WgXcQ.txt");
  });

  it("creates a source-aware filename for audio uploads", () => {
    const transcript: TranscriptDocument = {
      ...createTranscript(),
      videoId: "audio-upload",
      source: "audio-transcription",
    };

    expect(
      createTranscriptDownloadFilename(transcript),
    ).toBe("audio-transcript.txt");
  });
});
