import { ChannelAnalyzerClient } from "@/components/channel-analyzer/ChannelAnalyzerClient";

export default function AnalyzerPage() {
  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-ui-6">
      <ChannelAnalyzerClient />
    </div>
  );
}
