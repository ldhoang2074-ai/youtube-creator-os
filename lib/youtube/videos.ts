import { youtubeApiGet, type YoutubeRequestOptions } from "./request";
import { youtubeVideosListResponseSchema, type YoutubeVideoItem } from "./schemas";

/**
 * Fetches metadata + statistics for up to 50 video IDs in a single
 * videos.list call. Returns [] without making any network call when
 * videoIds is empty. The returned array's order/completeness/uniqueness
 * relative to `videoIds` is NOT guaranteed by this function — callers must
 * reconcile by videoId (see lib/channel-analyzer/analyze-channel.ts).
 */
export async function fetchVideos(
  videoIds: readonly string[],
  options: YoutubeRequestOptions = {},
): Promise<YoutubeVideoItem[]> {
  if (videoIds.length === 0) {
    return [];
  }

  const response = await youtubeApiGet(
    "/videos",
    {
      part: "snippet,contentDetails,statistics",
      id: videoIds.join(","),
    },
    youtubeVideosListResponseSchema,
    options,
  );

  return response.items;
}
