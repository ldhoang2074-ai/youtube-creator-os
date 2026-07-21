import { describe, expect, it } from "vitest";
import { median } from "@/lib/analysis/median";

describe("median", () => {
  it("returns null for an empty array", () => {
    expect(median([])).toBeNull();
  });

  it("returns the value itself for a single-element array", () => {
    expect(median([42])).toBe(42);
  });

  it("returns the middle value for an odd-length array", () => {
    expect(median([1, 3, 2])).toBe(2);
  });

  it("returns the average of the two middle values for an even-length array", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("does not mutate the input array", () => {
    const input = [5, 3, 1, 4, 2];
    const inputCopy = [...input];

    median(input);

    expect(input).toEqual(inputCopy);
  });

  it("returns the correct result for an unsorted array", () => {
    expect(median([9, 1, 8, 2, 7])).toBe(7);
  });
});
