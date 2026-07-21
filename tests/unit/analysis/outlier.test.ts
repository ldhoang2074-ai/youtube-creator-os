import { describe, expect, it } from "vitest";
import { classifyOutlier } from "@/lib/analysis/outlier";

describe("classifyOutlier", () => {
  it("returns insufficient-data when medianViews is null", () => {
    expect(classifyOutlier(1000, null)).toEqual({ ratio: null, level: "insufficient-data" });
  });

  it("returns insufficient-data when medianViews is zero", () => {
    expect(classifyOutlier(1000, 0)).toEqual({ ratio: null, level: "insufficient-data" });
  });

  it("computes the ratio correctly", () => {
    expect(classifyOutlier(3000, 1000).ratio).toBe(3);
  });

  it("classifies as normal when ratio < 2", () => {
    const result = classifyOutlier(1500, 1000);
    expect(result.ratio).toBe(1.5);
    expect(result.level).toBe("normal");
  });

  it("classifies as outlier at the ratio = 2 boundary", () => {
    const result = classifyOutlier(2000, 1000);
    expect(result.ratio).toBe(2);
    expect(result.level).toBe("outlier");
  });

  it("classifies as outlier when 2 <= ratio < 4", () => {
    const result = classifyOutlier(3990, 1000);
    expect(result.ratio).toBe(3.99);
    expect(result.level).toBe("outlier");
  });

  it("classifies as strong-outlier at the ratio = 4 boundary", () => {
    const result = classifyOutlier(4000, 1000);
    expect(result.ratio).toBe(4);
    expect(result.level).toBe("strong-outlier");
  });

  it("classifies as strong-outlier when ratio > 4", () => {
    const result = classifyOutlier(10000, 1000);
    expect(result.ratio).toBe(10);
    expect(result.level).toBe("strong-outlier");
  });
});
