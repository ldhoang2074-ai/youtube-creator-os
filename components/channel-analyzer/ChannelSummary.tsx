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
    <section className="flex flex-col gap-ui-5 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 sm:p-ui-6">
      <div className="flex min-w-0 flex-col gap-ui-4 sm:flex-row sm:items-center">
      {report.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={report.thumbnailUrl}
          alt=""
          className="size-16 shrink-0 rounded-full border border-ui-border object-cover"
        />
      ) : (
        <div className="size-16 shrink-0 rounded-full border border-ui-border bg-ui-surface-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-ui-label font-semibold uppercase tracking-[0.14em] text-ui-text-muted">
          Channel analysis
        </p>
        <h2 className="mt-ui-1 break-words text-ui-section font-semibold tracking-tight text-ui-text sm:text-ui-page">
          {report.title}
        </h2>
      </div>
      </div>
      <dl className="grid grid-cols-2 gap-ui-3 border-t border-ui-border pt-ui-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="min-w-0">
          <dt className="text-ui-label font-semibold uppercase tracking-[0.1em] text-ui-text-muted">Subscribers</dt>
          <dd className="mt-ui-1 break-words text-ui-body font-semibold tabular-nums text-ui-text">
            {report.subscriberCount}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ui-label font-semibold uppercase tracking-[0.1em] text-ui-text-muted">Total views</dt>
          <dd className="mt-ui-1 break-words text-ui-body font-semibold tabular-nums text-ui-text">
            {report.totalViewCount}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ui-label font-semibold uppercase tracking-[0.1em] text-ui-text-muted">Video count</dt>
          <dd className="mt-ui-1 break-words text-ui-body font-semibold tabular-nums text-ui-text">
            {report.videoCount}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ui-label font-semibold uppercase tracking-[0.1em] text-ui-text-muted">Median views</dt>
          <dd className="mt-ui-1 break-words text-ui-body font-semibold tabular-nums text-ui-text">
            {report.medianViews ?? "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ui-label font-semibold uppercase tracking-[0.1em] text-ui-text-muted">Analyzed videos</dt>
          <dd className="mt-ui-1 break-words text-ui-body font-semibold tabular-nums text-ui-text">
            {report.analyzedVideoCount}
          </dd>
        </div>
      </dl>
    </section>
  );
}
