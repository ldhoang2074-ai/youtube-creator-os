import type { OutlierLevel } from "@/lib/analysis/outlier";

const LABELS: Record<OutlierLevel, string> = {
  "insufficient-data": "Insufficient data",
  normal: "Normal",
  outlier: "Outlier",
  "strong-outlier": "Strong outlier",
};

const STYLES: Record<OutlierLevel, string> = {
  "insufficient-data": "border-ui-border bg-ui-surface-muted text-ui-text-muted",
  normal: "border-ui-border bg-ui-panel-elevated text-ui-text-secondary",
  outlier: "border-ui-warning/40 bg-ui-warning/10 text-ui-warning",
  "strong-outlier": "border-ui-danger/50 bg-ui-danger/10 font-semibold text-ui-danger",
};

export function OutlierBadge({ level }: { level: OutlierLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-ui-pill border px-ui-2 py-ui-1 text-ui-label font-medium ${STYLES[level]}`}
    >
      {LABELS[level]}
    </span>
  );
}
