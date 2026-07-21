import type { OpportunityFeedItem } from "../channel-analyzer/types";
import { isTitleStopword } from "./stopwords";
import { containsQuestionMark, tokenizeTitle, type TitleToken } from "./tokenize";
import {
  MAX_ANALYZED_ITEMS,
  MAX_EVIDENCE_PER_PATTERN,
  MIN_PATTERN_CHANNEL_SPREAD,
  MIN_PATTERN_OCCURRENCES,
  MIN_PATTERN_OCCURRENCE_RATIO,
  type TitlePattern,
  type TitlePatternEvidence,
  type TitlePatternKind,
  type TitlePatternReport,
} from "./types";

const CANDIDATE_KEY_SEPARATOR = "\u0000";

const KIND_ORDER: Record<TitlePatternKind, number> = {
  word: 0,
  bigram: 1,
  opening: 2,
  ending: 3,
  numeric: 4,
  "question-mark": 5,
};

interface EvidenceCandidate {
  readonly videoId: string;
  readonly title: string;
  readonly channelId: string;
  readonly channelTitle: string;
  readonly outlierRatio: number;
  readonly publishedAt: string;
}

interface PatternCandidate {
  readonly kind: TitlePatternKind;
  readonly value: string;
  readonly videoIds: Set<string>;
  readonly channelIds: Set<string>;
  readonly evidence: EvidenceCandidate[];
}

function dedupeByVideoId(items: readonly OpportunityFeedItem[]): OpportunityFeedItem[] {
  const seen = new Set<string>();
  const deduped: OpportunityFeedItem[] = [];
  for (const item of items) {
    if (seen.has(item.videoId)) {
      continue;
    }
    seen.add(item.videoId);
    deduped.push(item);
  }
  return deduped;
}

function openingCandidateValues(tokens: readonly TitleToken[]): string[] {
  if (tokens.length === 0) {
    return [];
  }
  const values = [tokens[0].normalized];
  if (tokens.length >= 2) {
    values.push(`${tokens[0].normalized} ${tokens[1].normalized}`);
  }
  return values;
}

function endingCandidateValues(tokens: readonly TitleToken[]): string[] {
  if (tokens.length === 0) {
    return [];
  }
  const lastIndex = tokens.length - 1;
  const values = [tokens[lastIndex].normalized];
  if (tokens.length >= 2) {
    values.push(`${tokens[lastIndex - 1].normalized} ${tokens[lastIndex].normalized}`);
  }
  return values;
}

function compareValue(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

function comparePatterns(a: TitlePattern, b: TitlePattern): number {
  if (a.channelSpread !== b.channelSpread) {
    return b.channelSpread - a.channelSpread;
  }
  if (a.occurrenceCount !== b.occurrenceCount) {
    return b.occurrenceCount - a.occurrenceCount;
  }
  const kindDiff = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  if (kindDiff !== 0) {
    return kindDiff;
  }
  return compareValue(a.value, b.value);
}

function compareEvidence(a: EvidenceCandidate, b: EvidenceCandidate): number {
  if (a.outlierRatio !== b.outlierRatio) {
    return b.outlierRatio - a.outlierRatio;
  }
  const publishedAtDiff = Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  if (publishedAtDiff !== 0) {
    return publishedAtDiff;
  }
  return compareValue(a.videoId, b.videoId);
}

function addCandidate(
  candidates: Map<string, PatternCandidate>,
  kind: TitlePatternKind,
  value: string,
  item: OpportunityFeedItem,
): void {
  const key = `${kind}${CANDIDATE_KEY_SEPARATOR}${value}`;
  let candidate = candidates.get(key);
  if (candidate === undefined) {
    candidate = { kind, value, videoIds: new Set(), channelIds: new Set(), evidence: [] };
    candidates.set(key, candidate);
  }
  if (candidate.videoIds.has(item.videoId)) {
    return; // a candidate counts at most once per video
  }
  candidate.videoIds.add(item.videoId);
  candidate.channelIds.add(item.channelId);
  candidate.evidence.push({
    videoId: item.videoId,
    title: item.title,
    channelId: item.channelId,
    channelTitle: item.channelTitle,
    outlierRatio: item.outlierRatio,
    publishedAt: item.publishedAt,
  });
}

/**
 * Deterministically finds title patterns (repeated words/bigrams, shared
 * openings/endings, numeric titles, question-marked titles) that repeat
 * across an already-analyzed set of Opportunity Feed items. This only
 * describes what repeats in the given set — it does not claim causation,
 * trend, growth, audience demand, or a recommendation.
 */
export function analyzeTitlePatterns(items: readonly OpportunityFeedItem[]): TitlePatternReport {
  const deduped = dedupeByVideoId(items);
  const clamped = deduped.slice(0, MAX_ANALYZED_ITEMS);

  if (clamped.length === 0) {
    return { analyzedItemCount: 0, analyzedChannelCount: 0, patterns: [] };
  }

  const analyzedChannelCount = new Set(clamped.map((item) => item.channelId)).size;
  const candidates = new Map<string, PatternCandidate>();

  for (const item of clamped) {
    const tokens = tokenizeTitle(item.title);

    for (const token of tokens) {
      if (!token.isNumeric && token.normalized.length > 1 && !isTitleStopword(token.normalized)) {
        addCandidate(candidates, "word", token.normalized, item);
      }
    }

    for (let i = 0; i < tokens.length - 1; i += 1) {
      addCandidate(candidates, "bigram", `${tokens[i].normalized} ${tokens[i + 1].normalized}`, item);
    }

    for (const value of openingCandidateValues(tokens)) {
      addCandidate(candidates, "opening", value, item);
    }
    for (const value of endingCandidateValues(tokens)) {
      addCandidate(candidates, "ending", value, item);
    }

    if (tokens.some((token) => token.isNumeric)) {
      addCandidate(candidates, "numeric", "contains a number", item);
    }
    if (containsQuestionMark(item.title)) {
      addCandidate(candidates, "question-mark", "contains a question mark", item);
    }
  }

  const requiredOccurrences = Math.max(
    MIN_PATTERN_OCCURRENCES,
    Math.ceil(MIN_PATTERN_OCCURRENCE_RATIO * clamped.length),
  );

  const patterns: TitlePattern[] = [];
  for (const candidate of candidates.values()) {
    const occurrenceCount = candidate.videoIds.size;
    const channelSpread = candidate.channelIds.size;
    const meetsFrequency = occurrenceCount >= requiredOccurrences;
    const meetsSpread = analyzedChannelCount < 2 || channelSpread >= MIN_PATTERN_CHANNEL_SPREAD;

    if (!meetsFrequency || !meetsSpread) {
      continue;
    }

    const evidence: TitlePatternEvidence[] = [...candidate.evidence]
      .sort(compareEvidence)
      .slice(0, MAX_EVIDENCE_PER_PATTERN)
      .map((item) => ({
        videoId: item.videoId,
        title: item.title,
        channelId: item.channelId,
        channelTitle: item.channelTitle,
      }));

    patterns.push({ kind: candidate.kind, value: candidate.value, occurrenceCount, channelSpread, evidence });
  }

  patterns.sort(comparePatterns);

  return { analyzedItemCount: clamped.length, analyzedChannelCount, patterns };
}
