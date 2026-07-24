import { AudioTranscriptUploadClient } from "@/components/transcript/AudioTranscriptUploadClient";
import { TranscriptIntelligenceClient } from "@/components/transcript/TranscriptIntelligenceClient";

export default function TranscriptPage() {
  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-ui-6">
      <section
        aria-labelledby="youtube-transcript-workflow-heading"
        className="flex min-w-0 flex-col gap-ui-3"
      >
        <h2
          id="youtube-transcript-workflow-heading"
          className="text-ui-section font-semibold text-ui-text"
        >
          YouTube transcript
        </h2>
        <TranscriptIntelligenceClient />
      </section>

      <section
        aria-labelledby="audio-transcript-workflow-heading"
        className="flex min-w-0 flex-col gap-ui-3"
      >
        <h2
          id="audio-transcript-workflow-heading"
          className="text-ui-section font-semibold text-ui-text"
        >
          Audio or video transcript
        </h2>
        <AudioTranscriptUploadClient />
      </section>
    </div>
  );
}
