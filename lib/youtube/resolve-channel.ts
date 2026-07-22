import { fetchChannel, type YoutubeClientOptions } from "./client";
import { YoutubeError } from "./errors";
import { parseChannelInput } from "./parse-channel-input";
import type { YoutubeChannelItem } from "./schemas";
import { pickBestThumbnailUrl } from "./thumbnail";
import type { ResolvedChannel } from "./types";

export type ResolveChannelOptions = YoutubeClientOptions;

export async function resolveChannel(
  input: string,
  options: ResolveChannelOptions = {},
): Promise<ResolvedChannel> {
  const parsedInput = parseChannelInput(input);

  const item = await fetchChannel(
    parsedInput.kind === "channelId"
      ? { channelId: parsedInput.value }
      : { handle: parsedInput.value },
    options,
  );

  if (!item) {
    throw new YoutubeError("CHANNEL_NOT_FOUND", `No channel found for input: ${input}`);
  }

  return mapToResolvedChannel(item);
}

function mapToResolvedChannel(item: YoutubeChannelItem): ResolvedChannel {
  return {
    channelId: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    customUrl: item.snippet.customUrl ?? null,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl: pickBestThumbnailUrl(item.snippet.thumbnails),
    subscriberCount: item.statistics.subscriberCount ?? "0",
    viewCount: item.statistics.viewCount ?? "0",
    videoCount: item.statistics.videoCount ?? "0",
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
  };
}
