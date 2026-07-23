import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const shellFiles = [
  "components/app-shell/app-shell.tsx",
  "components/app-shell/brand.tsx",
  "components/app-shell/product-header.tsx",
  "components/app-shell/product-navigation.tsx",
] as const;

const shellSources = Object.fromEntries(
  shellFiles.map((file) => [file, readFileSync(resolve(process.cwd(), file), "utf8")]),
);
const allShellSource = Object.values(shellSources).join("\n");
const appShellSource = shellSources["components/app-shell/app-shell.tsx"];
const navigationSource = shellSources["components/app-shell/product-navigation.tsx"];

describe("AppShell visual contract", () => {
  it("consumes representative semantic design tokens", () => {
    for (const tokenClass of [
      "bg-ui-bg",
      "bg-ui-sidebar",
      "bg-ui-panel-elevated",
      "bg-ui-surface-muted",
      "border-ui-border",
      "text-ui-text",
      "text-ui-text-muted",
      "bg-ui-accent",
      "ring-ui-focus",
      "rounded-ui-control",
    ]) {
      expect(allShellSource).toContain(tokenClass);
    }
  });

  it("removes the old shell palette from every redesigned shell component", () => {
    for (const forbiddenClass of ["zinc-", "dark:", "bg-white", "border-zinc", "text-zinc"]) {
      expect(allShellSource).not.toContain(forbiddenClass);
    }
  });

  it("defines complete local inline navigation icons", () => {
    expect(navigationSource).toContain("Record<NavigationItemKey, ReactNode>");

    for (const messageKey of [
      "analyzer",
      "compare",
      "opportunities",
      "workspace",
      "transcript",
      "titlePatterns",
      "contentGaps",
      "ideaGenerator",
    ]) {
      expect(navigationSource).toContain(`${messageKey}:`);
    }

    const svgCount = (allShellSource.match(/<svg\b/g) ?? []).length;
    const ariaHiddenSvgCount = (allShellSource.match(/<svg aria-hidden="true"/g) ?? []).length;

    expect(svgCount).toBeGreaterThanOrEqual(10);
    expect(ariaHiddenSvgCount).toBe(svgCount);
  });

  it("wraps the embedded status within the navigation text column", () => {
    const embeddedStatusBranch =
      navigationSource.match(/\{embeddedStatusLabel !== undefined \? \([\s\S]*?\) : null\}/)?.[0] ?? "";

    expect(navigationSource).toContain('item.status === "embedded"');
    expect(navigationSource).toContain('<span className="min-w-0 flex-1">');
    expect(embeddedStatusBranch).toContain("max-w-full");
    expect(embeddedStatusBranch).toContain("whitespace-normal");
    expect(embeddedStatusBranch).toContain("break-words");
    expect(embeddedStatusBranch).not.toContain("shrink-0");
    expect(embeddedStatusBranch).not.toContain("whitespace-nowrap");
  });

  it("keeps the coming-soon status as a compact single-line pill", () => {
    const comingSoonStatusBranch =
      navigationSource.match(/\{comingSoonStatusLabel !== undefined \? \([\s\S]*?\) : null\}/)?.[0] ?? "";

    expect(navigationSource).toContain('item.status === "coming-soon"');
    expect(comingSoonStatusBranch).toContain("shrink-0");
    expect(comingSoonStatusBranch).toContain("whitespace-nowrap");
    expect(comingSoonStatusBranch).toContain("rounded-ui-pill");
  });

  it("retains critical drawer interaction ownership in AppShell", () => {
    for (const behaviorContract of [
      "mobileNavigationOpen",
      "openButtonRef",
      "closeButtonRef",
      "drawerRef",
      "previouslyFocusedElementRef",
      "shouldRestoreFocusRef",
      "mobileNavigationOpenRef",
      "DRAWER_FOCUSABLE_SELECTOR",
      "flushSync",
      "closeMobileNavigation",
      "navigateFromMobileDrawer",
      "handleDrawerKeyDown",
    ]) {
      expect(appShellSource).toContain(behaviorContract);
    }
  });

  it("does not introduce fake product-control imports or visible labels", () => {
    expect(allShellSource).not.toMatch(
      /from\s+["'][^"']*(?:credit|billing|notification|avatar|account|auth)[^"']*["']/i,
    );
    expect(allShellSource).not.toMatch(
      /(?:aria-label|title)=["'][^"']*(?:credit|billing|notification|avatar|account|sign in|sign up|login)[^"']*["']/i,
    );
    expect(allShellSource).not.toMatch(
      />\s*(?:credits|billing|notifications|sign in|sign up|login)\s*</i,
    );
  });
});
