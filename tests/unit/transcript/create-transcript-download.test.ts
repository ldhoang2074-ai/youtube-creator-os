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
  it("creates the exact heading, metadata, blank line, and segment format", () => {
    const text = createTranscriptDownloadText(createTranscript());

    expect(text).toBe(
      [
        "YouTube Transcript",
        "Video ID: dQw4w9WgXcQ",
        "Language: en",
        "Generation: Unknown",
        "",
        "[0:01] First segment text",
        "[1:02] Second segment text",
        "",
      ].join("\n"),
    );
  });

  it.each([
    ["manual", "Manual"],
    ["auto-generated", "Auto-generated"],
    ["unknown", "Unknown"],
  ] as const)("maps %s generation to %s", (generationKind, label) => {
    const text = createTranscriptDownloadText(createTranscript(generationKind));

    expect(text).toContain(`Generation: ${label}\n`);
  });

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

  it("does not include duration or provider information", () => {
    const text = createTranscriptDownloadText(createTranscript());

    expect(text).not.toContain("98765.4321");
    expect(text).not.toContain("youtube-captions");
    expect(text).not.toContain("Provider:");
  });

  it("uses exactly one metadata separator blank line and one final newline", () => {
    const text = createTranscriptDownloadText(createTranscript());

    expect(text).toContain("Generation: Unknown\n\n[0:01]");
    expect(text).not.toContain("Generation: Unknown\n\n\n");
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });
});

describe("createTranscriptDownloadFilename", () => {
  it("creates the deterministic video ID filename", () => {
    expect(createTranscriptDownloadFilename("dQw4w9WgXcQ")).toBe(
      "youtube-transcript-dQw4w9WgXcQ.txt",
    );
  });
});
