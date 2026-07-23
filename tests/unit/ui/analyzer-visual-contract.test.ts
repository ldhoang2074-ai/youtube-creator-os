import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ui3aFiles = [
  "app/analyzer/page.tsx",
  "components/channel-analyzer/ChannelAnalyzerClient.tsx",
  "components/channel-analyzer/ChannelSummary.tsx",
] as const;

const ui3aSources = Object.fromEntries(
  ui3aFiles.map((file) => [file, readFileSync(resolve(process.cwd(), file), "utf8")]),
);
const allUi3aSource = Object.values(ui3aSources).join("\n");
const analyzerClientSource = ui3aSources["components/channel-analyzer/ChannelAnalyzerClient.tsx"];

describe("Analyzer visual contract", () => {
  it("uses the semantic dark UI token contract", () => {
    for (const tokenClass of [
      "bg-ui-panel",
      "bg-ui-surface-muted",
      "border-ui-border",
      "text-ui-text",
      "text-ui-text-muted",
      "bg-ui-accent",
      "hover:bg-ui-accent-hover",
      "ring-ui-focus",
      "rounded-ui-panel",
      "rounded-ui-control",
    ]) {
      expect(allUi3aSource).toContain(tokenClass);
    }
  });

  it("does not reintroduce the old palette in UI-3A files", () => {
    for (const forbiddenClass of ["zinc-", "dark:"]) {
      expect(allUi3aSource).not.toContain(forbiddenClass);
    }
  });

  it("preserves the analyzer request contract", () => {
    expect(analyzerClientSource).toContain('fetch("/api/analyzer", {');
    expect(analyzerClientSource).toContain('method: "POST"');
    expect(analyzerClientSource).toContain('headers: { "content-type": "application/json" }');
    expect(analyzerClientSource).toContain("body: JSON.stringify({ input })");
  });

  it("preserves the video and detail implementation boundaries", () => {
    expect(analyzerClientSource).toContain(
      'import { VideoDetailDialog } from "@/components/video/VideoDetailDialog"',
    );
    expect(analyzerClientSource).toContain('import { VideoCard } from "./VideoCard"');
    expect(analyzerClientSource).not.toContain("VideoCardBase");
    expect(analyzerClientSource).not.toContain("OutlierBadge");
  });
});
