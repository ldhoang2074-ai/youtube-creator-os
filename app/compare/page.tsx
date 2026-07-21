import { ChannelCompareClient } from "@/components/channel-compare/ChannelCompareClient";

export default function ComparePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Channel Compare
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Compare 2 to 5 YouTube channels side by side — subscribers, views, and
          recent-video outlier rate.
        </p>
      </div>
      <ChannelCompareClient />
    </div>
  );
}
