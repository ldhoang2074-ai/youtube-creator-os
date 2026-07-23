import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ui3cFiles = [
  "app/compare/page.tsx",
  "components/channel-compare/ChannelCompareClient.tsx",
  "components/channel-compare/ComparisonTable.tsx",
] as const;

const ui3cSources = Object.fromEntries(
  ui3cFiles.map((file) => [file, readFileSync(resolve(process.cwd(), file), "utf8")]),
);
const allUi3cSource = Object.values(ui3cSources).join("\n");
const pageSource = ui3cSources["app/compare/page.tsx"];
const clientSource = ui3cSources["components/channel-compare/ChannelCompareClient.tsx"];
const tableSource = ui3cSources["components/channel-compare/ComparisonTable.tsx"];

describe("Compare visual contract", () => {
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
      "border-ui-danger/40",
      "bg-ui-danger/10",
      "text-ui-danger",
    ]) {
      expect(allUi3cSource).toContain(tokenClass);
    }

    expect(pageSource).toContain("gap-ui-");
  });

  it("does not reintroduce the old palette in any UI-3C file", () => {
    for (const forbiddenClass of ["zinc-", "dark:"]) {
      expect(allUi3cSource).not.toContain(forbiddenClass);
    }
  });

  it("preserves the compare validation contract", () => {
    expect(clientSource).toContain("const MIN_CHANNELS = 2;");
    expect(clientSource).toContain("const MAX_CHANNELS = 5;");
    expect(clientSource).toContain('.split("\\n")');
    expect(clientSource).toContain(".map((line) => line.trim())");
    expect(clientSource).toContain(".filter((line) => line.length > 0)");
    expect(clientSource).toContain("`Enter at least ${MIN_CHANNELS} channels (one per line).`");
    expect(clientSource).toContain("`Enter at most ${MAX_CHANNELS} channels (one per line).`");
  });

  it("preserves the compare request contract", () => {
    expect(clientSource).toContain('fetch("/api/compare", {');
    expect(clientSource).toContain('method: "POST"');
    expect(clientSource).toContain('headers: { "content-type": "application/json" }');
    expect(clientSource).toContain("body: JSON.stringify({ inputs })");
    expect(clientSource).toContain('import { isApiErrorBody } from "@/lib/http/api-error"');
    expect(clientSource).toContain("isApiErrorBody(json)");

    const fetchCallCount = (clientSource.match(/fetch\(/g) ?? []).length;
    expect(fetchCallCount).toBe(1);
  });

  it("preserves the result state flow and rendering condition", () => {
    expect(clientSource).toContain("setResult(null);");
    expect(clientSource).toContain('disabled={status === "loading"}');
    expect(clientSource).toContain(
      'status === "success" && result ? <ComparisonTable results={result.results} /> : null',
    );
  });

  it("preserves the discriminated union, keys, and result order in ComparisonTable", () => {
    expect(tableSource).toContain('entry.status === "success"');
    expect(tableSource).toContain("key={report.channelId}");
    expect(tableSource).toContain("key={`${entry.input}-${index}`}");
    expect(tableSource).toContain("results.map((entry, index) =>");
    expect(tableSource).toContain("{entry.input}");
    expect(tableSource).toContain("{entry.error.message}");

    for (const forbiddenPattern of [".sort("]) {
      expect(allUi3cSource).not.toContain(forbiddenPattern);
    }
  });

  it("preserves formatOutlierRate behavior in ComparisonTable", () => {
    expect(tableSource).toContain("function formatOutlierRate(rate: number | null): string {");
    expect(tableSource).toContain("if (rate === null) {");
    expect(tableSource).toContain('return "—";');
    expect(tableSource).toContain("`${Math.round(rate * 100)}%`");
  });

  it("renders all six comparison metrics", () => {
    for (const metricLabel of [
      "Subscribers",
      "Total views",
      "Video count",
      "Median views",
      "Analyzed videos",
      "Recent-video outlier rate",
    ]) {
      expect(tableSource).toContain(metricLabel);
    }
  });

  it("replaces the horizontal table with the shared responsive Grid", () => {
    expect(tableSource).toContain('import { Grid } from "@/components/ui/Grid"');
    expect(tableSource).toContain("<Grid");

    for (const forbiddenPattern of ["<table", "min-w-[820px]", "overflow-x-auto"]) {
      expect(tableSource).not.toContain(forbiddenPattern);
    }
  });

  it("exposes clear loading and error state roles", () => {
    expect(clientSource).toContain('role="status"');
    expect(clientSource).toContain('role="alert"');
  });

  it("does not introduce new interaction, dialog, or list-manipulation state", () => {
    for (const forbiddenPattern of [
      "Dialog",
      "onViewDetails",
      "currentPage",
      "sortBy",
      "filterBy",
      "errorKind",
    ]) {
      expect(allUi3cSource).not.toContain(forbiddenPattern);
    }
  });
});
