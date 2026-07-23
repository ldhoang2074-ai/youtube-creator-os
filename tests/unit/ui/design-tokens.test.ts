import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

const rootColorTokens = {
  "--ui-bg": "#09090b",
  "--ui-sidebar": "#0c0c0f",
  "--ui-panel": "#111114",
  "--ui-panel-elevated": "#17171c",
  "--ui-surface-muted": "#1d1d23",
  "--ui-border": "#2a2a32",
  "--ui-text": "#fafafa",
  "--ui-text-secondary": "#d4d4d8",
  "--ui-text-muted": "#8b8b95",
  "--ui-accent": "#dc2626",
  "--ui-accent-hover": "#b91c1c",
  "--ui-success": "#22c55e",
  "--ui-warning": "#f59e0b",
  "--ui-danger": "#ef4444",
  "--ui-focus": "#f87171",
} as const;

const rootSpacingTokens = {
  "--ui-space-1": "0.25rem",
  "--ui-space-2": "0.5rem",
  "--ui-space-3": "0.75rem",
  "--ui-space-4": "1rem",
  "--ui-space-6": "1.5rem",
  "--ui-space-8": "2rem",
  "--ui-space-10": "2.5rem",
  "--ui-space-12": "3rem",
} as const;

const rootRadiusTokens = {
  "--ui-radius-control": "0.375rem",
  "--ui-radius-panel": "0.625rem",
  "--ui-radius-dialog": "0.875rem",
  "--ui-radius-pill": "9999px",
} as const;

const rootTypographyTokens = {
  "--ui-text-label": "0.75rem",
  "--ui-text-label-line-height": "1rem",
  "--ui-text-body-sm": "0.875rem",
  "--ui-text-body-sm-line-height": "1.25rem",
  "--ui-text-body": "1rem",
  "--ui-text-body-line-height": "1.5rem",
  "--ui-text-section": "1.25rem",
  "--ui-text-section-line-height": "1.75rem",
  "--ui-text-page": "1.75rem",
  "--ui-text-page-line-height": "2.25rem",
} as const;

const tailwindColorMappings = {
  "--color-ui-bg": "var(--ui-bg)",
  "--color-ui-sidebar": "var(--ui-sidebar)",
  "--color-ui-panel": "var(--ui-panel)",
  "--color-ui-panel-elevated": "var(--ui-panel-elevated)",
  "--color-ui-surface-muted": "var(--ui-surface-muted)",
  "--color-ui-border": "var(--ui-border)",
  "--color-ui-text": "var(--ui-text)",
  "--color-ui-text-secondary": "var(--ui-text-secondary)",
  "--color-ui-text-muted": "var(--ui-text-muted)",
  "--color-ui-accent": "var(--ui-accent)",
  "--color-ui-accent-hover": "var(--ui-accent-hover)",
  "--color-ui-success": "var(--ui-success)",
  "--color-ui-warning": "var(--ui-warning)",
  "--color-ui-danger": "var(--ui-danger)",
  "--color-ui-focus": "var(--ui-focus)",
} as const;

const tailwindSpacingMappings = {
  "--spacing-ui-1": "var(--ui-space-1)",
  "--spacing-ui-2": "var(--ui-space-2)",
  "--spacing-ui-3": "var(--ui-space-3)",
  "--spacing-ui-4": "var(--ui-space-4)",
  "--spacing-ui-6": "var(--ui-space-6)",
  "--spacing-ui-8": "var(--ui-space-8)",
  "--spacing-ui-10": "var(--ui-space-10)",
  "--spacing-ui-12": "var(--ui-space-12)",
} as const;

const tailwindRadiusMappings = {
  "--radius-ui-control": "var(--ui-radius-control)",
  "--radius-ui-panel": "var(--ui-radius-panel)",
  "--radius-ui-dialog": "var(--ui-radius-dialog)",
  "--radius-ui-pill": "var(--ui-radius-pill)",
} as const;

const tailwindTypographyMappings = {
  "--text-ui-label": "var(--ui-text-label)",
  "--text-ui-label--line-height": "var(--ui-text-label-line-height)",
  "--text-ui-body-sm": "var(--ui-text-body-sm)",
  "--text-ui-body-sm--line-height": "var(--ui-text-body-sm-line-height)",
  "--text-ui-body": "var(--ui-text-body)",
  "--text-ui-body--line-height": "var(--ui-text-body-line-height)",
  "--text-ui-section": "var(--ui-text-section)",
  "--text-ui-section--line-height": "var(--ui-text-section-line-height)",
  "--text-ui-page": "var(--ui-text-page)",
  "--text-ui-page--line-height": "var(--ui-text-page-line-height)",
} as const;

