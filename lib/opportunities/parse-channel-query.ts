const MAX_CHANNELS_FROM_QUERY = 5;

/**
 * Normalizes the raw `channel` search param value from Next.js searchParams
 * (a single string, an array of strings, or undefined when absent) into an
 * ordered list of trimmed, non-empty channel inputs capped at 5. Never
 * throws, never deduplicates, and never enforces a minimum count — that
 * validation belongs to the Opportunity Feed form/route, not this parser.
 */
export function parseChannelQuery(value: string | readonly string[] | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : [value];

  const trimmed = rawValues.map((entry) => entry.trim()).filter((entry) => entry.length > 0);

  return trimmed.slice(0, MAX_CHANNELS_FROM_QUERY);
}
