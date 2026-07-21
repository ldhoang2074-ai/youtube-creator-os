export const YOUTUBE_QUOTA_COSTS = Object.freeze({
  channelsList: 1,
  playlistItemsList: 1,
  videosList: 1,
  searchList: 100,
} as const);

export type YoutubeOperation = keyof typeof YOUTUBE_QUOTA_COSTS;

/**
 * Tracks quota units spent within a single logical operation (e.g. one
 * resolveChannel call). This is in-memory only and is not a daily or
 * cross-request budget.
 */
export class QuotaTracker {
  private totalUnits = 0;
  private readonly calls: YoutubeOperation[] = [];

  record(operation: YoutubeOperation): void {
    this.totalUnits += YOUTUBE_QUOTA_COSTS[operation];
    this.calls.push(operation);
  }

  getTotalUnits(): number {
    return this.totalUnits;
  }

  getCallCount(): number {
    return this.calls.length;
  }
}
