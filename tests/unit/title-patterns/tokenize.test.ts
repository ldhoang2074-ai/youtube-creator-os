import { describe, expect, it } from "vitest";
import { containsQuestionMark, tokenizeTitle } from "@/lib/title-patterns/tokenize";

function normalizedOf(title: string): string[] {
  return tokenizeTitle(title).map((token) => token.normalized);
}

describe("tokenizeTitle", () => {
  it("returns an empty array for an empty string", () => {
    expect(tokenizeTitle("")).toEqual([]);
  });

  it("returns an empty array for whitespace-only input", () => {
    expect(tokenizeTitle("   \t  ")).toEqual([]);
  });

  it("applies NFKC normalization (composes a decomposed accented character)", () => {
    // "e" + combining acute accent (U+0301) should compose to "é" under NFKC.
    expect(normalizedOf("café")).toEqual(["café"]);
  });

  it("lowercases with toLowerCase semantics, not locale-dependent casing", () => {
    // Under a Turkish locale, "I".toLocaleLowerCase("tr") would produce a
    // dotless "ı" instead of "i". toLowerCase() always yields "i" regardless
    // of runtime locale, which is what this asserts.
    expect(normalizedOf("I")).toEqual(["i"]);
  });

  it("keeps Spanish accents (está does not become esta)", () => {
    expect(normalizedOf("Está")).toEqual(["está"]);
  });

  it("keeps the tilde-n in Spanish words (niño keeps ñ)", () => {
    expect(normalizedOf("Niño")).toEqual(["niño"]);
  });

  it("strips punctuation", () => {
    expect(normalizedOf("Hello, World!")).toEqual(["hello", "world"]);
  });

  it("does not create a token from emoji", () => {
    expect(normalizedOf("Hello 😀 World")).toEqual(["hello", "world"]);
  });

  it("does not create a token from a ZWJ emoji sequence", () => {
    expect(normalizedOf("Family 👨‍👩‍👧 Day")).toEqual(["family", "day"]);
  });

  it("does not create a token from a variation selector", () => {
    expect(normalizedOf("I ❤️ You")).toEqual(["i", "you"]);
  });

  it("keeps a contraction intact", () => {
    expect(normalizedOf("don't")).toEqual(["don't"]);
  });

  it("strips a trailing straight-apostrophe possessive", () => {
    expect(normalizedOf("mario's")).toEqual(["mario"]);
  });

  it("strips a trailing curly-apostrophe possessive", () => {
    expect(normalizedOf("Mario’s")).toEqual(["mario"]);
  });

  it("keeps a hyphenated word intact", () => {
    expect(normalizedOf("spider-man")).toEqual(["spider-man"]);
  });

  it("strips an http:// URL", () => {
    expect(normalizedOf("Check http://example.com now")).toEqual(["check", "now"]);
  });

  it("strips an https:// URL", () => {
    expect(normalizedOf("Check https://example.com now")).toEqual(["check", "now"]);
  });

  it("strips a www. URL", () => {
    expect(normalizedOf("Visit www.example.com today")).toEqual(["visit", "today"]);
  });

  it("recognizes a Unicode decimal digit as numeric", () => {
    const tokens = tokenizeTitle("٣"); // Arabic-indic digit three
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.isNumeric).toBe(true);
  });

  it("recognizes an ASCII digit as numeric", () => {
    const tokens = tokenizeTitle("5");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.isNumeric).toBe(true);
  });

  it("does not throw and returns no tokens for a title of only punctuation/emoji", () => {
    expect(() => tokenizeTitle("!!! 😀😀 ...")).not.toThrow();
    expect(tokenizeTitle("!!! 😀😀 ...")).toEqual([]);
  });
});

describe("containsQuestionMark", () => {
  it("recognizes a half-width question mark", () => {
    expect(containsQuestionMark("What?")).toBe(true);
  });

  it("recognizes an inverted Spanish question mark", () => {
    expect(containsQuestionMark("¿Qué?")).toBe(true);
  });

  it("recognizes a full-width question mark", () => {
    expect(containsQuestionMark("Wait？")).toBe(true);
  });

  it("recognizes a question mark that appears before an emoji", () => {
    expect(containsQuestionMark("Really?😱")).toBe(true);
  });

  it("returns false when no question-mark character is present", () => {
    expect(containsQuestionMark("No question here.")).toBe(false);
  });
});
