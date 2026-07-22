import type {
  CompareChannelsResult,
  OpportunityChannelSummary,
} from "./types";

/**
 * Keeps successful channel summaries in CompareChannelsResult order, which
 * matches the normalized submitted input order with failures omitted.
 */
export function buildOpportunityChannelSummaries(
  compareResult: CompareChannelsResult,
): readonly OpportunityChannelSummary[] {
  const channels: OpportunityChannelSummary[] = [];

  for (const entry of compareResult.results) {
    if (entry.status !== "success") {
      continue;
    }

    const { report } = entry;
    channels.push({
      channelId: report.channelId,
      title: report.title,
      thumbnailUrl: report.thumbnailUrl,
      subscriberCount: report.subscriberCount,
      totalViewCount: report.totalViewCount,
      videoCount: report.videoCount,
      medianViews: report.medianViews,
      analyzedVideoCount: report.analyzedVideoCount,
      outlierRate: report.outlierRate,
    });
  }

  return channels;
}
