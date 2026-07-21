import type { OpportunityFeedItem } from "@/lib/channel-analyzer/types";

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const segments = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

  return segments
    .map((segment, index) => (index === 0 ? String(segment) : String(segment).padStart(2, "0")))
    .join(":");
}

function formatMultiplier(ratio: number): string {
  return `${ratio.toFixed(1)}×`;
}

const LEVEL_LABELS: Record<OpportunityFeedItem["outlierLevel"], string> = {
  outlier: "Outlier",
  "strong-outlier": "Strong outlier",
};

function buildYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

interface OpportunityFeedTableProps {
  readonly items: readonly OpportunityFeedItem[];
  readonly showThumbnails?: boolean;
}

export function OpportunityFeedTable({ items, showThumbnails = true }: OpportunityFeedTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-2">Video</th>
            <th className="px-4 py-2">Channel</th>
            <th className="px-4 py-2">Published</th>
            <th className="px-4 py-2">Duration</th>
            <th className="px-4 py-2">Views</th>
            <th className="px-4 py-2">Channel median views</th>
            <th className="px-4 py-2">Outlier multiplier</th>
            <th className="px-4 py-2">Level</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const watchUrl = buildYoutubeWatchUrl(item.videoId);
            return (
              <tr key={item.videoId} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2">
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${item.title} on YouTube`}
                    className="flex items-center gap-2"
                  >
                    {showThumbnails ? (
                      item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="h-9 w-16 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-9 w-16 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800" />
                      )
                    ) : null}
                    <span className="line-clamp-2 text-zinc-950 underline-offset-2 hover:underline dark:text-zinc-50">
                      {item.title}
                    </span>
                  </a>
                </td>
                <td className="px-4 py-2">{item.channelTitle}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(item.publishedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{formatDuration(item.durationSeconds)}</td>
                <td className="px-4 py-2">{item.viewCount}</td>
                <td className="px-4 py-2">{item.channelMedianViews}</td>
                <td className="px-4 py-2">{formatMultiplier(item.outlierRatio)}</td>
                <td className="px-4 py-2">{LEVEL_LABELS[item.outlierLevel]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
