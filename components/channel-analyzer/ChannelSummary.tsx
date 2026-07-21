import type { ChannelAnalysisReport } from "@/lib/channel-analyzer/types";

interface ChannelSummaryProps {
  readonly report: Pick<
    ChannelAnalysisReport,
    | "title"
    | "thumbnailUrl"
    | "subscriberCount"
    | "totalViewCount"
    | "videoCount"
    | "medianViews"
    | "analyzedVideoCount"
  >;
}

export function ChannelSummary({ report }: ChannelSummaryProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center">
      {report.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={report.thumbnailUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      )}
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{report.title}</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-5">
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-500">Subscribers</dt>
            <dd>{report.subscriberCount}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-500">Total views</dt>
            <dd>{report.totalViewCount}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-500">Video count</dt>
            <dd>{report.videoCount}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-500">Median views</dt>
            <dd>{report.medianViews ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-500">Analyzed videos</dt>
            <dd>{report.analyzedVideoCount}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
