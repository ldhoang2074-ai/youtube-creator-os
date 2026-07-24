import { OpportunityFeedClient } from "@/components/opportunity-feed/OpportunityFeedClient";
import { parseChannelQuery } from "@/lib/opportunities/parse-channel-query";

interface OpportunitiesPageProps {
  readonly searchParams: Promise<{ readonly channel?: string | string[] }>;
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialInputs = parseChannelQuery(resolvedSearchParams.channel);

  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-ui-6">
      <div className="rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 text-ui-body-sm text-ui-text-secondary sm:p-ui-6">
        <p>
          Videos that reached at least 2× their own channel&apos;s recent
          median views, pooled across the channels analyzed below. Each
          channel only analyzes its 25 most recent videos, so this reflects a
          snapshot of that analyzed set — not growth or change over time.
        </p>
        <p className="mt-ui-2 text-ui-text-muted">
          The outlier multiplier compares each video only against its own
          channel&apos;s recent median, not against other channels.
        </p>
      </div>
      <OpportunityFeedClient initialInputs={initialInputs} />
    </div>
  );
}
