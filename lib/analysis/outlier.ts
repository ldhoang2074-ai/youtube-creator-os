export type OutlierLevel = "insufficient-data" | "normal" | "outlier" | "strong-outlier";

export interface OutlierResult {
  readonly ratio: number | null;
  readonly level: OutlierLevel;
}

export function classifyOutlier(viewCount: number, medianViews: number | null): OutlierResult {
  if (medianViews === null || medianViews <= 0) {
    return { ratio: null, level: "insufficient-data" };
  }

  const ratio = viewCount / medianViews;

  if (ratio >= 4) {
    return { ratio, level: "strong-outlier" };
  }

  if (ratio >= 2) {
    return { ratio, level: "outlier" };
  }

  return { ratio, level: "normal" };
}
