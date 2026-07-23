import { describe, expect, it } from "vitest";
import { enMessages } from "@/lib/i18n/dictionaries/en";
import { viMessages } from "@/lib/i18n/dictionaries/vi";
import {
  getActiveNavigationItems,
  getEnabledNavigationItems,
  getLocalizedNavigationSections,
  getPageMetadata,
  isProductRoute,
  NAVIGATION_SECTIONS,
} from "@/components/app-shell/navigation";

describe("product navigation", () => {
  it("preserves the exact structural section and item order", () => {
    expect(NAVIGATION_SECTIONS).toEqual([
      {
        messageKey: "research",
        items: [
          { messageKey: "analyzer", href: "/analyzer", match: "prefix", status: "available" },
          { messageKey: "compare", href: "/compare", match: "prefix", status: "available" },
          {
            messageKey: "opportunities",
            href: "/opportunities",
            match: "prefix",
            status: "available",
          },
          {
            messageKey: "workspace",
            href: "/workspace",
            match: "prefix",
            status: "available",
          },
          {
            messageKey: "transcript",
            href: "/transcript",
            match: "prefix",
            status: "available",
          },
          { messageKey: "titlePatterns", status: "embedded" },
        ],
      },
      {
        messageKey: "comingSoon",
        items: [
          { messageKey: "contentGaps", status: "coming-soon" },
          { messageKey: "ideaGenerator", status: "coming-soon" },
        ],
      },
    ]);
  });

  it("lists every existing product route exactly once, with no Overview item", () => {
    const enabledItems = getEnabledNavigationItems();
    const routes = enabledItems.map((item) => item.href);

    expect(routes).toEqual([
      "/analyzer",
      "/compare",
      "/opportunities",
      "/workspace",
      "/transcript",
    ]);
    expect(new Set(routes).size).toBe(routes.length);
    expect(enabledItems.every((item) => item.href !== undefined && item.href.length > 0)).toBe(true);
    expect(enabledItems.map((item) => item.messageKey)).toEqual([
      "analyzer",
      "compare",
      "opportunities",
      "workspace",
      "transcript",
    ]);
  });

  it("keeps disabled embedded and coming-soon items free of routes", () => {
    const disabledItems = NAVIGATION_SECTIONS.flatMap((section) => section.items).filter(
      (item) => item.status !== "available",
    );

    expect(disabledItems.map((item) => item.messageKey)).toEqual([
      "titlePatterns",
      "contentGaps",
      "ideaGenerator",
    ]);
    expect(disabledItems.every((item) => item.href === undefined)).toBe(true);
  });

  it("keeps Coming Soon items and Title Patterns structurally unchanged", () => {
    const disabledItems = NAVIGATION_SECTIONS.flatMap((section) => section.items);
    const comingSoonItems = disabledItems.filter((item) => item.status === "coming-soon");
    const titlePatterns = disabledItems.find((item) => item.messageKey === "titlePatterns");

    expect(comingSoonItems.map((item) => item.messageKey)).toEqual(["contentGaps", "ideaGenerator"]);
    expect(comingSoonItems.every((item) => item.href === undefined)).toBe(true);
    expect(titlePatterns?.status).toBe("embedded");
    expect(titlePatterns?.href).toBeUndefined();
  });

  it("routes every available navigation item to a real product route", () => {
    const enabledItems = getEnabledNavigationItems();

    expect(enabledItems.length).toBeGreaterThan(0);
    for (const item of enabledItems) {
      expect(item.href).toBeDefined();
      expect(isProductRoute(item.href as string)).toBe(true);
    }
  });

  it("treats / as not a product route", () => {
    expect(isProductRoute("/")).toBe(false);
    expect(getActiveNavigationItems("/")).toEqual([]);
  });

  it("rejects pathnames that only share a partial route prefix", () => {
    expect(getActiveNavigationItems("/opportunity")).toEqual([]);
    expect(getActiveNavigationItems("/transcription")).toEqual([]);
  });

  it.each([
    ["/analyzer", "analyzer"],
    ["/opportunities", "opportunities"],
    ["/workspace", "workspace"],
    ["/compare", "compare"],
    ["/transcript", "transcript"],
  ])("activates only the %s structural item", (pathname, messageKey) => {
    const activeItems = getActiveNavigationItems(pathname);

    expect(activeItems).toHaveLength(1);
    expect(activeItems[0]?.messageKey).toBe(messageKey);
  });

  it("uses prefix matching for future child routes without activating another item", () => {
    const opportunitiesItems = getActiveNavigationItems("/opportunities/saved");
    const transcriptItems = getActiveNavigationItems("/transcript/example");

    expect(opportunitiesItems).toHaveLength(1);
    expect(opportunitiesItems[0]?.messageKey).toBe("opportunities");
    expect(transcriptItems).toHaveLength(1);
    expect(transcriptItems[0]?.messageKey).toBe("transcript");
  });

  it("never activates more than one navigation item for a given pathname", () => {
    const pathnames = [
      "/",
      "/analyzer",
      "/compare",
      "/opportunities",
      "/workspace",
      "/transcript",
      "/transcript/example",
      "/transcription",
      "/opportunities/saved",
    ];

    for (const pathname of pathnames) {
      expect(getActiveNavigationItems(pathname).length).toBeLessThanOrEqual(1);
    }
  });

  it("localizes representative English navigation copy", () => {
    const sections = getLocalizedNavigationSections(enMessages);

    expect(sections[0]?.label).toBe("Research");
    expect(sections[1]?.label).toBe("Coming soon");
    expect(sections[0]?.items[0]?.label).toBe("Channel Analyzer");
    expect(sections[0]?.items[4]?.label).toBe("Transcript Intelligence");
    expect(enMessages.navigation.statuses.embedded).toBe("Inside research results");
    expect(enMessages.navigation.statuses.soon).toBe("Soon");
  });

  it("localizes representative Vietnamese navigation copy", () => {
    const sections = getLocalizedNavigationSections(viMessages);

    expect(sections[0]?.label).toBe("Nghiên cứu");
    expect(sections[1]?.label).toBe("Sắp ra mắt");
    expect(sections[0]?.items[0]?.label).toBe("Phân tích kênh");
    expect(sections[0]?.items[4]?.label).toBe("Phân tích lời thoại");
  });

  it("localizes page metadata for English and Vietnamese", () => {
    expect(getPageMetadata("/analyzer", enMessages)).toEqual({
      title: enMessages.navigation.items.analyzer.title,
      description: enMessages.navigation.items.analyzer.description,
    });
    expect(getPageMetadata("/transcript", enMessages)).toEqual({
      title: enMessages.navigation.items.transcript.title,
      description: enMessages.navigation.items.transcript.description,
    });
    expect(getPageMetadata("/analyzer", viMessages)).toEqual({
      title: viMessages.navigation.items.analyzer.title,
      description: viMessages.navigation.items.analyzer.description,
    });
    expect(getPageMetadata("/transcript", viMessages)).toEqual({
      title: viMessages.navigation.items.transcript.title,
      description: viMessages.navigation.items.transcript.description,
    });
  });

  it("localizes fallback metadata for unknown paths", () => {
    expect(getPageMetadata("/does-not-exist", enMessages)).toEqual(enMessages.fallbackPage);
    expect(getPageMetadata("/does-not-exist", viMessages)).toEqual(viMessages.fallbackPage);
  });

  it("keeps route activity independent from presentation language", () => {
    const [activeItem] = getActiveNavigationItems("/transcript");
    const englishTranscript = getLocalizedNavigationSections(enMessages)[0]?.items[4];
    const vietnameseTranscript = getLocalizedNavigationSections(viMessages)[0]?.items[4];

    expect(activeItem?.messageKey).toBe("transcript");
    expect(englishTranscript?.messageKey).toBe(activeItem?.messageKey);
    expect(vietnameseTranscript?.messageKey).toBe(activeItem?.messageKey);
  });

  it("does not mutate navigation structure or dictionaries while localizing", () => {
    const navigationBefore = JSON.parse(JSON.stringify(NAVIGATION_SECTIONS));
    const englishBefore = JSON.parse(JSON.stringify(enMessages));
    const vietnameseBefore = JSON.parse(JSON.stringify(viMessages));

    getLocalizedNavigationSections(enMessages);
    getLocalizedNavigationSections(viMessages);

    expect(NAVIGATION_SECTIONS).toEqual(navigationBefore);
    expect(enMessages).toEqual(englishBefore);
    expect(viMessages).toEqual(vietnameseBefore);
  });
});
