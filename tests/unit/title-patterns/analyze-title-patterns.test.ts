import { describe, expect, it } from "vitest";
import { analyzeTitlePatterns } from "@/lib/title-patterns/analyze-title-patterns";
import type { OpportunityFeedItem } from "@/lib/channel-analyzer/types";

function makeItem(overrides: Partial<OpportunityFeedItem> = {}): OpportunityFeedItem {
  return {
    videoId: "vid-1",
    title: "Title",
    thumbnailUrl: null,
    publishedAt: "2021-01-01T00:00:00.000Z",
    durationSeconds: 300,
    viewCount: 1000,
    channelId: "channel-a",
    channelTitle: "Channel A",
    channelMedianViews: 100,
    outlierRatio: 4,
    outlierLevel: "strong-outlier",
    ...overrides,
  };
}

function findPattern(
  report: ReturnType<typeof analyzeTitlePatterns>,
  kind: string,
  value: string,
) {
  return report.patterns.find((p) => p.kind === kind && p.value === value);
}

describe("analyzeTitlePatterns", () => {
  it("returns an exact empty report for empty input", () => {
    expect(analyzeTitlePatterns([])).toEqual({
      analyzedItemCount: 0,
      analyzedChannelCount: 0,
      patterns: [],
    });
  });

  it("dedupes by videoId, keeping the first occurrence", () => {
    const first = makeItem({ videoId: "dup", title: "First Title", channelTitle: "First Channel" });
    const second = makeItem({ videoId: "dup", title: "Second Title", channelTitle: "Second Channel" });
    const report = analyzeTitlePatterns([first, second, makeItem({ videoId: "other" })]);
    expect(report.analyzedItemCount).toBe(2); // "dup" counted once + "other"
  });

  it("dedupes before applying MAX_ANALYZED_ITEMS (fails if cap were applied first)", () => {
    // 150 copies of the same videoId, followed by 100 distinct videoIds.
    // Dedupe-then-cap: 1 unique "duplicate-video" + 100 unique = 101, under
    // the 200 cap, so all 101 survive.
    // Cap-then-dedupe (the bug this guards against): the first 200 raw items
    // are 150 copies of "duplicate-video" + only the first 50 unique ids —
    // deduping *after* that cap would leave just 1 + 50 = 51, not 101.
    const items: OpportunityFeedItem[] = [];
    for (let i = 0; i < 150; i += 1) {
      items.push(makeItem({ videoId: "duplicate-video", title: "Duplicate Title" }));
    }
    for (let i = 0; i < 100; i += 1) {
      items.push(makeItem({ videoId: `unique-${i}`, title: `Unique Title ${i}` }));
    }
    const report = analyzeTitlePatterns(items);
    expect(report.analyzedItemCount).toBe(101);
  });

  it("reflects unique item count after the MAX_ANALYZED_ITEMS cap", () => {
    const items = Array.from({ length: 250 }, (_, i) => makeItem({ videoId: `unique-${i}` }));
    const report = analyzeTitlePatterns(items);
    expect(report.analyzedItemCount).toBe(200);
  });

  it("computes analyzedChannelCount as the number of distinct channels", () => {
    const items = [
      makeItem({ videoId: "a", channelId: "c1" }),
      makeItem({ videoId: "b", channelId: "c1" }),
      makeItem({ videoId: "c", channelId: "c2" }),
    ];
    const report = analyzeTitlePatterns(items);
    expect(report.analyzedChannelCount).toBe(2);
  });

  it("excludes stopwords from the word pattern", () => {
    const items = [
      makeItem({ videoId: "a", title: "the amazing rescue", channelId: "c1" }),
      makeItem({ videoId: "b", title: "the amazing rescue", channelId: "c2" }),
      makeItem({ videoId: "c", title: "the amazing rescue", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "word", "the")).toBeUndefined();
    expect(findPattern(report, "word", "amazing")).toBeDefined();
    expect(findPattern(report, "word", "rescue")).toBeDefined();
  });

  it("keeps stopwords in bigrams (e.g. 'how to')", () => {
    const items = [
      makeItem({ videoId: "a", title: "how to rescue a fox", channelId: "c1" }),
      makeItem({ videoId: "b", title: "how to rescue a dog", channelId: "c2" }),
      makeItem({ videoId: "c", title: "how to rescue a cat", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "bigram", "how to")).toBeDefined();
  });

  it("creates a 1-token opening candidate", () => {
    const items = [
      makeItem({ videoId: "a", title: "Top secret plan", channelId: "c1" }),
      makeItem({ videoId: "b", title: "Top notch idea", channelId: "c2" }),
      makeItem({ videoId: "c", title: "Top of the world", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "opening", "top")).toBeDefined();
  });

  it("creates a 2-token opening candidate", () => {
    const items = [
      makeItem({ videoId: "a", title: "Top 10 rescues", channelId: "c1" }),
      makeItem({ videoId: "b", title: "Top 10 fails", channelId: "c2" }),
      makeItem({ videoId: "c", title: "Top 10 moments", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "opening", "top 10")).toBeDefined();
  });

  it("creates a 1-token ending candidate", () => {
    const items = [
      makeItem({ videoId: "a", title: "A wild rescue", channelId: "c1" }),
      makeItem({ videoId: "b", title: "Another crazy rescue", channelId: "c2" }),
      makeItem({ videoId: "c", title: "The greatest rescue", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "ending", "rescue")).toBeDefined();
  });

  it("creates a 2-token ending candidate", () => {
    const items = [
      makeItem({ videoId: "a", title: "This is the final rescue", channelId: "c1" }),
      makeItem({ videoId: "b", title: "This is the next final rescue", channelId: "c2" }),
      makeItem({ videoId: "c", title: "Here is the final rescue", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "ending", "final rescue")).toBeDefined();
  });

  it("uses a single fixed bucket for numeric titles regardless of the literal number", () => {
    const items = [
      makeItem({ videoId: "a", title: "5 reasons to love foxes", channelId: "c1" }),
      makeItem({ videoId: "b", title: "10 reasons to love dogs", channelId: "c2" }),
      makeItem({ videoId: "c", title: "3 reasons to love cats", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    const numericPatterns = report.patterns.filter((p) => p.kind === "numeric");
    expect(numericPatterns).toHaveLength(1);
    expect(numericPatterns[0]?.value).toBe("contains a number");
  });

  it("uses a single fixed bucket for question-marked titles", () => {
    const items = [
      makeItem({ videoId: "a", title: "Why did this happen?", channelId: "c1" }),
      makeItem({ videoId: "b", title: "How is this possible?", channelId: "c2" }),
      makeItem({ videoId: "c", title: "What just happened?", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    const questionPatterns = report.patterns.filter((p) => p.kind === "question-mark");
    expect(questionPatterns).toHaveLength(1);
    expect(questionPatterns[0]?.value).toBe("contains a question mark");
  });

  it("counts a candidate at most once per video even if the word repeats in the title", () => {
    const items = [
      makeItem({ videoId: "a", title: "sonic sonic sonic adventure", channelId: "c1" }),
      makeItem({ videoId: "b", title: "sonic runs fast", channelId: "c2" }),
      makeItem({ videoId: "c", title: "sonic saves the day", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "word", "sonic")?.occurrenceCount).toBe(3);
  });

  it("enforces MIN_PATTERN_OCCURRENCES as an absolute floor", () => {
    // Only 2 occurrences of "rescue" across a small set — below the floor of 3.
    const items = [
      makeItem({ videoId: "a", title: "animal rescue story", channelId: "c1" }),
      makeItem({ videoId: "b", title: "animal rescue tale", channelId: "c2" }),
    ];
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "word", "rescue")).toBeUndefined();
  });

  it("enforces MIN_PATTERN_OCCURRENCE_RATIO at larger sample sizes", () => {
    // 100 items, only 5 share "rescue" (5% < 25% ratio) -> excluded even
    // though 5 >= the absolute floor of 3.
    const items: OpportunityFeedItem[] = [];
    for (let i = 0; i < 5; i += 1) {
      items.push(makeItem({ videoId: `rescue-${i}`, title: "animal rescue story", channelId: `c${i}` }));
    }
    for (let i = 0; i < 95; i += 1) {
      items.push(makeItem({ videoId: `other-${i}`, title: `unrelated video number ${i}`, channelId: `c${i}` }));
    }
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "word", "rescue")).toBeUndefined();
  });

  it("applies Math.max(absolute floor, ratio floor) rather than either alone", () => {
    // 20 items, "rescue" shared by 5 (25% exactly meets the ratio floor of 5).
    const items: OpportunityFeedItem[] = [];
    for (let i = 0; i < 5; i += 1) {
      items.push(makeItem({ videoId: `rescue-${i}`, title: "animal rescue story", channelId: `c${i}` }));
    }
    for (let i = 0; i < 15; i += 1) {
      items.push(makeItem({ videoId: `other-${i}`, title: `unrelated video number ${i}`, channelId: `c${i}` }));
    }
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "word", "rescue")?.occurrenceCount).toBe(5);
  });

  it("excludes a pattern found in only one channel when multiple channels are represented", () => {
    const items = [
      makeItem({ videoId: "a", title: "unique gizmo alpha", channelId: "c1" }),
      makeItem({ videoId: "b", title: "unique gizmo beta", channelId: "c1" }),
      makeItem({ videoId: "c", title: "unique gizmo gamma", channelId: "c1" }),
      makeItem({ videoId: "d", title: "totally different topic", channelId: "c2" }),
    ];
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "word", "gizmo")).toBeUndefined();
  });

  it("skips the channel-spread gate when only one channel is represented", () => {
    const items = [
      makeItem({ videoId: "a", title: "unique gizmo alpha", channelId: "c1" }),
      makeItem({ videoId: "b", title: "unique gizmo beta", channelId: "c1" }),
      makeItem({ videoId: "c", title: "unique gizmo gamma", channelId: "c1" }),
    ];
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "word", "gizmo")?.occurrenceCount).toBe(3);
  });

  it("keeps a pattern with channelSpread=2 even when occurrence is heavily skewed to one channel (no occurrence balancing)", () => {
    const items = [
      makeItem({ videoId: "a", title: "gizmo one", channelId: "c1" }),
      makeItem({ videoId: "b", title: "gizmo two", channelId: "c1" }),
      makeItem({ videoId: "c", title: "gizmo three", channelId: "c1" }),
      makeItem({ videoId: "d", title: "gizmo four", channelId: "c1" }),
      makeItem({ videoId: "e", title: "gizmo five", channelId: "c2" }),
    ];
    const report = analyzeTitlePatterns(items);
    const pattern = findPattern(report, "word", "gizmo");
    expect(pattern).toBeDefined();
    expect(pattern?.channelSpread).toBe(2);
    expect(pattern?.occurrenceCount).toBe(5);
  });

  it("sorts evidence by outlierRatio descending", () => {
    const items = [
      makeItem({ videoId: "a", title: "gizmo alpha", channelId: "c1", outlierRatio: 2 }),
      makeItem({ videoId: "b", title: "gizmo beta", channelId: "c2", outlierRatio: 8 }),
      makeItem({ videoId: "c", title: "gizmo gamma", channelId: "c3", outlierRatio: 5 }),
    ];
    const report = analyzeTitlePatterns(items);
    const evidence = findPattern(report, "word", "gizmo")?.evidence ?? [];
    expect(evidence.map((e) => e.videoId)).toEqual(["b", "c", "a"]);
  });

  it("tie-breaks evidence by parsed publishedAt timestamp, not string comparison (opposing UTC offsets)", () => {
    // "zzz-a" (-05:00 offset) is 2021-01-02T04:00:00Z in real time — the
    // latest of the three. "aaa-b" (+00:00 offset) is 2021-01-02T00:00:00Z —
    // earlier than "zzz-a" in real time, but its *string* representation is
    // lexicographically GREATER than "zzz-a"'s string ("...01-02T00..." >
    // "...01-01T23..." because the day digit "2" > "1"). videoId is chosen
    // so that neither a plain string comparison of publishedAt, nor a plain
    // videoId comparison, would coincidentally reproduce the correct
    // Date.parse-based order — both alternate orderings differ from the
    // asserted one below.
    const items = [
      makeItem({
        videoId: "zzz-a",
        title: "gizmo alpha",
        channelId: "c1",
        outlierRatio: 3,
        publishedAt: "2021-01-01T23:00:00-05:00", // real: 2021-01-02T04:00:00Z (latest)
      }),
      makeItem({
        videoId: "aaa-b",
        title: "gizmo beta",
        channelId: "c2",
        outlierRatio: 3,
        publishedAt: "2021-01-02T00:00:00+00:00", // real: 2021-01-02T00:00:00Z
      }),
      makeItem({
        videoId: "mmm-c",
        title: "gizmo gamma",
        channelId: "c3",
        outlierRatio: 3,
        publishedAt: "2020-01-01T00:00:00.000Z", // real: oldest of the three
      }),
    ];
    const report = analyzeTitlePatterns(items);
    const evidence = findPattern(report, "word", "gizmo")?.evidence ?? [];
    // Correct (Date.parse, newest first): zzz-a, aaa-b, mmm-c.
    // A naive string-descending compare of publishedAt would instead yield
    // aaa-b, zzz-a, mmm-c (since the raw string "...01-02..." > "...01-01...").
    // A plain videoId-ascending order would instead yield aaa-b, mmm-c, zzz-a.
    // Neither wrong ordering matches the assertion below.
    expect(evidence.map((e) => e.videoId)).toEqual(["zzz-a", "aaa-b", "mmm-c"]);
  });

  it("tie-breaks evidence by videoId ascending when outlierRatio and publishedAt are identical", () => {
    const items = [
      makeItem({ videoId: "z", title: "gizmo alpha", channelId: "c1", outlierRatio: 3, publishedAt: "2021-01-01T00:00:00.000Z" }),
      makeItem({ videoId: "a", title: "gizmo beta", channelId: "c2", outlierRatio: 3, publishedAt: "2021-01-01T00:00:00.000Z" }),
      makeItem({ videoId: "m", title: "gizmo gamma", channelId: "c3", outlierRatio: 3, publishedAt: "2021-01-01T00:00:00.000Z" }),
    ];
    const report = analyzeTitlePatterns(items);
    const evidence = findPattern(report, "word", "gizmo")?.evidence ?? [];
    expect(evidence.map((e) => e.videoId)).toEqual(["a", "m", "z"]);
  });

  it("caps evidence at MAX_EVIDENCE_PER_PATTERN (5)", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      makeItem({ videoId: `v${i}`, title: `gizmo variant ${i}`, channelId: `c${i}`, outlierRatio: 10 - i }),
    );
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "word", "gizmo")?.evidence).toHaveLength(5);
  });

  it("sorts patterns by channelSpread descending first", () => {
    const items = [
      // "alpha" appears in 3 videos across 2 channels (spread 2, occurrence 3).
      makeItem({ videoId: "a1", title: "alpha keyword only", channelId: "c1" }),
      makeItem({ videoId: "a2", title: "alpha keyword again", channelId: "c1" }),
      makeItem({ videoId: "a3", title: "alpha keyword repeat", channelId: "c2" }),
      // "beta" appears in 3 videos across 3 channels (spread 3, occurrence 3).
      makeItem({ videoId: "b1", title: "beta keyword only", channelId: "c1" }),
      makeItem({ videoId: "b2", title: "beta keyword again", channelId: "c2" }),
      makeItem({ videoId: "b3", title: "beta keyword repeat", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    const alphaIndex = report.patterns.findIndex((p) => p.value === "alpha");
    const betaIndex = report.patterns.findIndex((p) => p.value === "beta");
    expect(alphaIndex).toBeGreaterThanOrEqual(0);
    expect(betaIndex).toBeGreaterThanOrEqual(0);
    expect(betaIndex).toBeLessThan(alphaIndex);
  });

  it("sorts patterns by occurrenceCount descending when channelSpread ties", () => {
    const items = [
      makeItem({ videoId: "a1", title: "alpha keyword one", channelId: "c1" }),
      makeItem({ videoId: "a2", title: "alpha keyword two", channelId: "c2" }),
      makeItem({ videoId: "a3", title: "alpha keyword three", channelId: "c3" }),
      makeItem({ videoId: "a4", title: "alpha keyword four", channelId: "c1" }),
      makeItem({ videoId: "b1", title: "beta keyword one", channelId: "c1" }),
      makeItem({ videoId: "b2", title: "beta keyword two", channelId: "c2" }),
      makeItem({ videoId: "b3", title: "beta keyword three", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    const alphaIndex = report.patterns.findIndex((p) => p.value === "alpha");
    const betaIndex = report.patterns.findIndex((p) => p.value === "beta");
    expect(alphaIndex).toBeLessThan(betaIndex); // alpha has occurrenceCount 4 > beta's 3
  });

  it("sorts patterns by KIND_ORDER when channelSpread and occurrenceCount tie, even when value order disagrees", () => {
    // "zzz" (word) and "aaa bbb" (bigram) both occur in all 3 titles across
    // 3 distinct channels, so channelSpread=3 and occurrenceCount=3 for
    // both — a genuine tie on the first two sort criteria. Lexically,
    // "aaa bbb" < "zzz", so a comparator that fell through to value
    // comparison without first checking KIND_ORDER would rank the bigram
    // BEFORE the word — the opposite of what is asserted below. This only
    // passes if the KIND_ORDER step actually runs and wins.
    const items = [
      makeItem({ videoId: "a1", title: "aaa bbb zzz", channelId: "c1" }),
      makeItem({ videoId: "a2", title: "aaa bbb zzz", channelId: "c2" }),
      makeItem({ videoId: "a3", title: "aaa bbb zzz", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    const wordPattern = findPattern(report, "word", "zzz");
    const bigramPattern = findPattern(report, "bigram", "aaa bbb");
    expect(wordPattern?.channelSpread).toBe(3);
    expect(wordPattern?.occurrenceCount).toBe(3);
    expect(bigramPattern?.channelSpread).toBe(3);
    expect(bigramPattern?.occurrenceCount).toBe(3);
    const wordIndex = report.patterns.findIndex((p) => p.kind === "word" && p.value === "zzz");
    const bigramIndex = report.patterns.findIndex((p) => p.kind === "bigram" && p.value === "aaa bbb");
    expect(wordIndex).toBeLessThan(bigramIndex); // word (0) sorts before bigram (1) in KIND_ORDER
  });

  it("sorts patterns by code-point value comparison, not localeCompare, when kind, spread, and count all tie", () => {
    // Plain code-unit comparison: "cafz" < "café" ('z' is U+007A, 'é' is
    // U+00E9, and 'z' < 'é' as a raw code point). Under typical locale
    // collation (verified with Node's actual ICU implementation:
    // "cafz".localeCompare("café") === 1), the accent is weighted low and
    // "café" sorts BEFORE "cafz" instead — the opposite order. The expected
    // order below is a literal, hand-verified assertion, not computed via
    // localeCompare in the test itself.
    const items = [
      makeItem({ videoId: "a1", title: "cafz alpha video", channelId: "c1" }),
      makeItem({ videoId: "a2", title: "cafz beta video", channelId: "c2" }),
      makeItem({ videoId: "a3", title: "cafz gamma video", channelId: "c3" }),
      makeItem({ videoId: "b1", title: "café alpha video", channelId: "c1" }),
      makeItem({ videoId: "b2", title: "café beta video", channelId: "c2" }),
      makeItem({ videoId: "b3", title: "café gamma video", channelId: "c3" }),
    ];
    const report = analyzeTitlePatterns(items);
    const cafzPattern = findPattern(report, "word", "cafz");
    const cafePattern = findPattern(report, "word", "café");
    expect(cafzPattern?.channelSpread).toBe(3);
    expect(cafzPattern?.occurrenceCount).toBe(3);
    expect(cafePattern?.channelSpread).toBe(3);
    expect(cafePattern?.occurrenceCount).toBe(3);
    const cafzIndex = report.patterns.findIndex((p) => p.kind === "word" && p.value === "cafz");
    const cafeIndex = report.patterns.findIndex((p) => p.kind === "word" && p.value === "café");
    expect(cafzIndex).toBeLessThan(cafeIndex);
  });

  it("produces identical output (including evidence order) across two calls with the same input", () => {
    const items = [
      makeItem({ videoId: "a", title: "Top 10 rescue stories", channelId: "c1", outlierRatio: 3 }),
      makeItem({ videoId: "b", title: "Top 10 rescue tales?", channelId: "c2", outlierRatio: 6 }),
      makeItem({ videoId: "c", title: "Top 10 rescue moments", channelId: "c3", outlierRatio: 4 }),
    ];
    const first = analyzeTitlePatterns(items);
    const second = analyzeTitlePatterns(items);
    expect(first).toEqual(second);
  });

  it("handles an English and a Spanish title together without crashing and keeps Spanish accents", () => {
    const items = [
      makeItem({ videoId: "a", title: "the amazing rescue story", channelId: "c1" }),
      makeItem({ videoId: "b", title: "la increíble historia de rescate", channelId: "c2" }),
      makeItem({ videoId: "c", title: "una historia de rescate increíble", channelId: "c3" }),
      makeItem({ videoId: "d", title: "otra historia increíble de rescate", channelId: "c4" }),
    ];
    expect(() => analyzeTitlePatterns(items)).not.toThrow();
    const report = analyzeTitlePatterns(items);
    expect(findPattern(report, "word", "increíble")).toBeDefined();
    expect(findPattern(report, "word", "la")).toBeUndefined(); // Spanish stopword
    expect(findPattern(report, "word", "the")).toBeUndefined(); // English stopword
  });

  it("enforces MAX_ANALYZED_ITEMS as a defensive cap on unique items", () => {
    const items = Array.from({ length: 250 }, (_, i) => makeItem({ videoId: `unique-${i}` }));
    const report = analyzeTitlePatterns(items);
    expect(report.analyzedItemCount).toBeLessThanOrEqual(200);
  });

  it("does not mutate the input array or its item objects", () => {
    const items = [makeItem({ videoId: "a" }), makeItem({ videoId: "b" }), makeItem({ videoId: "c" })];
    const snapshot = JSON.parse(JSON.stringify(items));
    analyzeTitlePatterns(items);
    expect(items).toEqual(snapshot);
  });
});
