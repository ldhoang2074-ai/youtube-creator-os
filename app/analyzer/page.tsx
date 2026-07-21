import { ChannelAnalyzerClient } from "@/components/channel-analyzer/ChannelAnalyzerClient";

export default function AnalyzerPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Channel Analyzer
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Paste a YouTube channel URL or handle to see its recent videos and which ones are
          outliers.
        </p>
      </div>
      <ChannelAnalyzerClient />
    </div>
  );
}
