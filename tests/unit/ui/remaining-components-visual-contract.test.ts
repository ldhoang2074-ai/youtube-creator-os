import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ui3hFiles = [
  "components/title-patterns/TitlePatternPanel.tsx",
  "components/workspace/SaveResearchButton.tsx",
] as const;

const ui3hSources = Object.fromEntries(
  ui3hFiles.map((file) => [file, readFileSync(resolve(process.cwd(), file), "utf8")]),
);
const allUi3hSource = Object.values(ui3hSources).join("\n");
const patternPanelSource = ui3hSources["components/title-patterns/TitlePatternPanel.tsx"];
const saveButtonSource = ui3hSources["components/workspace/SaveResearchButton.tsx"];

describe("Remaining components visual contract", () => {
  it("uses the semantic dark UI token contract in both components", () => {
    for (const tokenClass of [
      "bg-ui-panel",
      "bg-ui-surface-muted",
      "border-ui-border",
      "text-ui-text",
      "text-ui-text-secondary",
      "text-ui-text-muted",
      "rounded-ui-panel",
      "rounded-ui-control",
      "focus-visible:ring-ui-focus",
    ]) {
      expect(allUi3hSource).toContain(tokenClass);
    }

    expect(saveButtonSource).toContain("bg-ui-accent");
    expect(saveButtonSource).toContain("hover:bg-ui-accent-hover");
    expect(saveButtonSource).toContain("text-ui-danger");
    expect(saveButtonSource).toContain("bg-ui-danger/10");
  });

  it("does not contain legacy zinc/dark/foreground/background classes or hardcoded colors", () => {
    for (const forbiddenPattern of [
      "zinc-",
      "dark:",
      "bg-foreground",
      "text-background",
      "text-foreground",
      "bg-background",
      "#383838",
      "#ccc",
      "text-red-",
      "bg-red-",
      "border-red-",
    ]) {
      expect(allUi3hSource).not.toContain(forbiddenPattern);
    }
  });

  it("TitlePatternPanel preserves MAX_DISPLAYED_PATTERNS, KIND_LABELS, and the props contract", () => {
    expect(patternPanelSource).toContain("const MAX_DISPLAYED_PATTERNS = 15;");
    expect(patternPanelSource).toContain(
      "const displayedPatterns = report.patterns.slice(0, MAX_DISPLAYED_PATTERNS);",
    );
    expect(patternPanelSource).toContain("interface TitlePatternPanelProps {");
    expect(patternPanelSource).toContain("readonly report: TitlePatternReport;");
    expect(patternPanelSource).toContain(
      "function PatternCard({ pattern, analyzedItemCount, analyzedChannelCount }: {",
    );
    expect(patternPanelSource).toContain("readonly pattern: TitlePattern;");
    expect(patternPanelSource).toContain("readonly analyzedItemCount: number;");
    expect(patternPanelSource).toContain("readonly analyzedChannelCount: number;");
    expect(patternPanelSource).toContain('word: "Word",');
    expect(patternPanelSource).toContain('bigram: "Two-word phrase",');
    expect(patternPanelSource).toContain('opening: "Title opening",');
    expect(patternPanelSource).toContain('ending: "Title ending",');
    expect(patternPanelSource).toContain('numeric: "Uses a number",');
    expect(patternPanelSource).toContain('"question-mark": "Question mark",');
  });

  it("TitlePatternPanel preserves ordering, evidence mapping, and every React key", () => {
    expect(patternPanelSource).toContain("if (report.patterns.length === 0) {");
    expect(patternPanelSource).toContain("displayedPatterns.map((pattern) => (");
    expect(patternPanelSource).toContain("key={`${pattern.kind}-${pattern.value}`}");
    expect(patternPanelSource).toContain("pattern.evidence.map((evidence) => (");
    expect(patternPanelSource).toContain("key={evidence.videoId}");

    for (const forbiddenPattern of [".sort(", ".filter(", "currentPage", "pageSize", "searchTerm"]) {
      expect(patternPanelSource).not.toContain(forbiddenPattern);
    }
  });

  it("TitlePatternPanel preserves the YouTube link contract, aria-labels, and exact visible copy", () => {
    expect(patternPanelSource).toContain("buildYoutubeWatchUrl(evidence.videoId)");
    expect(patternPanelSource).toContain('target="_blank"');
    expect(patternPanelSource).toContain('rel="noopener noreferrer"');
    expect(patternPanelSource).toContain("aria-label={`Open ${evidence.title} on YouTube`}");
    expect(patternPanelSource).toContain('aria-label="Repeated title patterns"');
    expect(patternPanelSource).toContain("Repeated title patterns");
    expect(patternPanelSource).toContain(
      "These patterns repeat in this analyzed set. They do not prove why a video performed well",
    );
    expect(patternPanelSource).toContain("and are not predictions or recommendations.");
    expect(patternPanelSource).toContain(
      "Not enough repeated title patterns were found across this set.",
    );
    expect(patternPanelSource).toContain("Found in {pattern.occurrenceCount} of {analyzedItemCount}");
    expect(patternPanelSource).toContain(
      "{pattern.channelSpread} of {analyzedChannelCount} channels represented in this analyzed",
    );
  });

  it("TitlePatternPanel adds no client directive, hooks, state, fetch calls, or new interaction", () => {
    expect(patternPanelSource).not.toContain('"use client"');
    for (const forbiddenPattern of ["useState", "useEffect", "useCallback", "useMemo", "fetch(", "onClick"]) {
      expect(patternPanelSource).not.toContain(forbiddenPattern);
    }
  });

  it("SaveResearchButton preserves the exact ButtonState union and the three state declarations", () => {
    expect(saveButtonSource).toContain(
      'type ButtonState = "idle" | "editing" | "saving" | "saved" | "error";',
    );
    expect(saveButtonSource).toContain('const [state, setState] = useState<ButtonState>("idle");');
    expect(saveButtonSource).toContain('const [name, setName] = useState("");');
    expect(saveButtonSource).toContain(
      "const [errorMessage, setErrorMessage] = useState<string | null>(null);",
    );
  });

  it("SaveResearchButton preserves handler names, storage lookup, saveSession call, and failure mapping", () => {
    expect(saveButtonSource).toContain("function handleStartEditing() {");
    expect(saveButtonSource).toContain("function handleCancel() {");
    expect(saveButtonSource).toContain("function handleSave() {");
    expect(saveButtonSource).toContain("function describeSaveError(reason: SaveSessionFailureReason): string {");
    expect(saveButtonSource).toContain(
      "const storage = getStorageSafely(typeof window === \"undefined\" ? undefined : window);",
    );
    expect(saveButtonSource).toContain("const outcome = saveSession(storage, { name, inputs, result });");
    expect(saveButtonSource).toContain('"Saving is not available in this browser session."');
    expect(saveButtonSource).toContain(
      '"Browser storage is full. Delete an older saved research and try again."',
    );
    expect(saveButtonSource).toContain('"Could not save this research. Please try again."');
    expect(saveButtonSource).toContain("interface SaveResearchButtonProps {");
    expect(saveButtonSource).toContain("readonly inputs: readonly string[];");
    expect(saveButtonSource).toContain("readonly result: OpportunityFeedResult;");

    // Every state transition inside handleStartEditing/handleCancel/handleSave,
    // preserved exactly, with occurrence counts where a statement must appear
    // more than once (setState("error") and setErrorMessage(null) each fire
    // from two different branches).
    expect(saveButtonSource).toContain('setState("editing");');
    expect(saveButtonSource).toContain('setState("idle");');
    expect(saveButtonSource).toContain('setState("saving");');
    expect(saveButtonSource).toContain('setState("saved");');
    expect(saveButtonSource).toContain('setName("");');
    expect(saveButtonSource).toContain(
      'setErrorMessage("Saving is not available in this browser session.");',
    );
    expect(saveButtonSource).toContain(
      "setErrorMessage(describeSaveError(outcome.reason));",
    );

    const setStateErrorCount = (saveButtonSource.match(/setState\("error"\);/g) ?? []).length;
    expect(setStateErrorCount).toBe(2);

    const setErrorMessageNullCount = (
      saveButtonSource.match(/setErrorMessage\(null\);/g) ?? []
    ).length;
    expect(setErrorMessageNullCount).toBe(2);
  });

  it("SaveResearchButton preserves exact visible text, the input contract, button types, and roles", () => {
    expect(saveButtonSource).toContain("Save this research");
    expect(saveButtonSource).toContain("Name this research (optional)");
    expect(saveButtonSource).toContain(
      "Saved research stays only in this browser. It will not appear on other",
    );
    expect(saveButtonSource).toContain("devices, and clearing browser data will remove it.");
    expect(saveButtonSource).toMatch(/<button\s[^>]*onClick=\{handleSave\}[^>]*>\s*Save\s*<\/button>/);
    expect(saveButtonSource).toContain("Cancel");
    expect(saveButtonSource).toContain("Saving...");
    expect(saveButtonSource).toContain("Saved.");
    expect(saveButtonSource).toContain("View in Research Workspace");
    expect(saveButtonSource).toContain("Try again");

    expect(saveButtonSource).toContain('htmlFor="workspace-session-name"');
    expect(saveButtonSource).toContain('id="workspace-session-name"');
    expect(saveButtonSource).toContain('type="text"');
    expect(saveButtonSource).toContain("value={name}");
    expect(saveButtonSource).toContain("onChange={(event) => setName(event.target.value)}");
    expect(saveButtonSource).toContain("maxLength={80}");

    const buttonTypeCount = (saveButtonSource.match(/type="button"/g) ?? []).length;
    expect(buttonTypeCount).toBe(4);
    expect(saveButtonSource).toContain('role="status"');
    expect(saveButtonSource).toContain('role="alert"');
    expect(saveButtonSource).toContain('href="/workspace"');
  });

  it("SaveResearchButton adds no disabled attributes, effects, timers, network calls, or new dependencies", () => {
    for (const forbiddenPattern of [
      "disabled",
      "useEffect",
      "setTimeout",
      "setInterval",
      "fetch(",
      "supabase",
      "Supabase",
      "auth",
      "telemetry",
      "analytics",
    ]) {
      expect(saveButtonSource).not.toContain(forbiddenPattern);
    }

    expect(saveButtonSource).toContain('"use client";');
  });

  it("keeps responsive wrapping and focus-visible protections present", () => {
    expect(patternPanelSource).toContain("min-w-0");
    expect(patternPanelSource).toContain("break-words");
    expect(patternPanelSource).toContain("line-clamp-2");
    expect(patternPanelSource).toContain("flex-wrap");

    expect(saveButtonSource).toContain("min-w-0");
    expect(saveButtonSource).toContain("flex-wrap");

    const focusRingCount = (allUi3hSource.match(/focus-visible:ring-2 focus-visible:ring-ui-focus/g) ?? [])
      .length;
    expect(focusRingCount).toBeGreaterThanOrEqual(5);
  });

  it("leaves existing Opportunity Feed and Workspace wiring untouched", () => {
    const opportunityFeedClientSource = readFileSync(
      resolve(process.cwd(), "components/opportunity-feed/OpportunityFeedClient.tsx"),
      "utf8",
    );
    const workspaceClientSource = readFileSync(
      resolve(process.cwd(), "components/workspace/WorkspaceClient.tsx"),
      "utf8",
    );

    expect(opportunityFeedClientSource).toContain(
      'import { SaveResearchButton } from "@/components/workspace/SaveResearchButton"',
    );
    expect(opportunityFeedClientSource).toContain(
      "<SaveResearchButton inputs={successfulInputs} result={result} />",
    );
    expect(opportunityFeedClientSource).toContain(
      'import { TitlePatternPanel } from "@/components/title-patterns/TitlePatternPanel"',
    );
    expect(opportunityFeedClientSource).toContain("<TitlePatternPanel report={titlePatternReport} />");
    expect(workspaceClientSource).toContain(
      'import { TitlePatternPanel } from "@/components/title-patterns/TitlePatternPanel"',
    );
    expect(workspaceClientSource).toContain(
      "<TitlePatternPanel report={analyzeTitlePatterns(session.result.items)} />",
    );
  });
});
