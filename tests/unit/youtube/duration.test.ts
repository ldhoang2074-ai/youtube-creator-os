import { describe, expect, it } from "vitest";
import { parseYoutubeDuration } from "@/lib/youtube/duration";
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

describe("parseYoutubeDuration", () => {
  it("parses PT0S as 0 seconds", () => {
    expect(parseYoutubeDuration("PT0S")).toBe(0);
  });

  it("parses PT4M13S as 253 seconds", () => {
    expect(parseYoutubeDuration("PT4M13S")).toBe(4 * 60 + 13);
  });

  it("parses PT1H2M3S as 3723 seconds", () => {
    expect(parseYoutubeDuration("PT1H2M3S")).toBe(3600 + 2 * 60 + 3);
  });

  it("parses P1DT2H3M4S as 93784 seconds", () => {
    expect(parseYoutubeDuration("P1DT2H3M4S")).toBe(86400 + 2 * 3600 + 3 * 60 + 4);
  });

  it("throws INVALID_RESPONSE_SCHEMA for a non-duration string", () => {
    expect(captureError(() => parseYoutubeDuration("not-a-duration")).code).toBe(
      "INVALID_RESPONSE_SCHEMA",
    );
  });

  it("throws INVALID_RESPONSE_SCHEMA for a duration with an unsupported unit", () => {
    expect(captureError(() => parseYoutubeDuration("PT4X13S")).code).toBe(
      "INVALID_RESPONSE_SCHEMA",
    );
  });

  it("throws instead of returning NaN or silently returning 0 for an empty string", () => {
    // captureError already asserts a YoutubeError is thrown (not a NaN/0 return value).
    expect(captureError(() => parseYoutubeDuration("")).code).toBe("INVALID_RESPONSE_SCHEMA");
  });
});
