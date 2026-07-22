import type { VideoAnalysis } from "@/lib/channel-analyzer/types";
import { formatDuration } from "@/lib/format/video";
import { OutlierBadge } from "./OutlierBadge";

interface VideoResultsTableProps {
  readonly videos: readonly VideoAnalysis[];
}

export function VideoResultsTable({ videos }: VideoResultsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-2">Video</th>
            <th className="px-4 py-2">Published</th>
            <th className="px-4 py-2">Duration</th>
            <th className="px-4 py-2">Views</th>
            <th className="px-4 py-2">Likes</th>
            <th className="px-4 py-2">Comments</th>
            <th className="px-4 py-2">Outlier</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((video) => (
            <tr key={video.videoId} className="border-t border-zinc-100 dark:border-zinc-800">
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="h-9 w-16 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-9 w-16 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800" />
                  )}
                  <span className="line-clamp-2">{video.title}</span>
                </div>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                {new Date(video.publishedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-2 whitespace-nowrap">{formatDuration(video.durationSeconds)}</td>
              <td className="px-4 py-2">{video.viewCount ?? "—"}</td>
              <td className="px-4 py-2">{video.likeCount ?? "—"}</td>
              <td className="px-4 py-2">{video.commentCount ?? "—"}</td>
              <td className="px-4 py-2">
                <OutlierBadge level={video.outlierLevel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
