/**
 * Small, hand-picked function-word lists for English and Spanish. This is
 * not a linguistically complete stopword set for either language — it only
 * exists to keep the "word" pattern from being dominated by grammatical
 * glue words. Content words (character names, brands, topics — e.g.
 * "rescue", "sonic", "mario", "animal", "story", "top") are deliberately
 * never included here. No language detection is performed: both lists are
 * always applied together, so a word that is a stopword in one language
 * but meaningful in the other will still be excluded from the "word"
 * pattern for either title.
 */
export const ENGLISH_STOPWORDS: ReadonlySet<string> = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "so",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "why",
  "will",
  "with",
  "you",
  "your",
]);

export const SPANISH_STOPWORDS: ReadonlySet<string> = new Set([
  "al",
  "como",
  "con",
  "de",
  "del",
  "el",
  "ella",
  "ellos",
  "en",
  "es",
  "esa",
  "ese",
  "esta",
  "este",
  "la",
  "las",
  "lo",
  "los",
  "mi",
  "mis",
  "mucho",
  "muy",
  "nos",
  "nuestro",
  "o",
  "para",
  "pero",
  "por",
  "que",
  "se",
  "si",
  "son",
  "su",
  "sus",
  "tu",
  "tus",
  "un",
  "una",
  "y",
]);

export function isTitleStopword(token: string): boolean {
  return ENGLISH_STOPWORDS.has(token) || SPANISH_STOPWORDS.has(token);
}
