import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ui3bFiles = [
  "components/channel-analyzer/ChannelAnalyzerClient.tsx",
  "components/channel-analyzer/VideoCard.tsx",
  "components/video/VideoCardBase.tsx",
  "components/channel-analyzer/OutlierBadge.tsx",
  "components/video/VideoDetailDialog.tsx",
  "components/ui/DetailDialog.tsx",
] as const;

const ui3bSources = Object.fromEntries(
  ui3bFiles.map((file) => [file, readFileSync(resolve(process.cwd(), file), "utf8")]),
);
const allUi3bSource = Object.values(ui3bSources).join("\n");
const videoCardSource = ui3bSources["components/channel-analyzer/VideoCard.tsx"];
const videoCardBaseSource = ui3bSources["components/video/VideoCardBase.tsx"];
const outlierBadgeSource = ui3bSources["components/channel-analyzer/OutlierBadge.tsx"];
const videoDetailDialogSource = ui3bSources["components/video/VideoDetailDialog.tsx"];
const detailDialogSource = ui3bSources["components/ui/DetailDialog.tsx"];

describe("Analyzer results visual contract", () => {
  it("uses semantic dark UI tokens without the old palette", () => {
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
      expect(allUi3bSource).toContain(tokenClass);
    }

    for (const forbiddenClass of ["zinc-", "dark:"]) {
      expect(allUi3bSource).not.toContain(forbiddenClass);
    }
  });

  it("preserves the VideoCard adapter and detail action contracts", () => {
    expect(videoCardSource).toContain('import { VideoCardBase } from "@/components/video/VideoCardBase"');
    expect(videoCardSource).toContain('import { OutlierBadge } from "./OutlierBadge"');
    expect(videoCardSource).toContain("onClick={() => onViewDetails(video)}");
    expect(videoCardSource).toContain("View details for ${video.title}");
  });

  it("preserves the VideoCardBase YouTube link and metric contracts", () => {
    expect(videoCardBaseSource).toContain("buildYoutubeWatchUrl(videoId)");
    expect(videoCardBaseSource).toContain('target="_blank"');
    expect(videoCardBaseSource).toContain('rel="noopener noreferrer"');
    expect(videoCardBaseSource).toContain("formatDuration(durationSeconds)");
    expect(videoCardBaseSource).toContain("metrics.map");
  });

  it("keeps all outlier levels and labels available", () => {
    expect(outlierBadgeSource).toContain('"insufficient-data"');
    expect(outlierBadgeSource).toContain("normal:");
    expect(outlierBadgeSource).toContain("outlier:");
    expect(outlierBadgeSource).toContain('"strong-outlier"');

    for (const label of ["Insufficient data", "Normal", "Outlier", "Strong outlier"]) {
      expect(outlierBadgeSource).toContain(`"${label}"`);
    }
  });

  it("preserves video detail data sources and shared dialog dependencies", () => {
    expect(videoDetailDialogSource).toContain('import { DetailDialog } from "@/components/ui/DetailDialog"');
    expect(videoDetailDialogSource).toContain('import { formatDuration } from "@/lib/format/video"');
    expect(videoDetailDialogSource).toContain('import { OutlierBadge } from "@/components/channel-analyzer/OutlierBadge"');
    expect(videoDetailDialogSource).toContain('readonly kind: "analyzer"');
    expect(videoDetailDialogSource).toContain('readonly kind: "feed"');
  });

  it("retains shared dialog portal, keyboard, focus, and scroll behavior", () => {
    for (const behaviorContract of [
      "createPortal",
      "FOCUSABLE_SELECTOR",
      'event.key === "Escape"',
      "document.body.style.overflow",
      "returnFocusRef",
      "handleFocusIn",
      'role="dialog"',
      'aria-modal="true"',
      "aria-labelledby",
      "onClick={() => onCloseRef.current()}",
    ]) {
      expect(detailDialogSource).toContain(behaviorContract);
    }
  });
});
