import { describe, expect, it } from "vitest";
import { parseChannelQuery } from "@/lib/opportunities/parse-channel-query";

describe("parseChannelQuery", () => {
  it("returns an empty array for undefined", () => {
    expect(parseChannelQuery(undefined)).toEqual([]);
  });

  it("trims a single string value", () => {
    expect(parseChannelQuery("  @channel1  ")).toEqual(["@channel1"]);
  });

  it("keeps the order of a string array", () => {
    expect(parseChannelQuery(["@b", "@a", "@c"])).toEqual(["@b", "@a", "@c"]);
  });

  it("drops whitespace-only entries", () => {
    expect(parseChannelQuery(["@a", "   ", "@b"])).toEqual(["@a", "@b"]);
  });

  it("keeps at most 5 channels", () => {
    const result = parseChannelQuery(["1", "2", "3", "4", "5", "6"]);
    expect(result).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("does not deduplicate repeated values", () => {
    expect(parseChannelQuery(["@a", "@a"])).toEqual(["@a", "@a"]);
  });

  it("does not throw for undefined, a plain string, or an array", () => {
    expect(() => parseChannelQuery(undefined)).not.toThrow();
    expect(() => parseChannelQuery("@a")).not.toThrow();
    expect(() => parseChannelQuery(["@a", "@b"])).not.toThrow();
    expect(() => parseChannelQuery([])).not.toThrow();
  });
});
