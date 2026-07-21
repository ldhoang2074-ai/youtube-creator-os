import type {
  CompareChannelsResult,
  OpportunityFeedFailure,
  OpportunityFeedItem,
  OpportunityFeedResult,
  VideoAnalysis,
} from "./types";

/**
 * Validates a video against every runtime invariant the feed relies on and,
 * if it passes, returns a fully-typed OpportunityFeedItem. Returns null
 * otherwise. Never re-computes outlierRatio — only reads the value G1B
 * already produced. Narrowing happens via real runtime checks (not type
 * assertions), so a video can only reach the returned object once every
 * field has been proven safe.
 */
function toFeedItem(
  video: VideoAnalysis,
  channelId: string,
  channelTitle: string,
  channelMedianViews: number | null,
): OpportunityFeedItem | null {
  if (video.outlierLevel !== "outlier" && video.outlierLevel !== "strong-outlier") {
    return null;
  }
  if (video.videoId.trim().length === 0) {
    return null;
  }

  const { viewCount, outlierRatio } = video;

  if (viewCount === null || !Number.isFinite(viewCount)) {
    return null;
  }
  if (channelMedianViews === null || !Number.isFinite(channelMedianViews) || channelMedianViews <= 0) {
    return null;
  }
  if (outlierRatio === null || !Number.isFinite(outlierRatio) || outlierRatio < 2) {
    return null;
  }
  if (!Number.isFinite(video.durationSeconds) || video.durationSeconds < 0) {
    return null;
  }
  if (!Number.isFinite(Date.parse(video.publishedAt))) {
    return null;
  }

  return {
    videoId: video.videoId,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl,
    publishedAt: video.publishedAt,
    durationSeconds: video.durationSeconds,
    viewCount,
    channelId,
    channelTitle,
    channelMedianViews,
    outlierRatio,
    outlierLevel: video.outlierLevel,
  };
}

function compareItems(a: OpportunityFeedItem, b: OpportunityFeedItem): number {
  if (a.outlierRatio !== b.outlierRatio) {
    return b.outlierRatio - a.outlierRatio;
  }

  const publishedDiff = Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  if (publishedDiff !== 0) {
    return publishedDiff;
  }

  if (a.videoId < b.videoId) return -1;
  if (a.videoId > b.videoId) return 1;
  return 0;
}

/**
 * Pure aggregation over an already-computed CompareChannelsResult: no
 * network calls, no environment access, no mutation of the input. Filters
 * each channel's videos down to ones that reached at least 2x that
 * channel's own recent median, deduplicates by videoId (keeping the first
 * occurrence found while walking results/videos in order), and sorts the
 * remaining items deterministically.
 */
export function buildOpportunityFeed(compareResult: CompareChannelsResult): OpportunityFeedResult {
  const items: OpportunityFeedItem[] = [];
  const failures: OpportunityFeedFailure[] = [];
  const seenVideoIds = new Set<string>();

  for (const entry of compareResult.results) {
    if (entry.status === "success") {
      const { report } = entry;
      for (const video of report.videos) {
        const feedItem = toFeedItem(video, report.channelId, report.title, report.medianViews);
        if (feedItem === null || seenVideoIds.has(feedItem.videoId)) {
          continue;
        }
        seenVideoIds.add(feedItem.videoId);
        items.push(feedItem);
      }
    } else {
      failures.push({ input: entry.input, error: entry.error });
    }
  }

  return {
    items: [...items].sort(compareItems),
    failures,
  };
}
