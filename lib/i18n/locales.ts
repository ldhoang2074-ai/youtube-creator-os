export const SUPPORTED_LOCALES = ["en", "vi"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    SUPPORTED_LOCALES.some((locale) => locale === value)
  );
}

export function resolveLocale(value: unknown): Locale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}
