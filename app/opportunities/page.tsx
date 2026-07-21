import { OpportunityFeedClient } from "@/components/opportunity-feed/OpportunityFeedClient";
import { parseChannelQuery } from "@/lib/opportunities/parse-channel-query";

interface OpportunitiesPageProps {
  readonly searchParams: Promise<{ readonly channel?: string | string[] }>;
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialInputs = parseChannelQuery(resolvedSearchParams.channel);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Opportunity Feed
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Videos in the analyzed recent set that reached at least 2× their
          channel&apos;s median views. Each channel analyzes only its 25 most
          recent videos. This reflects only the analyzed set and does not
          track change over time.
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Outlier multiplier is measured against each channel&apos;s own
          recent median, not as an absolute comparison between channels.
        </p>
      </div>
      <OpportunityFeedClient initialInputs={initialInputs} />
    </div>
  );
}
