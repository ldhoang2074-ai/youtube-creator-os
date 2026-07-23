import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ux1Files = [
  "components/channel-analyzer/ChannelAnalyzerClient.tsx",
  "components/channel-compare/ChannelCompareClient.tsx",
  "components/opportunity-feed/OpportunityFeedClient.tsx",
  "components/transcript/TranscriptIntelligenceClient.tsx",
] as const;

const ux1Sources = Object.fromEntries(
  ux1Files.map((file) => [file, readFileSync(resolve(process.cwd(), file), "utf8")]),
);

describe("UX-1 persistent draft wiring", () => {
  it("every draftable page uses the shared usePersistentDraft hook instead of duplicating localStorage logic", () => {
    for (const file of ux1Files) {
      const source = ux1Sources[file];
      expect(source).toContain(
        'import { usePersistentDraft } from "@/lib/drafts/use-persistent-draft"',
      );
      expect(source).toContain("usePersistentDraft(");
    }
  });

  it("no draftable page touches window/localStorage directly (SSR-safe access stays inside the shared hook)", () => {
    for (const file of ux1Files) {
      const source = ux1Sources[file];
      expect(source).not.toContain("localStorage");
      expect(source).not.toContain("window.");
    }
  });

  it("each page namespaces its draft under its own versioned storage key", () => {
    const keys = [
      ["components/channel-analyzer/ChannelAnalyzerClient.tsx", "youtube-creator-os:draft:analyzer:v1"],
      ["components/channel-compare/ChannelCompareClient.tsx", "youtube-creator-os:draft:compare:v1"],
      [
        "components/opportunity-feed/OpportunityFeedClient.tsx",
        "youtube-creator-os:draft:opportunities:v1",
      ],
      ["components/transcript/TranscriptIntelligenceClient.tsx", "youtube-creator-os:draft:transcript:v1"],
    ] as const;

    for (const [file, key] of keys) {
      expect(ux1Sources[file]).toContain(`"${key}"`);
    }

    const allKeys = keys.map(([, key]) => key);
    expect(new Set(allKeys).size).toBe(allKeys.length);
  });

  it("Opportunity Feed passes initialInputs as the priority value so it wins over any stored draft", () => {
    const source = ux1Sources["components/opportunity-feed/OpportunityFeedClient.tsx"];

    expect(source).toContain("usePersistentDraft(DRAFT_STORAGE_KEY, {");
    expect(source).toContain(
      "priorityValue: initialInputs && initialInputs.length > 0 ? initialInputs.join(\"\\n\") : \"\",",
    );
  });

  it("does not change the compare/opportunity request contracts or business logic", () => {
    const compareSource = ux1Sources["components/channel-compare/ChannelCompareClient.tsx"];
    expect(compareSource).toContain('fetch("/api/compare", {');
    expect(compareSource).toContain("body: JSON.stringify({ inputs })");

    const opportunitySource = ux1Sources["components/opportunity-feed/OpportunityFeedClient.tsx"];
    expect(opportunitySource).toContain('fetch("/api/opportunities", {');
    expect(opportunitySource).toContain("body: JSON.stringify({ inputs })");
  });
});
