import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ui3fFiles = [
  "app/transcript/page.tsx",
  "components/transcript/TranscriptIntelligenceClient.tsx",
  "components/transcript/TranscriptSegmentList.tsx",
  "components/transcript/TranscriptDownloadButton.tsx",
] as const;

const ui3fSources = Object.fromEntries(
  ui3fFiles.map((file) => [file, readFileSync(resolve(process.cwd(), file), "utf8")]),
);
const allUi3fSource = Object.values(ui3fSources).join("\n");
const pageSource = ui3fSources["app/transcript/page.tsx"];
const clientSource = ui3fSources["components/transcript/TranscriptIntelligenceClient.tsx"];
const segmentListSource = ui3fSources["components/transcript/TranscriptSegmentList.tsx"];
const downloadButtonSource = ui3fSources["components/transcript/TranscriptDownloadButton.tsx"];
const audioUploadSource = readFileSync(
  resolve(
    process.cwd(),
    "components/transcript/AudioTranscriptUploadClient.tsx",
  ),
  "utf8",
);

describe("Transcript visual contract", () => {
  it("uses the semantic dark UI token contract", () => {
    for (const tokenClass of [
      "bg-ui-panel",
      "bg-ui-surface-muted",
      "border-ui-border",
      "text-ui-text",
      "text-ui-text-secondary",
      "text-ui-text-muted",
      "bg-ui-accent",
      "hover:bg-ui-accent-hover",
      "text-ui-danger",
      "bg-ui-danger/10",
      "rounded-ui-panel",
      "rounded-ui-control",
    ]) {
      expect(allUi3fSource).toContain(tokenClass);
    }

    expect(pageSource).toContain("gap-ui-");
  });

  it("does not reintroduce the old palette or legacy tokens in any UI-3F file", () => {
    for (const forbiddenClass of ["zinc-", "dark:", "text-foreground", "bg-foreground", "text-background", "bg-background"]) {
      expect(allUi3fSource).not.toContain(forbiddenClass);
    }
  });

  it("uses the shared responsive content width", () => {
    expect(pageSource).toContain("max-w-[1600px]");
    expect(pageSource).not.toContain("max-w-4xl");
  });

  it("renders the YouTube and audio transcript workflows together", () => {
    expect(pageSource).toContain(
      'import { AudioTranscriptUploadClient } from "@/components/transcript/AudioTranscriptUploadClient"',
    );
    expect(pageSource).toContain("<TranscriptIntelligenceClient />");
    expect(pageSource).toContain("<AudioTranscriptUploadClient />");
    expect(audioUploadSource).toContain(
      'fetch("/api/transcript/audio", {',
    );
    expect(audioUploadSource).toContain(
      'formData.append("file", selectedFile)',
    );
  });

  it("does not reintroduce forced horizontal scrolling", () => {
    for (const forbiddenPattern of ["overflow-x-auto", "overflow-x-scroll"]) {
      expect(allUi3fSource).not.toContain(forbiddenPattern);
    }
  });

  it("preserves the form label, input, help text, and submit contract", () => {
    expect(clientSource).toContain('htmlFor="transcript-input"');
    expect(clientSource).toContain("YouTube video URL or ID");
    expect(clientSource).toContain('id="transcript-input"');
    expect(clientSource).toContain(
      'placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"',
    );
    expect(clientSource).toContain('aria-describedby="transcript-input-help"');
    expect(clientSource).toContain('id="transcript-input-help"');
    expect(clientSource).toContain(
      "Supports YouTube watch URLs, youtu.be URLs, Shorts URLs, and raw 11-character video IDs.",
    );
    expect(clientSource).toContain('{status === "loading" ? "Fetching transcript..." : "Fetch transcript"}');
  });

  it("preserves the persistent draft wiring", () => {
    expect(clientSource).toContain(
      'import { usePersistentDraft } from "@/lib/drafts/use-persistent-draft"',
    );
    expect(clientSource).toContain('const DRAFT_STORAGE_KEY = "youtube-creator-os:draft:transcript:v1";');
    expect(clientSource).toContain("usePersistentDraft(DRAFT_STORAGE_KEY)");
  });

  it("preserves the transcript request contract", () => {
    expect(clientSource).toContain('fetch("/api/transcript", {');
    expect(clientSource).toContain('method: "POST"');
    expect(clientSource).toContain('headers: { "content-type": "application/json" }');
    expect(clientSource).toContain("body: JSON.stringify({ input: trimmedInput })");
    expect(clientSource).toContain("input.trim()");
    expect(clientSource).toContain('if (status === "loading") {');

    const fetchCallCount = (clientSource.match(/fetch\(/g) ?? []).length;
    expect(fetchCallCount).toBe(1);
  });

  it("preserves runtime response validation and error/empty mappings", () => {
    expect(clientSource).toContain("function isTranscriptDocument(value: unknown): value is TranscriptDocument {");
    expect(clientSource).toContain("function isTranscriptSuccessBody(");
    expect(clientSource).toContain("function getSafeApiError(");
    expect(clientSource).toContain('apiError.code === "TRANSCRIPT_NOT_FOUND"');
    expect(clientSource).toContain('"No transcript found"');
    expect(clientSource).toContain('apiError.code === "TRANSCRIPT_UNAVAILABLE"');
    expect(clientSource).toContain('"Transcript unavailable"');
    expect(clientSource).toContain('"Enter a YouTube URL or video ID."');
    expect(clientSource).toContain('"Could not reach the server. Please try again."');
    expect(clientSource).toContain('"The server returned an invalid response."');
    expect(clientSource).toContain('"The server returned an invalid transcript response."');
  });

  it("preserves status refs and automatic focus management", () => {
    expect(clientSource).toContain("const errorRef = useRef<HTMLDivElement>(null);");
    expect(clientSource).toContain("const emptyRef = useRef<HTMLDivElement>(null);");
    expect(clientSource).toContain("const resultRef = useRef<HTMLDivElement>(null);");
    expect(clientSource).toContain('errorRef.current?.focus();');
    expect(clientSource).toContain('emptyRef.current?.focus();');
    expect(clientSource).toContain('resultRef.current?.focus();');
  });

  it("keeps the required accessibility roles and attributes", () => {
    expect(clientSource).toContain('role="status"');
    expect(clientSource).toContain('role="alert"');
    expect(clientSource).toContain('aria-live="polite"');
    expect(clientSource).toContain('role="region"');
    expect(clientSource).toContain('aria-label="Transcript result"');
    expect(clientSource).toContain("tabIndex={-1}");
  });

  it("does not add a language/provider selector or new form fields", () => {
    for (const forbiddenPattern of ["<select", "Language selector", "Provider selector"]) {
      expect(allUi3fSource).not.toContain(forbiddenPattern);
    }
  });

  it("TranscriptSegmentList preserves source order with no sort/filter/dedupe/group/paginate", () => {
    expect(segmentListSource).toContain("transcript.segments.map((segment) => {");

    for (const forbiddenPattern of [
      ".sort(",
      ".filter(",
      ".slice(",
      "sortBy",
      "filterBy",
      "currentPage",
      "pageSize",
      "groupBy",
      "searchTerm",
      "Set(",
    ]) {
      expect(segmentListSource).not.toContain(forbiddenPattern);
    }
  });

  it("TranscriptSegmentList preserves the timestamp formatter and does not show duration", () => {
    expect(segmentListSource).toContain(
      'import { formatTranscriptTimestamp } from "@/lib/transcript/format-timestamp"',
    );
    expect(segmentListSource).toContain("formatTranscriptTimestamp(segment.startSeconds)");
    expect(segmentListSource).not.toContain("durationSeconds");
  });

  it("TranscriptSegmentList preserves wrapping, scroll, and whitespace protections", () => {
    expect(segmentListSource).toContain("whitespace-pre-wrap");
    expect(segmentListSource).toContain("min-w-0");
    expect(segmentListSource).toContain("break-words");
    expect(segmentListSource).toContain("overflow-y-auto");
    expect(segmentListSource).toContain("overflow-x-hidden");
    expect(segmentListSource).not.toContain("overflow-x-auto");
    expect(segmentListSource).not.toContain("overflow-x-scroll");
  });

  it("TranscriptSegmentList keeps the Transcript heading and Language/Generation metadata with all three labels", () => {
    expect(segmentListSource).toContain('aria-labelledby="transcript-heading"');
    expect(segmentListSource).toContain('id="transcript-heading"');
    expect(segmentListSource).toMatch(/<h2\s[^>]*>\s*Transcript\s*<\/h2>/);
    expect(segmentListSource).toContain("Language:");
    expect(segmentListSource).toContain("Generation:");
    expect(segmentListSource).toContain('manual: "Manual",');
    expect(segmentListSource).toContain('"auto-generated": "Auto-generated",');
    expect(segmentListSource).toContain('unknown: "Unknown",');
    expect(segmentListSource).toContain("No transcript segments are available.");
  });

  it("TranscriptDownloadButton preserves its aria-label, click handler, and cleanup contract", () => {
    expect(downloadButtonSource).toContain('type="button"');
    expect(downloadButtonSource).toContain('aria-label="Download transcript as TXT"');
    expect(downloadButtonSource).toContain("onClick={handleDownload}");
    expect(downloadButtonSource).toContain('new Blob(["\\uFEFF", text], {');
    expect(downloadButtonSource).toContain('type: "text/plain;charset=utf-8",');
    expect(downloadButtonSource).toContain("URL.createObjectURL(blob)");
    expect(downloadButtonSource).toContain("URL.revokeObjectURL(objectUrl)");
    expect(downloadButtonSource).toContain("document.body.appendChild(anchor)");
    expect(downloadButtonSource).toContain("anchor.remove()");
    expect(downloadButtonSource).toContain("createTranscriptDownloadFilename(transcript)");
    expect(downloadButtonSource).toMatch(/<button\s[^>]*>\s*Download TXT\s*<\/button>/);

    const buttonCount = (downloadButtonSource.match(/<button/g) ?? []).length;
    expect(buttonCount).toBe(1);
    expect(downloadButtonSource).not.toContain("<a ");
    expect(downloadButtonSource).not.toContain("<a>");
  });

  it("does not add a database, authentication, cloud sync, or unrelated network calls", () => {
    for (const forbiddenPattern of ["supabase", "Supabase", "createClient", "auth0", "signIn", "signOut"]) {
      expect(allUi3fSource).not.toContain(forbiddenPattern);
    }

    const fetchCallCount = (allUi3fSource.match(/fetch\(/g) ?? []).length;
    expect(fetchCallCount).toBe(1);
  });
});
