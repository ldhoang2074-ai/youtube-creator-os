import { z } from "zod";

const thumbnailSchema = z.object({
  url: z.string(),
});

const youtubeThumbnailsSchema = z
  .object({
    default: thumbnailSchema.optional(),
    medium: thumbnailSchema.optional(),
    high: thumbnailSchema.optional(),
    standard: thumbnailSchema.optional(),
    maxres: thumbnailSchema.optional(),
  })
  .optional();

export type YoutubeThumbnails = z.infer<typeof youtubeThumbnailsSchema>;

const youtubeChannelItemSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    description: z.string().default(""),
    customUrl: z.string().optional(),
    publishedAt: z.string(),
    thumbnails: youtubeThumbnailsSchema,
  }),
  statistics: z.object({
    subscriberCount: z.string().optional(),
    viewCount: z.string().optional(),
    videoCount: z.string().optional(),
    hiddenSubscriberCount: z.boolean().optional(),
  }),
  contentDetails: z.object({
    relatedPlaylists: z.object({
      uploads: z.string(),
    }),
  }),
});

export const youtubeChannelsListResponseSchema = z.object({
  items: z.array(youtubeChannelItemSchema),
});

export type YoutubeChannelItem = z.infer<typeof youtubeChannelItemSchema>;
export type YoutubeChannelsListResponse = z.infer<typeof youtubeChannelsListResponseSchema>;

export const googleApiErrorSchema = z.object({
  error: z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    errors: z
      .array(
        z.object({
          reason: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

const youtubePlaylistItemSchema = z.object({
  contentDetails: z
    .object({
      videoId: z.string().optional(),
    })
    .optional(),
});

export const youtubePlaylistItemsResponseSchema = z.object({
  items: z.array(youtubePlaylistItemSchema),
});

export type YoutubePlaylistItem = z.infer<typeof youtubePlaylistItemSchema>;

const youtubeVideoItemSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    publishedAt: z.string(),
    thumbnails: youtubeThumbnailsSchema,
  }),
  contentDetails: z.object({
    duration: z.string(),
  }),
  statistics: z.object({
    viewCount: z.string().optional(),
    likeCount: z.string().optional(),
    commentCount: z.string().optional(),
  }),
});

export const youtubeVideosListResponseSchema = z.object({
  items: z.array(youtubeVideoItemSchema),
});

export type YoutubeVideoItem = z.infer<typeof youtubeVideoItemSchema>;
