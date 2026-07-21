import type { VideoAnalysis } from "./types";

/**
 * Recent-video outlier rate = (outlier + strong-outlier) / (normal + outlier
 * + strong-outlier). insufficient-data videos are excluded from both the
 * numerator and the denominator. Returns null (not 0/NaN) when there is no
 * video with enough data to count — an empty denominator must never be
 * divided.
 */
export function calculateOutlierRate(videos: readonly VideoAnalysis[]): number | null {
  let outlierCount = 0;
  let countedTotal = 0;

  for (const video of videos) {
    if (video.outlierLevel === "insufficient-data") {
      continue;
    }

    countedTotal += 1;
    if (video.outlierLevel === "outlier" || video.outlierLevel === "strong-outlier") {
      outlierCount += 1;
    }
  }

  if (countedTotal === 0) {
    return null;
  }

  return outlierCount / countedTotal;
}
