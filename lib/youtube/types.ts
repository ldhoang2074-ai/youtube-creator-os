export type ChannelInputKind = "channelId" | "handle";

export interface ParsedChannelInput {
  readonly kind: ChannelInputKind;
  readonly value: string;
}

/**
 * subscriberCount/viewCount/videoCount are kept as strings because the
 * YouTube Data API returns them as strings and values can exceed
 * Number.MAX_SAFE_INTEGER for very large channels; converting with
 * Number()/parseInt() here would silently lose precision.
 */
export interface ResolvedChannel {
  readonly channelId: string;
  readonly title: string;
  readonly description: string;
  readonly customUrl: string | null;
  readonly publishedAt: string;
  readonly thumbnailUrl: string | null;
  readonly subscriberCount: string;
  readonly viewCount: string;
  readonly videoCount: string;
  readonly uploadsPlaylistId: string;
}
