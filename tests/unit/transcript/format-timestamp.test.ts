import { describe, expect, it } from "vitest";

import { formatTranscriptTimestamp } from "@/lib/transcript/format-timestamp";

describe("formatTranscriptTimestamp", () => {
  it.each([
    [0, "0:00"],
    [1, "0:01"],
    [1.99, "0:01"],
    [59.99, "0:59"],
    [60, "1:00"],
    [61, "1:01"],
    [3_599.99, "59:59"],
    [3_600, "1:00:00"],
    [3_661.9, "1:01:01"],
    [36_000, "10:00:00"],
  ])("formats %s seconds as %s", (seconds, expected) => {
    expect(formatTranscriptTimestamp(seconds)).toBe(expected);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects invalid seconds value %s",
    (seconds) => {
      expect(() => formatTranscriptTimestamp(seconds)).toThrow(RangeError);
    },
  );
});
