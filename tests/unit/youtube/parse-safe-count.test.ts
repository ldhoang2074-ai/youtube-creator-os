import { describe, expect, it } from "vitest";
import { parseSafeYoutubeCount } from "@/lib/youtube/parse-safe-count";
import { YoutubeError } from "@/lib/youtube/errors";

function captureError(fn: () => unknown): YoutubeError {
  try {
    fn();
  } catch (error) {
    if (error instanceof YoutubeError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected function to throw a YoutubeError");
}

describe("parseSafeYoutubeCount", () => {
  it("parses a valid non-negative integer string", () => {
    expect(parseSafeYoutubeCount("12345")).toBe(12345);
    expect(parseSafeYoutubeCount("0")).toBe(0);
  });

  it("returns null for undefined (field absent/hidden)", () => {
    expect(parseSafeYoutubeCount(undefined)).toBeNull();
  });

  it("throws INVALID_RESPONSE_SCHEMA for a non-numeric string", () => {
    expect(captureError(() => parseSafeYoutubeCount("abc")).code).toBe("INVALID_RESPONSE_SCHEMA");
  });

  it("throws INVALID_RESPONSE_SCHEMA for a negative number string", () => {
    expect(captureError(() => parseSafeYoutubeCount("-5")).code).toBe("INVALID_RESPONSE_SCHEMA");
  });

  it("throws INVALID_RESPONSE_SCHEMA for a decimal string", () => {
    expect(captureError(() => parseSafeYoutubeCount("3.14")).code).toBe("INVALID_RESPONSE_SCHEMA");
  });

  it("throws INVALID_RESPONSE_SCHEMA when the value exceeds Number.MAX_SAFE_INTEGER", () => {
    const tooLarge = "9007199254740992"; // MAX_SAFE_INTEGER + 1
    expect(captureError(() => parseSafeYoutubeCount(tooLarge)).code).toBe("INVALID_RESPONSE_SCHEMA");
  });

  it("accepts a value exactly at Number.MAX_SAFE_INTEGER without precision loss", () => {
    const atLimit = "9007199254740991"; // Number.MAX_SAFE_INTEGER
    expect(parseSafeYoutubeCount(atLimit)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("round-trips a large-but-safe value with no silent precision loss", () => {
    expect(parseSafeYoutubeCount("123456789012345")).toBe(123456789012345);
  });
});
