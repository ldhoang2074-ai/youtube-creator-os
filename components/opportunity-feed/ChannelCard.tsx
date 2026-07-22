import type { OpportunityChannelSummary } from "@/lib/channel-analyzer/types";

interface ChannelCardProps {
  readonly channel: OpportunityChannelSummary;
  readonly onViewDetails?: (channel: OpportunityChannelSummary) => void;
}

function formatOutlierRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export function ChannelCard({ channel, onViewDetails }: ChannelCardProps) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        {channel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.thumbnailUrl}
            alt=""
            width={80}
            height={80}
            loading="lazy"
            decoding="async"
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-20 w-20 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800"
          />
        )}
        <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{channel.title}</h3>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Subscribers
          </dt>
          <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{channel.subscriberCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Total views
          </dt>
          <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{channel.totalViewCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Video count
          </dt>
          <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{channel.videoCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Median views
          </dt>
          <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{channel.medianViews ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Analyzed videos
          </dt>
          <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{channel.analyzedVideoCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Recent-video outlier rate
          </dt>
          <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
            {formatOutlierRate(channel.outlierRate)}
          </dd>
        </div>
      </dl>

      {onViewDetails ? (
        <div>
          <button
            type="button"
            aria-label={`View channel details for ${channel.title}`}
            onClick={() => onViewDetails(channel)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          >
            View channel details
          </button>
        </div>
      ) : null}
    </article>
  );
}
