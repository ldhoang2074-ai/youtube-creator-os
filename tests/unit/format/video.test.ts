import { describe, expect, it } from "vitest";
import { buildYoutubeWatchUrl, formatDuration } from "@/lib/format/video";

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [9, "0:09"],
    [59, "0:59"],
    [60, "1:00"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3723, "1:02:03"],
  ])("formats %i seconds as %s", (totalSeconds, expected) => {
    expect(formatDuration(totalSeconds)).toBe(expected);
  });
});

describe("buildYoutubeWatchUrl", () => {
  it("builds a watch URL for a normal video ID", () => {
    expect(buildYoutubeWatchUrl("dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });

  it("encodes characters that are not safe in a query value", () => {
    expect(buildYoutubeWatchUrl("video id&list=other")).toBe(
      "https://www.youtube.com/watch?v=video%20id%26list%3Dother",
    );
  });

  it("preserves the existing empty-ID output", () => {
    expect(buildYoutubeWatchUrl("")).toBe("https://www.youtube.com/watch?v=");
  });
});
