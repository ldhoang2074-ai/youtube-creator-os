import { ChannelAnalyzerClient } from "@/components/channel-analyzer/ChannelAnalyzerClient";

export default function AnalyzerPage() {
  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <ChannelAnalyzerClient />
    </div>
  );
}
