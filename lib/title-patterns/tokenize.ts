export interface TitleToken {
  readonly raw: string;
  readonly normalized: string;
  readonly isNumeric: boolean;
}

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/giu;

/**
 * Allowlist matcher: only sequences of Unicode letters/digits, optionally
 * joined internally by an apostrophe or hyphen, ever become a token. Emoji,
 * punctuation, symbols, whitespace, ZWJ (U+200D), and variation selectors
 * (U+FE0E/U+FE0F) all fall outside \p{L}/\p{N}, so they are never captured
 * — there is no separate strip step for them.
 */
const TOKEN_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

const TRAILING_POSSESSIVE_PATTERN = /['’]s$/u;
const NUMERIC_PATTERN = /^\p{Nd}+$/u;
const QUESTION_MARK_PATTERN = /[?¿？]/u;

function stripPossessive(token: string): string {
  return token.replace(TRAILING_POSSESSIVE_PATTERN, "");
}

export function tokenizeTitle(title: string): readonly TitleToken[] {
  const normalized = title.normalize("NFKC");
  const withoutUrls = normalized.replace(URL_PATTERN, " ");
  const lowered = withoutUrls.toLowerCase();

  const rawMatches = lowered.match(TOKEN_PATTERN) ?? [];

  const tokens: TitleToken[] = [];
  for (const raw of rawMatches) {
    const normalizedToken = stripPossessive(raw);
    if (normalizedToken.length === 0) {
      continue;
    }
    tokens.push({
      raw,
      normalized: normalizedToken,
      isNumeric: NUMERIC_PATTERN.test(normalizedToken),
    });
  }
  return tokens;
}

/**
 * Detects the presence of a question-mark-like character anywhere in the
 * title (half-width, Spanish inverted, or full-width). This only reports
 * that the character is present — it is not a grammatical question
 * detector and does not claim the title is phrased as a question.
 */
export function containsQuestionMark(title: string): boolean {
  return QUESTION_MARK_PATTERN.test(title);
}
