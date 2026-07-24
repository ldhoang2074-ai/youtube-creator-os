import { TranscriptIntelligenceClient } from "@/components/transcript/TranscriptIntelligenceClient";

export default function TranscriptPage() {
  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-ui-6">
      <TranscriptIntelligenceClient />
    </div>
  );
}