const coreTailwindMappings = {
  "--color-background": "var(--background)",
  "--color-foreground": "var(--foreground)",
  "--font-sans": "var(--font-geist-sans)",
  "--font-mono": "var(--font-geist-mono)",
} as const;

const rootSemanticTokens = {
  ...rootColorTokens,
  ...rootSpacingTokens,
  ...rootRadiusTokens,
  ...rootTypographyTokens,
} as const;

const tailwindSemanticMappings = {
  ...tailwindColorMappings,
  ...tailwindSpacingMappings,
  ...tailwindRadiusMappings,
  ...tailwindTypographyMappings,
} as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

function declarationPattern(name: string, value?: string): RegExp {
  const expectedValue = value === undefined ? "[^;]+" : escapeRegExp(value);

  return new RegExp(
    `(^|\\n)\\s*${escapeRegExp(name)}\\s*:\\s*${expectedValue}\\s*;(?=\\s*(?:\\n|$))`,
    "gm",
  );
}

function extractBlock(source: string, blockStart: string): string {
  const startIndex = source.indexOf(blockStart);
  const openingBraceIndex = source.indexOf("{", startIndex);

  if (startIndex === -1 || openingBraceIndex === -1) {
    throw new Error(`Missing ${blockStart} block.`);
  }

  let depth = 0;

  for (let index = openingBraceIndex; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  throw new Error(`Unclosed ${blockStart} block.`);
}

const rootBlock = extractBlock(globalsCss, ":root");
const themeBlock = extractBlock(globalsCss, "@theme inline");
const cssOutsideApprovedAreas = globalsCss
  .replace(rootBlock, "")
  .replace(themeBlock, "");

describe("semantic design tokens", () => {
  it("defines every approved root token exactly once", () => {
    expect(Object.keys(rootColorTokens)).toHaveLength(15);
    expect(Object.keys(rootSpacingTokens)).toHaveLength(8);
    expect(Object.keys(rootRadiusTokens)).toHaveLength(4);
    expect(Object.keys(rootTypographyTokens)).toHaveLength(10);
    expect(Object.keys(rootSemanticTokens)).toHaveLength(37);

    for (const [name, value] of Object.entries(rootSemanticTokens)) {
      expect(countMatches(rootBlock, declarationPattern(name, value))).toBe(1);
      expect(countMatches(globalsCss, declarationPattern(name))).toBe(1);
    }
  });

  it("defines every approved Tailwind semantic mapping exactly once", () => {
    expect(Object.keys(tailwindColorMappings)).toHaveLength(15);
    expect(Object.keys(tailwindSpacingMappings)).toHaveLength(8);
    expect(Object.keys(tailwindRadiusMappings)).toHaveLength(4);
    expect(Object.keys(tailwindTypographyMappings)).toHaveLength(10);
    expect(Object.keys(tailwindSemanticMappings)).toHaveLength(37);

    for (const [name, value] of Object.entries(tailwindSemanticMappings)) {
      expect(countMatches(themeBlock, declarationPattern(name, value))).toBe(1);
      expect(countMatches(globalsCss, declarationPattern(name))).toBe(1);
    }
  });

  it("preserves the existing light, dark, body, and core Tailwind contracts", () => {
    expect(countMatches(globalsCss, declarationPattern("--background", "#ffffff"))).toBe(1);
    expect(countMatches(globalsCss, declarationPattern("--foreground", "#171717"))).toBe(1);
    expect(globalsCss).toContain("@media (prefers-color-scheme: dark)");
    expect(globalsCss).toContain("--background: #0a0a0a;");
    expect(globalsCss).toContain("--foreground: #ededed;");
    expect(globalsCss).toContain("background: var(--background);");
    expect(globalsCss).toContain("color: var(--foreground);");
    expect(globalsCss).toContain("font-family: Arial, Helvetica, sans-serif;");

    for (const [name, value] of Object.entries(coreTailwindMappings)) {
      expect(countMatches(themeBlock, declarationPattern(name, value))).toBe(1);
      expect(countMatches(globalsCss, declarationPattern(name))).toBe(1);
    }
  });

  it("keeps semantic tokens and Tailwind mappings out of rendered CSS", () => {
    expect(cssOutsideApprovedAreas).not.toMatch(/var\(\s*--ui-/);

    for (const name of Object.keys(tailwindSemanticMappings)) {
      expect(cssOutsideApprovedAreas).not.toContain(name);
    }
  });
});
