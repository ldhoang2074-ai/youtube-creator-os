import { z } from "zod";

const thumbnailSchema = z.object({
  url: z.string(),
});

const youtubeChannelItemSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    description: z.string().default(""),
    customUrl: z.string().optional(),
    publishedAt: z.string(),
    thumbnails: z
      .object({
        default: thumbnailSchema.optional(),
        medium: thumbnailSchema.optional(),
        high: thumbnailSchema.optional(),
      })
      .optional(),
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
