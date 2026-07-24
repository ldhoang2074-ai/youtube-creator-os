import type {
  TranscriptGenerationKind,
  TranscriptSegmentInput,
} from "./types";

export interface AudioTranscriptProviderRequest {
  readonly file: File;
  readonly signal: AbortSignal;
}

export interface AudioTranscriptProviderPayload {
  readonly languageCode: string;
  readonly generationKind: TranscriptGenerationKind;
  readonly segments: readonly TranscriptSegmentInput[];
}

export interface AudioTranscriptProvider {
  readonly id: string;

  transcribe(
    request: AudioTranscriptProviderRequest,
  ): Promise<AudioTranscriptProviderPayload>;
}
