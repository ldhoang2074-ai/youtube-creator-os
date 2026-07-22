import { describe, expect, it } from "vitest";
import {
  getActiveNavigationItems,
  getEnabledNavigationItems,
  getPageMetadata,
  isProductRoute,
  NAVIGATION_SECTIONS,
} from "@/components/app-shell/navigation";

describe("product navigation", () => {
  it("lists every existing product route exactly once, with no Overview item", () => {
    const enabledItems = getEnabledNavigationItems();
    const routes = enabledItems.map((item) => item.href);

    expect(routes).toEqual(["/analyzer", "/compare", "/opportunities", "/workspace"]);
    expect(new Set(routes).size).toBe(routes.length);
    expect(enabledItems.every((item) => item.href !== undefined && item.href.length > 0)).toBe(true);
    expect(enabledItems.some((item) => item.label === "Overview")).toBe(false);
  });

  it("renders disabled embedded and coming-soon items without routes", () => {
    const disabledItems = NAVIGATION_SECTIONS.flatMap((section) => section.items).filter(
      (item) => item.status !== "available",
    );

    expect(disabledItems.map((item) => item.label)).toEqual([
      "Title Patterns",
      "Transcript Intelligence",
      "Content Gaps",
      "Idea Generator",
    ]);
    expect(disabledItems.every((item) => item.href === undefined)).toBe(true);
  });

  it("keeps Coming Soon items free of hrefs", () => {
    const comingSoonItems = NAVIGATION_SECTIONS.flatMap((section) => section.items).filter(
      (item) => item.status === "coming-soon",
    );

    expect(comingSoonItems).toHaveLength(3);
    expect(comingSoonItems.every((item) => item.href === undefined)).toBe(true);
  });

  it("keeps the embedded Title Patterns item free of an href", () => {
    const titlePatterns = NAVIGATION_SECTIONS.flatMap((section) => section.items).find(
      (item) => item.label === "Title Patterns",
    );

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

  it("does not activate Opportunities for a pathname that only shares its prefix", () => {
    expect(getActiveNavigationItems("/opportunity")).toEqual([]);
  });

  it.each([
    ["/analyzer", "Channel Analyzer"],
    ["/opportunities", "Opportunities"],
    ["/workspace", "Research Workspace"],
    ["/compare", "Channel Compare"],
  ])("activates only %s for %s", (pathname, label) => {
    const activeItems = getActiveNavigationItems(pathname);

    expect(activeItems).toHaveLength(1);
    expect(activeItems[0]?.label).toBe(label);
  });

  it("uses prefix matching for future child routes without activating another item", () => {
    const activeItems = getActiveNavigationItems("/opportunities/saved");

    expect(activeItems).toHaveLength(1);
    expect(activeItems[0]?.label).toBe("Opportunities");
  });

  it("never activates more than one navigation item for a given pathname", () => {
    const pathnames = ["/", "/analyzer", "/compare", "/opportunities", "/workspace", "/opportunities/saved"];

    for (const pathname of pathnames) {
      expect(getActiveNavigationItems(pathname).length).toBeLessThanOrEqual(1);
    }
  });

  it("provides shell metadata for active product pages", () => {
    expect(getPageMetadata("/analyzer")).toEqual({
      title: "Channel Analyzer",
      description: "Analyze recent channel performance and identify outlier videos.",
    });
    expect(getPageMetadata("/compare")).toEqual({
      title: "Channel Compare",
      description: "Compare recent channel performance side by side.",
    });
    expect(getPageMetadata("/opportunities")).toEqual({
      title: "Opportunities",
      description: "Compare high-performing videos across multiple channels.",
    });
    expect(getPageMetadata("/workspace")).toEqual({
      title: "Research Workspace",
      description: "Save and revisit channel research sessions.",
    });
    expect(isProductRoute("/")).toBe(false);
    expect(isProductRoute("/workspace")).toBe(true);
  });

  it("falls back to a default title and description for a pathname with no active item", () => {
    expect(getPageMetadata("/does-not-exist")).toEqual({
      title: "YouTube Creator OS",
      description: "Channel research for creators.",
    });
    expect(getActiveNavigationItems("/does-not-exist")).toEqual([]);
  });
});
