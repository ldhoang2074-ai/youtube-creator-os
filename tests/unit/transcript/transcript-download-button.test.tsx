import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TranscriptDownloadButton } from "@/components/transcript/TranscriptDownloadButton";
import type { TranscriptDocument } from "@/lib/transcript/types";

const transcript: TranscriptDocument = {
  videoId: "dQw4w9WgXcQ",
  languageCode: "en",
  source: "youtube-captions",
  generationKind: "unknown",
  segments: [
    {
      index: 0,
      startSeconds: 1,
      durationSeconds: 2,
      text: "Secret segment text",
    },
  ],
};

function renderButton(): string {
  return renderToStaticMarkup(
    <TranscriptDownloadButton transcript={transcript} />,
  );
}

describe("TranscriptDownloadButton", () => {
  it("renders one enabled TXT download button", () => {
    const html = renderButton();

    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Download transcript as TXT"');
    expect(html).toContain(">Download TXT</button>");
    expect(html).not.toContain(' disabled=""');
  });

  it("does not render a permanent anchor or download URL", () => {
    const html = renderButton();

    expect(html).not.toContain("<a");
    expect(html).not.toContain("blob:");
    expect(html).not.toContain("youtube-transcript-");
    expect(html).not.toContain(".txt");
  });

  it("does not expose transcript content, JSON, provider, or credentials", () => {
    const html = renderButton();

    expect(html).not.toContain("Secret segment text");
    expect(html).not.toContain("dQw4w9WgXcQ");
    expect(html).not.toContain("youtube-captions");
    expect(html).not.toContain("videoId");
    expect(html).not.toContain("segments");
    expect(html.toLowerCase()).not.toContain("api key");
    expect(html.toLowerCase()).not.toContain("credentials");
  });
});
