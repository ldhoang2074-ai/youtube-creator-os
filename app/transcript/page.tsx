import { TranscriptIntelligenceClient } from "@/components/transcript/TranscriptIntelligenceClient";

export default function TranscriptPage() {
  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <TranscriptIntelligenceClient />
    </div>
  );
}
