import { describe, expect, it } from "vitest";

import { enMessages } from "@/lib/i18n/dictionaries/en";
import { viMessages } from "@/lib/i18n/dictionaries/vi";
import { getMessages, MESSAGES } from "@/lib/i18n/messages";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/locales";

function isObjectRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function flattenLeafPaths(value: unknown, prefix = ""): readonly string[] {
  if (!isObjectRecord(value)) {
    return [prefix];
  }

  return Object.entries(value)
    .flatMap(([key, nestedValue]) => {
      const path = prefix.length === 0 ? key : `${prefix}.${key}`;
      return flattenLeafPaths(nestedValue, path);
    })
    .sort();
}

function flattenLeafValues(value: unknown): readonly unknown[] {
  if (!isObjectRecord(value)) {
    return [value];
  }

  return Object.values(value).flatMap((nestedValue) => flattenLeafValues(nestedValue));
}

describe("i18n locale and shell message contracts", () => {
  it("defines supported locales in the required order", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "vi"]);
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it.each(["en", "vi"])("accepts %s as a supported locale", (locale) => {
    expect(isSupportedLocale(locale)).toBe(true);
  });

  it.each([
    "EN",
    "VI",
    "en-US",
    "vi-VN",
    " en ",
    "",
    null,
    undefined,
    0,
    1,
    {},
    [],
    ["en"],
  ])("rejects unsupported locale value %j", (value) => {
    expect(isSupportedLocale(value)).toBe(false);
  });

  it("resolves supported locale values unchanged", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("vi")).toBe("vi");
  });

  it.each(["EN", "en-US", " vi ", "", null, undefined, 42, {}, []])(
    "resolves unsupported locale value %j to English",
    (value) => {
      expect(resolveLocale(value)).toBe("en");
    },
  );

  it("contains exactly the English and Vietnamese dictionaries", () => {
    expect(Object.keys(MESSAGES).sort()).toEqual(["en", "vi"]);
  });

  it("keeps English and Vietnamese recursive leaf key paths in parity", () => {
    expect(flattenLeafPaths(enMessages)).toEqual(flattenLeafPaths(viMessages));
  });

  it("uses non-empty strings for every dictionary leaf", () => {
    for (const dictionary of Object.values(MESSAGES)) {
      for (const leaf of flattenLeafValues(dictionary)) {
        expect(typeof leaf).toBe("string");
        expect((leaf as string).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("returns the selected dictionary", () => {
    expect(getMessages("en")).toBe(enMessages);
    expect(getMessages("vi")).toBe(viMessages);
  });

  it("preserves representative English shell wording", () => {
    expect(enMessages.navigation.sections.research).toBe("Research");
    expect(enMessages.navigation.items.transcript.label).toBe("Transcript Intelligence");
    expect(enMessages.accessibility.skipToContent).toBe("Skip to content");
    expect(enMessages.fallbackPage.description).toBe("Channel research for creators.");
  });

  it("preserves Vietnamese shell wording", () => {
    expect(viMessages.navigation.ariaLabel).toBe("Điều hướng sản phẩm");
    expect(viMessages.navigation.mobileAriaLabel).toBe(
      "Điều hướng sản phẩm trên thiết bị di động",
    );
    expect(viMessages.navigation.sections.research).toBe("Nghiên cứu");
    expect(viMessages.navigation.sections.comingSoon).toBe("Sắp ra mắt");
    expect(viMessages.navigation.statuses.soon).toBe("Sắp có");
    expect(viMessages.navigation.statuses.embedded).toBe(
      "Có trong kết quả nghiên cứu",
    );
    expect(viMessages.navigation.items.analyzer.label).toBe("Phân tích kênh");
    expect(viMessages.navigation.items.compare.label).toBe("So sánh kênh");
    expect(viMessages.navigation.items.opportunities.label).toBe(
      "Cơ hội nội dung",
    );
    expect(viMessages.navigation.items.workspace.label).toBe(
      "Không gian nghiên cứu",
    );
    expect(viMessages.navigation.items.transcript.label).toBe("Phân tích lời thoại");
    expect(viMessages.navigation.items.titlePatterns.label).toBe("Mẫu tiêu đề");
    expect(viMessages.navigation.items.contentGaps.label).toBe(
      "Khoảng trống nội dung",
    );
    expect(viMessages.navigation.items.ideaGenerator.label).toBe(
      "Trình tạo ý tưởng",
    );
    expect(viMessages.accessibility.skipToContent).toBe("Bỏ qua để đến nội dung");
    expect(viMessages.accessibility.openNavigation).toBe("Mở điều hướng");
    expect(viMessages.accessibility.closeNavigation).toBe("Đóng điều hướng");
    expect(viMessages.accessibility.closeNavigationOverlay).toBe(
      "Đóng lớp phủ điều hướng",
    );
    expect(viMessages.fallbackPage.description).toBe(
      "Nghiên cứu kênh dành cho nhà sáng tạo.",
    );
  });
});
