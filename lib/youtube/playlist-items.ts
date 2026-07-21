import { youtubeApiGet, type YoutubeRequestOptions } from "./request";
import { youtubePlaylistItemsResponseSchema } from "./schemas";

/**
 * Fetches up to `maxResults` video IDs from a channel's uploads playlist,
 * in the order YouTube returns them (newest first). Items missing a
 * videoId are dropped, and duplicate IDs are collapsed keeping only the
 * first occurrence, before this list is ever used downstream.
 */
export async function fetchUploadsPlaylistVideoIds(
  playlistId: string,
  maxResults: number,
  options: YoutubeRequestOptions = {},
): Promise<string[]> {
  const response = await youtubeApiGet(
    "/playlistItems",
    {
      part: "contentDetails",
      playlistId,
      maxResults: String(maxResults),
    },
    youtubePlaylistItemsResponseSchema,
    options,
  );

  const seen = new Set<string>();
  const orderedIds: string[] = [];

  for (const item of response.items) {
    const videoId = item.contentDetails?.videoId;
    if (!videoId || seen.has(videoId)) {
      continue;
    }
    seen.add(videoId);
    orderedIds.push(videoId);
  }

  return orderedIds;
}
