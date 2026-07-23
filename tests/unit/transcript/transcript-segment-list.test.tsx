import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TranscriptSegmentList } from "@/components/transcript/TranscriptSegmentList";
import type {
  TranscriptDocument,
  TranscriptGenerationKind,
} from "@/lib/transcript/types";

function createTranscript(
  generationKind: TranscriptGenerationKind = "manual",
): TranscriptDocument {
  return {
    videoId: "dQw4w9WgXcQ",
    languageCode: "es-MX",
    source: "youtube-captions",
    generationKind,
    segments: [
      {
        index: 0,
        startSeconds: 1.99,
        durationSeconds: 10,
        text: "First segment",
      },
      {
        index: 1,
        startSeconds: 1.99,
        durationSeconds: 1,
        text: "Duplicate timestamp",
      },
      {
        index: 2,
        startSeconds: 5,
        durationSeconds: 9_876,
        text: "¡Hola, señor! 你好 🌎",
      },
    ],
  };
}

function renderTranscript(transcript: TranscriptDocument): string {
  return renderToStaticMarkup(
    <TranscriptSegmentList transcript={transcript} />,
  );
}

describe("TranscriptSegmentList", () => {
  it("renders its semantic heading and visible language code", () => {
    const html = renderTranscript(createTranscript());

    expect(html).toContain("<section");
    expect(html).toContain(">Transcript</h2>");
    expect(html).toContain(">Language:</dt>");
    expect(html).toContain(">es-MX</dd>");
  });

  it.each([
    ["manual", "Manual"],
    ["auto-generated", "Auto-generated"],
    ["unknown", "Unknown"],
  ] as const)("renders %s generation as %s", (generationKind, label) => {
    const html = renderTranscript(createTranscript(generationKind));

    expect(html).toContain(`>${label}</dd>`);
  });

  it("does not infer that an unknown transcript is manual", () => {
    const html = renderTranscript(createTranscript("unknown"));

    expect(html).toContain(">Unknown</dd>");
    expect(html).not.toContain(">Manual</dd>");
  });

  it("renders every segment in source order in an ordered list", () => {
    const html = renderTranscript(createTranscript());
    const firstPosition = html.indexOf("First segment");
    const duplicatePosition = html.indexOf("Duplicate timestamp");
    const unicodePosition = html.indexOf("¡Hola, señor! 你好 🌎");

    expect(html).toContain("<ol");
    expect(html.match(/<li/g)).toHaveLength(3);
    expect(firstPosition).toBeGreaterThan(-1);
    expect(firstPosition).toBeLessThan(duplicatePosition);
    expect(duplicatePosition).toBeLessThan(unicodePosition);
  });

  it("preserves duplicate and overlapping segments with formatted timestamps", () => {
    const html = renderTranscript(createTranscript());

    expect(html.match(/>0:01<\/span>/g)).toHaveLength(2);
    expect(html).toContain(">0:05</span>");
    expect(html).toContain("Duplicate timestamp");
  });

  it("renders normalized Unicode text without displaying segment duration", () => {
    const html = renderTranscript(createTranscript());

    expect(html).toContain("¡Hola, señor! 你好 🌎");
    expect(html).not.toContain("9876");
    expect(html).not.toContain("2:44:36");
  });

  it("preserves internal transcript whitespace in pre-wrapped text", () => {
    const formattedText = "Line one\nLine  two";
    const transcript: TranscriptDocument = {
      ...createTranscript(),
      segments: [
        {
          index: 0,
          startSeconds: 0,
          durationSeconds: 2,
          text: formattedText,
        },
      ],
    };
    const html = renderTranscript(transcript);

    expect(html).toContain(formattedText);
    expect(html).toContain("whitespace-pre-wrap");
  });

  it("retains wrapping protections without horizontal scrolling", () => {
    const html = renderTranscript(createTranscript());

    expect(html).not.toContain("overflow-x-auto");
    expect(html).not.toContain("overflow-x-scroll");
    expect(html).toContain("min-w-0");
    expect(html).toContain("break-words");
  });

  it("renders a defensive empty state without an ordered list", () => {
    const transcript: TranscriptDocument = {
      ...createTranscript(),
      segments: [],
    };
    const html = renderTranscript(transcript);

    expect(html).toContain("No transcript segments are available.");
    expect(html).not.toContain("<ol");
  });

  it("does not mutate the transcript document", () => {
    const transcript = createTranscript();
    const before = JSON.stringify(transcript);

    renderTranscript(transcript);

    expect(JSON.stringify(transcript)).toBe(before);
  });
});
