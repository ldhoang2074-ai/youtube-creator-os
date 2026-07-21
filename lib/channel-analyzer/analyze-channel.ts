import { median } from "../analysis/median";
import { classifyOutlier } from "../analysis/outlier";
import { parseYoutubeDuration } from "../youtube/duration";
import { parseSafeYoutubeCount } from "../youtube/parse-safe-count";
import { fetchUploadsPlaylistVideoIds } from "../youtube/playlist-items";
import type { YoutubeRequestOptions } from "../youtube/request";
import { resolveChannel } from "../youtube/resolve-channel";
import type { YoutubeVideoItem } from "../youtube/schemas";
import { pickBestThumbnailUrl } from "../youtube/thumbnail";
import { fetchVideos } from "../youtube/videos";
import type { ChannelAnalysisReport, VideoAnalysis } from "./types";

const MAX_VIDEOS = 25;

export type AnalyzeChannelOptions = YoutubeRequestOptions;

export async function analyzeChannel(
  input: string,
  options: AnalyzeChannelOptions = {},
): Promise<ChannelAnalysisReport> {
  const channel = await resolveChannel(input, options);
  const orderedIds = await fetchUploadsPlaylistVideoIds(channel.uploadsPlaylistId, MAX_VIDEOS, options);

  if (orderedIds.length === 0) {
    return {
      channelId: channel.channelId,
      title: channel.title,
      thumbnailUrl: channel.thumbnailUrl,
      subscriberCount: channel.subscriberCount,
      totalViewCount: channel.viewCount,
      videoCount: channel.videoCount,
      medianViews: null,
      analyzedVideoCount: 0,
      videos: [],
    };
  }

  const videoItems = await fetchVideos(orderedIds, options);
  const videoById = new Map(videoItems.map((item) => [item.id, item]));

  // videos.list gives no guarantee of order, completeness, or uniqueness
  // relative to orderedIds — reconcile explicitly by id, then re-order by
  // the uploads-playlist order. Missing videos (deleted/private) are
  // silently dropped, never fabricated.
  const orderedVideoItems = orderedIds
    .map((id) => videoById.get(id))
    .filter((item): item is YoutubeVideoItem => item !== undefined);

  const parsedViewCounts = orderedVideoItems.map((item) =>
    parseSafeYoutubeCount(item.statistics.viewCount),
  );

  const validViewCounts = parsedViewCounts.filter((count): count is number => count !== null);
  const medianViews = median(validViewCounts);

  const videos: VideoAnalysis[] = orderedVideoItems.map((item, index) => {
    const viewCount = parsedViewCounts[index];
    const { ratio, level } =
      viewCount === null
        ? { ratio: null, level: "insufficient-data" as const }
        : classifyOutlier(viewCount, medianViews);

    return {
      videoId: item.id,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: pickBestThumbnailUrl(item.snippet.thumbnails),
      durationSeconds: parseYoutubeDuration(item.contentDetails.duration),
      viewCount,
      likeCount: parseSafeYoutubeCount(item.statistics.likeCount),
      commentCount: parseSafeYoutubeCount(item.statistics.commentCount),
      outlierRatio: ratio,
      outlierLevel: level,
    };
  });

  return {
    channelId: channel.channelId,
    title: channel.title,
    thumbnailUrl: channel.thumbnailUrl,
    subscriberCount: channel.subscriberCount,
    totalViewCount: channel.viewCount,
    videoCount: channel.videoCount,
    medianViews,
    // Only videos with a usable (non-null) viewCount were actually used in
    // the median/outlier calculation.
    analyzedVideoCount: validViewCounts.length,
    videos,
  };
}
