import type { YoutubeThumbnails } from "./schemas";

const THUMBNAIL_PRIORITY = ["maxres", "standard", "high", "medium", "default"] as const;

export function pickBestThumbnailUrl(thumbnails: YoutubeThumbnails | undefined): string | null {
  if (!thumbnails) {
    return null;
  }

  for (const size of THUMBNAIL_PRIORITY) {
    const thumbnail = thumbnails[size];
    if (thumbnail) {
      return thumbnail.url;
    }
  }

  return null;
}
