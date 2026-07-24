import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ui3dFiles = [
  "app/opportunities/page.tsx",
  "components/opportunity-feed/OpportunityFeedClient.tsx",
  "components/opportunity-feed/ChannelCard.tsx",
  "components/opportunity-feed/OpportunityFeedTable.tsx",
  "components/opportunity-feed/ChannelDetailDialog.tsx",
] as const;

const ui3dSources = Object.fromEntries(
  ui3dFiles.map((file) => [file, readFileSync(resolve(process.cwd(), file), "utf8")]),
);
const allUi3dSource = Object.values(ui3dSources).join("\n");
const pageSource = ui3dSources["app/opportunities/page.tsx"];
const clientSource = ui3dSources["components/opportunity-feed/OpportunityFeedClient.tsx"];
const channelCardSource = ui3dSources["components/opportunity-feed/ChannelCard.tsx"];
const tableSource = ui3dSources["components/opportunity-feed/OpportunityFeedTable.tsx"];

describe("Opportunity Feed visual contract", () => {
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
      expect(allUi3dSource).toContain(tokenClass);
    }

    expect(pageSource).toContain("gap-ui-");
  });

  it("does not reintroduce the old palette in any UI-3D file", () => {
    for (const forbiddenClass of ["zinc-", "dark:"]) {
      expect(allUi3dSource).not.toContain(forbiddenClass);
    }
  });

  it("preserves the UX-1 persistent draft contract on the form", () => {
    expect(clientSource).toContain(
      'import { usePersistentDraft } from "@/lib/drafts/use-persistent-draft"',
    );
    expect(clientSource).toContain('"youtube-creator-os:draft:opportunities:v1"');
    expect(clientSource).toContain("usePersistentDraft(DRAFT_STORAGE_KEY, {");
    expect(clientSource).toContain(
      'priorityValue: initialInputs && initialInputs.length > 0 ? initialInputs.join("\\n") : "",',
    );
    expect(clientSource).not.toContain("localStorage");
    expect(clientSource).not.toContain("window.");
  });

  it("preserves the opportunities request contract", () => {
    expect(clientSource).toContain('fetch("/api/opportunities", {');
    expect(clientSource).toContain('method: "POST"');
    expect(clientSource).toContain('headers: { "content-type": "application/json" }');
    expect(clientSource).toContain("body: JSON.stringify({ inputs })");
    expect(clientSource).toContain("const MIN_CHANNELS = 2;");
    expect(clientSource).toContain("const MAX_CHANNELS = 5;");
    expect(clientSource).toContain("isOpportunityFeedApiResponse(json)");

    const fetchCallCount = (clientSource.match(/fetch\(/g) ?? []).length;
    expect(fetchCallCount).toBe(1);
  });

  it("replaces the horizontal table with a responsive, non-scrolling card grid", () => {
    expect(tableSource).toContain('import { Grid } from "@/components/ui/Grid"');
    expect(tableSource).toContain("<Grid");

    for (const forbiddenPattern of ["<table", "min-w-[860px]", "overflow-x-auto"]) {
      expect(allUi3dSource).not.toContain(forbiddenPattern);
    }
  });

  it("keeps every required video data field in the results", () => {
    expect(tableSource).toContain("item.channelTitle");
    expect(tableSource).toContain("new Date(item.publishedAt).toLocaleDateString()");
    expect(tableSource).toContain("formatDuration(item.durationSeconds)");
    expect(tableSource).toContain("item.viewCount");
    expect(tableSource).toContain("item.channelMedianViews");
    expect(tableSource).toContain("function formatMultiplier(ratio: number): string {");
    expect(tableSource).toContain("formatMultiplier(item.outlierRatio)");
    expect(tableSource).toContain('const LEVEL_LABELS: Record<OpportunityFeedItem["outlierLevel"], string> = {');
    expect(tableSource).toContain('outlier: "Outlier"');
    expect(tableSource).toContain('"strong-outlier": "Strong outlier"');
    expect(tableSource).toContain("LEVEL_LABELS[item.outlierLevel]");
  });

  it("preserves the showThumbnails and onViewDetails contracts, and item order", () => {
    expect(tableSource).toContain("readonly showThumbnails?: boolean;");
    expect(tableSource).toContain("showThumbnails = true,");
    expect(tableSource).toContain("readonly onViewDetails?: (item: OpportunityFeedItem) => void;");
    expect(tableSource).toContain("onClick={() => onViewDetails(item)}");
    expect(tableSource).toContain("items.map((item) => {");
    expect(tableSource).toContain("key={item.videoId}");

    for (const forbiddenPattern of [".sort(", ".filter(", ".slice("]) {
      expect(tableSource).not.toContain(forbiddenPattern);
    }
  });

  it("keeps the external YouTube link safe and accessible", () => {
    expect(tableSource).toContain("buildYoutubeWatchUrl(item.videoId)");
    expect(tableSource).toContain('target="_blank"');
    expect(tableSource).toContain('rel="noopener noreferrer"');
    expect(tableSource).toContain("aria-label={`Open ${item.title} on YouTube`}");
  });

  it("ChannelCard keeps all six channel metrics and the detail callback contract", () => {
    expect(channelCardSource).toContain('Metric label="Subscribers" value={channel.subscriberCount}');
    expect(channelCardSource).toContain('Metric label="Total views" value={channel.totalViewCount}');
    expect(channelCardSource).toContain('Metric label="Video count" value={channel.videoCount}');
    expect(channelCardSource).toContain("channel.medianViews ?? \"—\"");
    expect(channelCardSource).toContain('Metric label="Analyzed videos" value={channel.analyzedVideoCount}');
    expect(channelCardSource).toContain("formatOutlierRate(channel.outlierRate)");
    expect(channelCardSource).toContain("readonly onViewDetails?: (channel: OpportunityChannelSummary) => void;");
    expect(channelCardSource).toContain("aria-label={`View channel details for ${channel.title}`}");
    expect(channelCardSource).toContain("onClick={() => onViewDetails(channel)}");
    expect(channelCardSource).toContain("h-full");
  });

  it("keeps SaveResearchButton, TitlePatternPanel, and both detail dialogs wired", () => {
    expect(clientSource).toContain(
      'import { SaveResearchButton } from "@/components/workspace/SaveResearchButton"',
    );
    expect(clientSource).toContain("<SaveResearchButton inputs={successfulInputs} result={result} />");
    expect(clientSource).toContain(
      'import { TitlePatternPanel } from "@/components/title-patterns/TitlePatternPanel"',
    );
    expect(clientSource).toContain("<TitlePatternPanel report={titlePatternReport} />");
    expect(clientSource).toContain(
      'import { VideoDetailDialog } from "@/components/video/VideoDetailDialog"',
    );
    expect(clientSource).toContain('import { ChannelDetailDialog } from "./ChannelDetailDialog"');
    expect(clientSource).toContain("<ChannelDetailDialog");
  });

  it("exposes clear loading and error state roles without swallowing per-channel failures", () => {
    expect(clientSource).toContain('role="status"');
    expect(clientSource).toContain('role="alert"');
    expect(clientSource).toContain("result.failures.map((failure) => (");
    expect(clientSource).toContain("{failure.input}");
    expect(clientSource).toContain("{failure.error.message}");
  });

  it("does not introduce sorting, filtering, pagination, or grouping", () => {
    for (const forbiddenPattern of [
      "sortBy",
      "filterBy",
      "currentPage",
      "pageSize",
      "groupBy",
      ".sort(",
    ]) {
      expect(allUi3dSource).not.toContain(forbiddenPattern);
    }
  });
});
