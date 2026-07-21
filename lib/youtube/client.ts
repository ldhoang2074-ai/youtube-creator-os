import { YoutubeError } from "./errors";
import { youtubeApiGet, type YoutubeRequestOptions } from "./request";
import { youtubeChannelsListResponseSchema, type YoutubeChannelItem } from "./schemas";

export interface FetchChannelParams {
  readonly channelId?: string;
  readonly handle?: string;
}

export type YoutubeClientOptions = YoutubeRequestOptions;

export async function fetchChannel(
  params: FetchChannelParams,
  options: YoutubeClientOptions = {},
): Promise<YoutubeChannelItem | null> {
  const searchParams: Record<string, string> = {
    part: "snippet,statistics,contentDetails",
  };

  if (params.channelId) {
    searchParams.id = params.channelId;
  } else if (params.handle) {
    searchParams.forHandle = params.handle;
  } else {
    throw new YoutubeError("INVALID_INPUT", "Either channelId or handle must be provided");
  }

  const response = await youtubeApiGet(
    "/channels",
    searchParams,
    youtubeChannelsListResponseSchema,
    options,
  );

  return response.items[0] ?? null;
}
