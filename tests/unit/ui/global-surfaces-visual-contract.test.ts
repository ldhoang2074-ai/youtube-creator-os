import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ui3gFiles = ["app/page.tsx", "app/loading.tsx", "app/error.tsx"] as const;

const ui3gSources = Object.fromEntries(
  ui3gFiles.map((file) => [file, readFileSync(resolve(process.cwd(), file), "utf8")]),
);
const allUi3gSource = Object.values(ui3gSources).join("\n");
const homeSource = ui3gSources["app/page.tsx"];
const loadingSource = ui3gSources["app/loading.tsx"];
const errorSource = ui3gSources["app/error.tsx"];

describe("Global surfaces visual contract", () => {
  it("uses the semantic dark UI token contract", () => {
    for (const tokenClass of [
      "bg-ui-bg",
      "text-ui-text",
      "text-ui-text-secondary",
      "bg-ui-accent",
      "hover:bg-ui-accent-hover",
      "focus-visible:ring-ui-focus",
    ]) {
      expect(allUi3gSource).toContain(tokenClass);
    }

    expect(errorSource).toContain("rounded-ui-panel");
    expect(errorSource).toContain("bg-ui-danger/10");
    expect(errorSource).toContain("border-ui-danger/40");
    expect(errorSource).toContain("rounded-ui-control");
    expect(loadingSource).toContain("border-ui-border");
    expect(homeSource).toContain("px-ui-");
  });

  it("does not reintroduce legacy tokens, hardcoded hex hovers, or dark: variants in any UI-3G file", () => {
    for (const forbiddenPattern of [
      "zinc-",
      "dark:",
      "bg-foreground",
      "text-background",
      "text-foreground",
      "bg-background",
      "hover:bg-[#383838]",
      "dark:hover:bg-[#ccc]",
    ]) {
      expect(allUi3gSource).not.toContain(forbiddenPattern);
    }
  });

  it("preserves the home heading, description, CTA text, and /analyzer destination", () => {
    expect(homeSource).toContain("YouTube Creator OS");
    expect(homeSource).toContain(
      "Discover breakout channels, analyze video outliers, and find content",
    );
    expect(homeSource).toContain("opportunities.");
    expect(homeSource).toContain('href="/analyzer"');
    expect(homeSource).toMatch(/<Link\s[^>]*href="\/analyzer"[^>]*>\s*Get Started\s*<\/Link>/);
    expect(homeSource).toContain('import Link from "next/link"');
  });

  it("does not add client state, API calls, or new navigation to the home page", () => {
    expect(homeSource).not.toContain("useState");
    expect(homeSource).not.toContain("useEffect");
    expect(homeSource).not.toContain("fetch(");
    expect(homeSource).not.toContain('"use client"');

    const linkCount = (homeSource.match(/<Link\s/g) ?? []).length;
    expect(linkCount).toBe(1);
  });

  it("preserves the loading surface's role, aria-live, and exact text with no client-side state", () => {
    expect(loadingSource).toContain('role="status"');
    expect(loadingSource).toContain('aria-live="polite"');
    expect(loadingSource).toContain("Loading page...");
    expect(loadingSource).not.toContain('"use client"');
    expect(loadingSource).not.toContain("useState");
    expect(loadingSource).not.toContain("useEffect");
    expect(loadingSource).not.toContain("setTimeout");
    expect(loadingSource).not.toContain("setInterval");
    expect(loadingSource).not.toContain("fetch(");
  });

  it("keeps the error page a client component with the exact ErrorPageProps contract", () => {
    expect(errorSource).toContain('"use client"');
    expect(errorSource).toContain("interface ErrorPageProps {");
    expect(errorSource).toContain("readonly error: Error & { digest?: string };");
    expect(errorSource).toContain("readonly unstable_retry: () => void;");
    expect(errorSource).toContain("export default function ErrorPage({ unstable_retry }: ErrorPageProps)");
  });

  it("preserves the retry button's type, click handler, and exact copy", () => {
    expect(errorSource).toContain('type="button"');
    expect(errorSource).toContain("onClick={unstable_retry}");
    expect(errorSource).toContain("Something went wrong");
    expect(errorSource).toContain("We could not load this page. Please try again.");
    expect(errorSource).toMatch(/<button\s[^>]*>\s*Try again\s*<\/button>/);

    const buttonCount = (errorSource.match(/<button/g) ?? []).length;
    expect(buttonCount).toBe(1);
  });

  it("does not rename unstable_retry, add logging/telemetry, or add new state/effects to the error page", () => {
    expect(errorSource).not.toContain("useState");
    expect(errorSource).not.toContain("useEffect");
    expect(errorSource).not.toContain("console.error");
    expect(errorSource).not.toContain("console.log");
    expect(errorSource).not.toContain("fetch(");
    expect(errorSource).not.toContain("onRetry");
  });

  it("does not add a database, auth, cloud-sync, or unrelated network behavior anywhere in scope", () => {
    for (const forbiddenPattern of ["supabase", "Supabase", "createClient", "signIn", "signOut", "auth0"]) {
      expect(allUi3gSource).not.toContain(forbiddenPattern);
    }

    expect(allUi3gSource.match(/fetch\(/g)).toBeNull();
  });

  it("keeps responsive wrapping/centering protections in place", () => {
    expect(homeSource).toContain("max-w-xl");
    expect(homeSource).toContain("text-center");
    expect(errorSource).toContain("max-w-xl");
    expect(errorSource).toContain("text-center");
    expect(loadingSource).toContain("items-center");
    expect(loadingSource).toContain("justify-center");
  });
});
