import type * as React from "react";

import { formatTranscriptTimestamp } from "@/lib/transcript/format-timestamp";
import type {
  TranscriptDocument,
  TranscriptGenerationKind,
} from "@/lib/transcript/types";

interface TranscriptSegmentListProps {
  readonly transcript: TranscriptDocument;
}

const GENERATION_LABELS: Record<TranscriptGenerationKind, string> = {
  manual: "Manual",
  "auto-generated": "Auto-generated",
  unknown: "Unknown",
};

export function TranscriptSegmentList({
  transcript,
}: TranscriptSegmentListProps): React.ReactElement {
  return (
    <section aria-labelledby="transcript-heading" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2
          id="transcript-heading"
          className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
        >
          Transcript
        </h2>

        <dl className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <div className="flex items-baseline gap-1">
            <dt className="font-medium text-zinc-800 dark:text-zinc-200">
              Language:
            </dt>
            <dd>{transcript.languageCode}</dd>
          </div>
          <div className="flex items-baseline gap-1">
            <dt className="font-medium text-zinc-800 dark:text-zinc-200">
              Generation:
            </dt>
            <dd>{GENERATION_LABELS[transcript.generationKind]}</dd>
          </div>
        </dl>
      </div>

      {transcript.segments.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
          No transcript segments are available.
        </p>
      ) : (
        <ol className="max-h-[32rem] space-y-1 overflow-y-auto overflow-x-hidden pr-1">
          {transcript.segments.map((segment) => {
            const timestamp = formatTranscriptTimestamp(segment.startSeconds);

            return (
              <li
                key={segment.index}
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
              >
                <span
                  aria-label={`Timestamp ${timestamp}`}
                  className="whitespace-nowrap rounded bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {timestamp}
                </span>
                <p className="min-w-0 break-words whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">
                  {segment.text}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
