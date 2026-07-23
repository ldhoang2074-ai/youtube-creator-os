import type {
  TranscriptGenerationKind,
  TranscriptSegmentInput,
} from "./types";

export interface TranscriptProviderRequest {
  readonly videoId: string;
  readonly signal: AbortSignal;
}

export interface TranscriptProviderPayload {
  readonly languageCode: string;
  readonly generationKind: TranscriptGenerationKind;
  readonly segments: readonly TranscriptSegmentInput[];
}

export interface TranscriptProvider {
  readonly id: string;

  fetchTranscript(request: TranscriptProviderRequest): Promise<TranscriptProviderPayload>;
}
