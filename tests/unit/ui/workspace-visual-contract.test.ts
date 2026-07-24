import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ui3eFiles = [
  "app/workspace/page.tsx",
  "components/workspace/WorkspaceClient.tsx",
  "components/workspace/WorkspaceVideoCard.tsx",
] as const;

const ui3eSources = Object.fromEntries(
  ui3eFiles.map((file) => [file, readFileSync(resolve(process.cwd(), file), "utf8")]),
);
const allUi3eSource = Object.values(ui3eSources).join("\n");
const pageSource = ui3eSources["app/workspace/page.tsx"];
const clientSource = ui3eSources["components/workspace/WorkspaceClient.tsx"];
const videoCardSource = ui3eSources["components/workspace/WorkspaceVideoCard.tsx"];

describe("Workspace visual contract", () => {
  it("uses the semantic dark UI token contract", () => {
    for (const tokenClass of [
      "bg-ui-panel",
      "bg-ui-panel-elevated",
      "bg-ui-surface-muted",
      "border-ui-border",
      "text-ui-text",
      "text-ui-text-secondary",
      "text-ui-text-muted",
      "text-ui-danger",
      "bg-ui-danger/10",
      "rounded-ui-panel",
      "rounded-ui-control",
    ]) {
      expect(allUi3eSource).toContain(tokenClass);
    }

    // The loading spinner is the one place Workspace uses the accent token
    // (no primary submit button exists on this page).
    expect(clientSource).toContain("border-t-ui-accent");
    expect(pageSource).toContain("gap-ui-");
  });

  it("does not reintroduce the old palette in any UI-3E file", () => {
    for (const forbiddenClass of ["zinc-", "dark:"]) {
      expect(allUi3eSource).not.toContain(forbiddenClass);
    }
  });

  it("uses the shared responsive content width", () => {
    expect(pageSource).toContain("max-w-[1600px]");
    expect(pageSource).not.toContain("max-w-5xl");
  });

  it("does not reintroduce fixed-width or forced horizontal-scroll patterns", () => {
    for (const forbiddenPattern of ["overflow-x-auto", "overflow-x-scroll", "min-w-[860px]", "<table"]) {
      expect(allUi3eSource).not.toContain(forbiddenPattern);
    }
  });

  it("preserves the storage contract and useSyncExternalStore wiring", () => {
    expect(clientSource).toContain('from "@/lib/workspace/storage"');
    expect(clientSource).toContain("deleteSession");
    expect(clientSource).toContain("getStorageSafely");
    expect(clientSource).toContain("listSessions");
    expect(clientSource).toContain("WORKSPACE_STORAGE_KEY");
    expect(clientSource).toContain("useSyncExternalStore(subscribeToWorkspace, getSnapshot, getServerSnapshot)");
    expect(clientSource).toContain("const SERVER_SNAPSHOT: ListSessionsResult = { ok: true, sessions: [], skippedCount: 0 };");
    expect(clientSource).toContain("const STORAGE_UNAVAILABLE_SNAPSHOT: ListSessionsResult = {");
    expect(clientSource).toContain('window.addEventListener("storage", handleStorageEvent);');
  });

  it("preserves session ordering with no sorting, filtering, pagination, grouping, or search", () => {
    expect(clientSource).toContain("sessions.map((session) => {");

    for (const forbiddenPattern of [
      ".sort(",
      ".filter(",
      "sortBy",
      "filterBy",
      "currentPage",
      "pageSize",
      "groupBy",
      "searchTerm",
    ]) {
      expect(allUi3eSource).not.toContain(forbiddenPattern);
    }
  });

  it("preserves buildOpportunitiesHref's repeated channel query parameters and prefetch={false}", () => {
    expect(clientSource).toContain("function buildOpportunitiesHref(inputs: readonly string[]): string {");
    expect(clientSource).toContain('params.append("channel", input);');
    expect(clientSource).toContain('return `/opportunities?${params.toString()}`;');
    expect(clientSource).toContain("href={buildOpportunitiesHref(session.inputs)}");
    expect(clientSource).toContain("prefetch={false}");
  });

  it("keeps expand/collapse, delete-request, confirm, and cancel handlers wired", () => {
    expect(clientSource).toContain("function handleSelect(id: string) {");
    expect(clientSource).toContain("function handleRequestDelete(id: string) {");
    expect(clientSource).toContain("function handleCancelDelete() {");
    expect(clientSource).toContain("function handleConfirmDelete(id: string) {");
    expect(clientSource).toContain("onClick={() => handleSelect(session.id)}");
    expect(clientSource).toContain("onClick={() => handleRequestDelete(session.id)}");
    expect(clientSource).toContain("onClick={() => handleConfirmDelete(session.id)}");
    expect(clientSource).toContain("onClick={handleCancelDelete}");
    expect(clientSource).toContain("pendingDeleteId === session.id");
    expect(clientSource).toContain("aria-expanded={isExpanded}");
    expect(clientSource).toContain("aria-controls={contentId}");
  });

  it("keeps loading/status/alert accessibility contracts", () => {
    expect(clientSource).toContain('role="status"');
    expect(clientSource).toContain('role="alert"');
    expect(clientSource).toContain("Loading saved research...");
    expect(clientSource).toContain("Saving is not available in this browser session.");
    expect(clientSource).toContain("Some saved research could not be loaded and was skipped.");
  });

  it("keeps Grid, WorkspaceVideoCard, TitlePatternPanel, and VideoDetailDialog wired", () => {
    expect(clientSource).toContain('import { Grid } from "@/components/ui/Grid"');
    expect(clientSource).toContain('import { VideoDetailDialog } from "@/components/video/VideoDetailDialog"');
    expect(clientSource).toContain('import { TitlePatternPanel } from "@/components/title-patterns/TitlePatternPanel"');
    expect(clientSource).toContain('import { WorkspaceVideoCard } from "./WorkspaceVideoCard"');
    expect(clientSource).toContain("<Grid");
    expect(clientSource).toContain("<WorkspaceVideoCard");
    expect(clientSource).toContain("<TitlePatternPanel report={analyzeTitlePatterns(session.result.items)} />");
    expect(clientSource).toContain("<VideoDetailDialog");
    expect(clientSource).toContain(
      "source={resolvedSelectedVideo ? { kind: \"feed\", item: resolvedSelectedVideo } : null}",
    );
  });

  it("WorkspaceVideoCard retains all required metrics and the detail callback contract", () => {
    expect(videoCardSource).toContain('import { VideoCardBase } from "@/components/video/VideoCardBase"');
    expect(videoCardSource).toContain('import { OutlierBadge } from "@/components/channel-analyzer/OutlierBadge"');
    expect(videoCardSource).toContain('{ label: "Channel", value: item.channelTitle }');
    expect(videoCardSource).toContain('{ label: "Views", value: item.viewCount }');
    expect(videoCardSource).toContain('{ label: "Channel median views", value: item.channelMedianViews }');
    expect(videoCardSource).toContain("`${item.outlierRatio.toFixed(1)}×`");
    expect(videoCardSource).toContain('{ label: "Outlier", value: <OutlierBadge level={item.outlierLevel} /> }');
    expect(videoCardSource).toContain("onClick={() => onViewDetails(item)}");
    expect(videoCardSource).toContain("aria-label={`View details for ${item.title}`}");
  });

  it("does not add a database, auth, cloud sync, autosave, or new API calls", () => {
    for (const forbiddenPattern of [
      "supabase",
      "Supabase",
      "fetch(",
      "createClient",
      "auth",
    ]) {
      expect(allUi3eSource).not.toContain(forbiddenPattern);
    }
  });
});
