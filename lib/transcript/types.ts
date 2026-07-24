export const TRANSCRIPT_SOURCES = Object.freeze([
  "youtube-captions",
  "manual",
  "audio-transcription",
] as const);

export type TranscriptSource = (typeof TRANSCRIPT_SOURCES)[number];

export const TRANSCRIPT_GENERATION_KINDS = Object.freeze([
  "manual",
  "auto-generated",
  "unknown",
] as const);

export type TranscriptGenerationKind = (typeof TRANSCRIPT_GENERATION_KINDS)[number];

export interface TranscriptSegmentInput {
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly text: string;
}

export interface TranscriptSegment {
  readonly index: number;
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly text: string;
}

export interface TranscriptChunk {
  readonly index: number;
  readonly startSegmentIndex: number;
  readonly endSegmentIndex: number;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly characterCount: number;
  readonly text: string;
  readonly segments: readonly TranscriptSegment[];
}

export interface TranscriptDocumentInput {
  readonly videoId: string;
  readonly languageCode: string;
  readonly source: TranscriptSource;
  readonly generationKind: TranscriptGenerationKind;
  readonly segments: readonly TranscriptSegmentInput[];
}

export interface TranscriptDocument {
  readonly videoId: string;
  readonly languageCode: string;
  readonly source: TranscriptSource;
  readonly generationKind: TranscriptGenerationKind;
  readonly segments: readonly TranscriptSegment[];
}
