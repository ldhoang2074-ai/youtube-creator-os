import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TranscriptIntelligenceClient } from "@/components/transcript/TranscriptIntelligenceClient";

function renderClient(): string {
  return renderToStaticMarkup(<TranscriptIntelligenceClient />);
}

function getOpeningTag(html: string, tagName: string): string {
  return html.match(new RegExp(`<${tagName}[^>]*>`))?.[0] ?? "";
}

describe("TranscriptIntelligenceClient", () => {
  it("renders the transcript request form and visible label", () => {
    const html = renderClient();

    expect(html).toContain("<form");
    expect(html).toContain('for="transcript-input"');
    expect(html).toContain("YouTube video URL or ID</label>");
  });

  it("renders the configured text input", () => {
    const html = renderClient();
    const inputTag = getOpeningTag(html, "input");

    expect(inputTag).toContain('id="transcript-input"');
    expect(inputTag).toContain('type="text"');
    expect(inputTag).toContain(
      'placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"',
    );
    expect(inputTag).toContain('aria-describedby="transcript-input-help"');
    expect(inputTag).not.toContain(' disabled=""');
  });

  it("describes every supported YouTube reference format", () => {
    const html = renderClient();

    expect(html).toContain('id="transcript-input-help"');
    expect(html).toContain("watch URLs");
    expect(html).toContain("youtu.be URLs");
    expect(html).toContain("Shorts URLs");
    expect(html).toContain("raw 11-character video IDs");
  });

  it("renders an enabled submit button", () => {
    const html = renderClient();
    const buttonTag = getOpeningTag(html, "button");

    expect(buttonTag).toContain('type="submit"');
    expect(buttonTag).not.toContain(' disabled=""');
    expect(html).toContain("Fetch transcript</button>");
  });

  it("renders only the idle state initially", () => {
    const html = renderClient();

    expect(html).not.toContain("Fetching transcript...");
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("No transcript found");
    expect(html).not.toContain("Transcript unavailable");
    expect(html).not.toContain('aria-label="Transcript result"');
    expect(html).not.toContain(">Transcript</h2>");
  });

  it("does not render language or provider selectors", () => {
    const html = renderClient();

    expect(html).not.toContain("<select");
    expect(html).not.toContain("Language selector");
    expect(html).not.toContain("Provider selector");
  });

  it("does not introduce horizontal scrolling", () => {
    const html = renderClient();

    expect(html).not.toContain("overflow-x-auto");
    expect(html).not.toContain("overflow-x-scroll");
  });
});
