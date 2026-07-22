import type { VideoAnalysis } from "@/lib/channel-analyzer/types";
import { buildYoutubeWatchUrl, formatDuration } from "@/lib/format/video";
import { OutlierBadge } from "./OutlierBadge";

interface VideoCardProps {
  readonly video: VideoAnalysis;
}

export function VideoCard({ video }: VideoCardProps) {
  return (
    <article className="h-full overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <a
        href={buildYoutubeWatchUrl(video.videoId)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${video.title} on YouTube`}
        className="group flex h-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
      >
        <div className="aspect-video w-full shrink-0 overflow-hidden bg-zinc-200 dark:bg-zinc-800">
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt=""
              width={320}
              height={180}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div aria-hidden="true" className="h-full w-full bg-zinc-200 dark:bg-zinc-800" />
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 text-sm font-semibold text-zinc-950 group-hover:underline dark:text-zinc-50">
            {video.title}
          </h3>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Published
              </dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                {new Date(video.publishedAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Duration
              </dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                {formatDuration(video.durationSeconds)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Views
              </dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{video.viewCount ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Likes
              </dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{video.likeCount ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Comments
              </dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{video.commentCount ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Outlier
              </dt>
              <dd className="mt-1">
                <OutlierBadge level={video.outlierLevel} />
              </dd>
            </div>
          </dl>
        </div>
      </a>
    </article>
  );
}
