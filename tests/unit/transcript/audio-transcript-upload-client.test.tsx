import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AudioTranscriptUploadClient } from "@/components/transcript/AudioTranscriptUploadClient";

function renderClient(): string {
  return renderToStaticMarkup(<AudioTranscriptUploadClient />);
}

function getOpeningTag(
  html: string,
  tagName: string,
): string {
  return html.match(new RegExp(`<${tagName}[^>]*>`))?.[0] ?? "";
}

describe("AudioTranscriptUploadClient", () => {
  it("renders a separate audio or video upload form", () => {
    const html = renderClient();

    expect(html).toContain("<form");
    expect(html).toContain('for="audio-transcript-file"');
    expect(html).toContain("Audio or video file</label>");
  });

  it("renders a single configured file input", () => {
    const html = renderClient();
    const inputTag = getOpeningTag(html, "input");

    expect(inputTag).toContain('id="audio-transcript-file"');
    expect(inputTag).toContain('name="file"');
    expect(inputTag).toContain('type="file"');
    expect(inputTag).toContain(
      'accept=".flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.wav,.webm"',
    );
    expect(inputTag).toContain(
      'aria-describedby="audio-transcript-file-help"',
    );
  });

  it("shows supported formats and the 25 MiB limit", () => {
    const html = renderClient();

    expect(html).toContain('id="audio-transcript-file-help"');
    expect(html).toContain("FLAC");
    expect(html).toContain("MP3");
    expect(html).toContain("MP4");
    expect(html).toContain("M4A");
    expect(html).toContain("WAV");
    expect(html).toContain("WEBM");
    expect(html).toContain("25 MiB");
  });

  it("renders the initial submit button disabled", () => {
    const html = renderClient();
    const buttonTag = getOpeningTag(html, "button");

    expect(buttonTag).toContain('type="submit"');
    expect(buttonTag).toContain('disabled=""');
    expect(html).toContain("Transcribe file</button>");
  });

  it("renders only the idle state initially", () => {
    const html = renderClient();

    expect(html).not.toContain("Transcribing file...");
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain(
      'aria-label="Audio transcript result"',
    );
  });

  it("does not expose provider or language controls", () => {
    const html = renderClient();

    expect(html).not.toContain("<select");
    expect(html).not.toContain("Provider selector");
    expect(html).not.toContain("Language selector");
  });

  it("does not introduce horizontal scrolling", () => {
    const html = renderClient();

    expect(html).not.toContain("overflow-x-auto");
    expect(html).not.toContain("overflow-x-scroll");
  });
});
