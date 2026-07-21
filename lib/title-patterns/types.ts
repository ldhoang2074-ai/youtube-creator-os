export type TitlePatternKind = "word" | "bigram" | "opening" | "ending" | "numeric" | "question-mark";

export interface TitlePatternEvidence {
  readonly videoId: string;
  readonly title: string;
  readonly channelId: string;
  readonly channelTitle: string;
}

export interface TitlePattern {
  readonly kind: TitlePatternKind;
  readonly value: string;
  readonly occurrenceCount: number;
  readonly channelSpread: number;
  readonly evidence: readonly TitlePatternEvidence[];
}

export interface TitlePatternReport {
  readonly analyzedItemCount: number;
  readonly analyzedChannelCount: number;
  readonly patterns: readonly TitlePattern[];
}

export const MIN_PATTERN_OCCURRENCES = 3;
export const MIN_PATTERN_OCCURRENCE_RATIO = 0.25;
export const MIN_PATTERN_CHANNEL_SPREAD = 2;
export const MAX_EVIDENCE_PER_PATTERN = 5;
export const MAX_ANALYZED_ITEMS = 200;
