import { describe, expect, it } from "vitest";
import { calculateOutlierRate } from "@/lib/channel-analyzer/outlier-rate";
import type { OutlierLevel } from "@/lib/analysis/outlier";
import type { VideoAnalysis } from "@/lib/channel-analyzer/types";

function makeVideo(outlierLevel: OutlierLevel, id = "vid"): VideoAnalysis {
  return {
    videoId: id,
    title: `Title ${id}`,
    publishedAt: "2021-01-01T00:00:00Z",
    thumbnailUrl: null,
    durationSeconds: 60,
    viewCount: 100,
    likeCount: null,
    commentCount: null,
    outlierRatio: null,
    outlierLevel,
  };
}

describe("calculateOutlierRate", () => {
  it("computes the correct rate", () => {
    const videos = [
      makeVideo("normal", "1"),
      makeVideo("outlier", "2"),
      makeVideo("strong-outlier", "3"),
      makeVideo("normal", "4"),
    ];

    // 2 outlier-ish out of 4 counted videos
    expect(calculateOutlierRate(videos)).toBe(0.5);
  });

  it("returns 0 when there is data but no outlier videos", () => {
    const videos = [makeVideo("normal", "1"), makeVideo("normal", "2")];

    expect(calculateOutlierRate(videos)).toBe(0);
  });

  it("returns null when the denominator is zero (no videos at all)", () => {
    expect(calculateOutlierRate([])).toBeNull();
  });

  it("returns null when every video is insufficient-data", () => {
    const videos = [makeVideo("insufficient-data", "1"), makeVideo("insufficient-data", "2")];

    expect(calculateOutlierRate(videos)).toBeNull();
  });

  it("excludes insufficient-data videos from both numerator and denominator", () => {
    const videos = [
      makeVideo("insufficient-data", "1"),
      makeVideo("insufficient-data", "2"),
      makeVideo("outlier", "3"),
      makeVideo("normal", "4"),
    ];

    // Only 2 counted videos (outlier + normal), 1 of them is outlier-ish
    expect(calculateOutlierRate(videos)).toBe(0.5);
  });

  it("never returns NaN or Infinity", () => {
    const rate = calculateOutlierRate([makeVideo("insufficient-data", "1")]);
    expect(rate).not.toBeNaN();
    expect(rate).not.toBe(Infinity);
    expect(rate).toBeNull();
  });
});
