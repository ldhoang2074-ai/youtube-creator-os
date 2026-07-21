import { describe, expect, it } from "vitest";
import { pickBestThumbnailUrl } from "@/lib/youtube/thumbnail";

describe("pickBestThumbnailUrl", () => {
  it("prefers maxres when available", () => {
    const url = pickBestThumbnailUrl({
      default: { url: "default.jpg" },
      medium: { url: "medium.jpg" },
      high: { url: "high.jpg" },
      standard: { url: "standard.jpg" },
      maxres: { url: "maxres.jpg" },
    });
    expect(url).toBe("maxres.jpg");
  });

  it("falls back to standard when maxres is missing", () => {
    const url = pickBestThumbnailUrl({
      default: { url: "default.jpg" },
      medium: { url: "medium.jpg" },
      high: { url: "high.jpg" },
      standard: { url: "standard.jpg" },
    });
    expect(url).toBe("standard.jpg");
  });

  it("falls back to high when maxres and standard are missing", () => {
    const url = pickBestThumbnailUrl({
      default: { url: "default.jpg" },
      medium: { url: "medium.jpg" },
      high: { url: "high.jpg" },
    });
    expect(url).toBe("high.jpg");
  });

  it("falls back to medium when only medium and default are present", () => {
    const url = pickBestThumbnailUrl({
      default: { url: "default.jpg" },
      medium: { url: "medium.jpg" },
    });
    expect(url).toBe("medium.jpg");
  });

  it("falls back to default when it is the only size present", () => {
    const url = pickBestThumbnailUrl({ default: { url: "default.jpg" } });
    expect(url).toBe("default.jpg");
  });

  it("returns null when no thumbnail sizes are present", () => {
    expect(pickBestThumbnailUrl({})).toBeNull();
  });

  it("returns null when thumbnails is undefined", () => {
    expect(pickBestThumbnailUrl(undefined)).toBeNull();
  });
});
