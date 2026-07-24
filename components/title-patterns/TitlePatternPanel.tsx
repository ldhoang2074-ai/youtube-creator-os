import { buildYoutubeWatchUrl } from "@/lib/format/video";
import type { TitlePattern, TitlePatternKind, TitlePatternReport } from "@/lib/title-patterns/types";

const MAX_DISPLAYED_PATTERNS = 15;

const KIND_LABELS: Record<TitlePatternKind, string> = {
  word: "Word",
  bigram: "Two-word phrase",
  opening: "Title opening",
  ending: "Title ending",
  numeric: "Uses a number",
  "question-mark": "Question mark",
};

interface TitlePatternPanelProps {
  readonly report: TitlePatternReport;
}

function PatternCard({ pattern, analyzedItemCount, analyzedChannelCount }: {
  readonly pattern: TitlePattern;
  readonly analyzedItemCount: number;
  readonly analyzedChannelCount: number;
}) {
  return (
    <li className="min-w-0 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-ui-2 gap-y-ui-1">
        <span className="inline-flex items-center rounded-ui-pill border border-ui-border bg-ui-surface-muted px-ui-2 py-ui-1 text-ui-label font-semibold uppercase tracking-[0.08em] text-ui-text-muted">
          {KIND_LABELS[pattern.kind]}
        </span>
        <span className="min-w-0 break-words text-ui-body font-semibold text-ui-text">
          {pattern.value}
        </span>
      </div>
      <p className="mt-ui-2 text-ui-body-sm text-ui-text-muted">
        Found in {pattern.occurrenceCount} of {analyzedItemCount} analyzed videos. Seen in{" "}
        {pattern.channelSpread} of {analyzedChannelCount} channels represented in this analyzed
        set.
      </p>
      <ul className="mt-ui-3 flex min-w-0 flex-col gap-ui-1">
        {pattern.evidence.map((evidence) => (
          <li key={evidence.videoId} className="min-w-0">
            <a
              href={buildYoutubeWatchUrl(evidence.videoId)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${evidence.title} on YouTube`}
              className="line-clamp-2 min-w-0 break-words rounded-sm text-ui-body-sm text-ui-text-secondary underline-offset-2 outline-none transition-colors hover:text-ui-text hover:underline focus-visible:ring-2 focus-visible:ring-ui-focus"
            >
              {evidence.title}
            </a>
            <span className="text-ui-body-sm text-ui-text-muted"> — {evidence.channelTitle}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function TitlePatternPanel({ report }: TitlePatternPanelProps) {
  if (report.patterns.length === 0) {
    return (
      <section aria-label="Repeated title patterns" className="flex min-w-0 flex-col gap-ui-2">
        <p className="rounded-ui-panel border border-dashed border-ui-border bg-ui-panel px-ui-4 py-ui-6 text-center text-ui-body-sm text-ui-text-muted">
          Not enough repeated title patterns were found across this set.
        </p>
      </section>
    );
  }

  const displayedPatterns = report.patterns.slice(0, MAX_DISPLAYED_PATTERNS);

  return (
    <section aria-label="Repeated title patterns" className="flex min-w-0 flex-col gap-ui-3">
      <h2 className="text-ui-section font-semibold text-ui-text">
        Repeated title patterns
      </h2>
      <p className="text-ui-body-sm text-ui-text-muted">
        These patterns repeat in this analyzed set. They do not prove why a video performed well
        and are not predictions or recommendations.
      </p>
      <ul className="flex min-w-0 flex-col gap-ui-3">
        {displayedPatterns.map((pattern) => (
          <PatternCard
            key={`${pattern.kind}-${pattern.value}`}
            pattern={pattern}
            analyzedItemCount={report.analyzedItemCount}
            analyzedChannelCount={report.analyzedChannelCount}
          />
        ))}
      </ul>
    </section>
  );
}
