import type { ChannelCompareEntry } from "@/lib/channel-analyzer/types";

interface ComparisonTableProps {
  readonly results: readonly ChannelCompareEntry[];
}

function formatOutlierRate(rate: number | null): string {
  if (rate === null) {
    return "—";
  }
  return `${Math.round(rate * 100)}%`;
}

export function ComparisonTable({ results }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-2">Channel</th>
            <th className="px-4 py-2">Subscribers</th>
            <th className="px-4 py-2">Total views</th>
            <th className="px-4 py-2">Video count</th>
            <th className="px-4 py-2">Median views</th>
            <th className="px-4 py-2">Analyzed videos</th>
            <th className="px-4 py-2">Recent-video outlier rate</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((entry, index) => {
            if (entry.status === "success") {
              const { report } = entry;
              return (
                <tr
                  key={report.channelId}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  <td className="px-4 py-2">{report.title}</td>
                  <td className="px-4 py-2">{report.subscriberCount}</td>
                  <td className="px-4 py-2">{report.totalViewCount}</td>
                  <td className="px-4 py-2">{report.videoCount}</td>
                  <td className="px-4 py-2">{report.medianViews ?? "—"}</td>
                  <td className="px-4 py-2">{report.analyzedVideoCount}</td>
                  <td className="px-4 py-2">{formatOutlierRate(report.outlierRate)}</td>
                  <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">OK</td>
                </tr>
              );
            }

            return (
              <tr
                key={`${entry.input}-${index}`}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <td className="px-4 py-2">{entry.input}</td>
                <td className="px-4 py-2">—</td>
                <td className="px-4 py-2">—</td>
                <td className="px-4 py-2">—</td>
                <td className="px-4 py-2">—</td>
                <td className="px-4 py-2">—</td>
                <td className="px-4 py-2">—</td>
                <td className="px-4 py-2 text-red-700 dark:text-red-300">
                  Error: {entry.error.message}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
