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

function buildYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

interface TitlePatternPanelProps {
  readonly report: TitlePatternReport;
}

function PatternCard({ pattern, analyzedItemCount, analyzedChannelCount }: {
  readonly pattern: TitlePattern;
  readonly analyzedItemCount: number;
  readonly analyzedChannelCount: number;
}) {
  return (
    <li className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
          {KIND_LABELS[pattern.kind]}
        </span>
        <span className="font-medium text-zinc-950 dark:text-zinc-50">{pattern.value}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Found in {pattern.occurrenceCount} of {analyzedItemCount} analyzed videos. Seen in{" "}
        {pattern.channelSpread} of {analyzedChannelCount} channels represented in this analyzed
        set.
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {pattern.evidence.map((evidence) => (
          <li key={evidence.videoId}>
            <a
              href={buildYoutubeWatchUrl(evidence.videoId)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${evidence.title} on YouTube`}
              className="line-clamp-2 text-sm text-zinc-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:text-zinc-300"
            >
              {evidence.title}
            </a>
            <span className="text-xs text-zinc-500 dark:text-zinc-400"> — {evidence.channelTitle}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function TitlePatternPanel({ report }: TitlePatternPanelProps) {
  if (report.patterns.length === 0) {
    return (
      <section aria-label="Repeated title patterns" className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Not enough repeated title patterns were found across this set.
        </p>
      </section>
    );
  }

  const displayedPatterns = report.patterns.slice(0, MAX_DISPLAYED_PATTERNS);

  return (
    <section aria-label="Repeated title patterns" className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
        Repeated title patterns
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        These patterns repeat in this analyzed set. They do not prove why a video performed well
        and are not predictions or recommendations.
      </p>
      <ul className="flex flex-col gap-2">
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
