import type { OutlierLevel } from "@/lib/analysis/outlier";

const LABELS: Record<OutlierLevel, string> = {
  "insufficient-data": "Insufficient data",
  normal: "Normal",
  outlier: "Outlier",
  "strong-outlier": "Strong outlier",
};

const STYLES: Record<OutlierLevel, string> = {
  "insufficient-data": "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  normal: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  outlier: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "strong-outlier": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function OutlierBadge({ level }: { level: OutlierLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[level]}`}
    >
      {LABELS[level]}
    </span>
  );
}
