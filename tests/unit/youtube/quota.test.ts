import { describe, expect, it } from "vitest";
import { QuotaTracker, YOUTUBE_QUOTA_COSTS } from "@/lib/youtube/quota";

describe("YOUTUBE_QUOTA_COSTS", () => {
  it("defines the expected unit cost per operation", () => {
    expect(YOUTUBE_QUOTA_COSTS.channelsList).toBe(1);
    expect(YOUTUBE_QUOTA_COSTS.playlistItemsList).toBe(1);
    expect(YOUTUBE_QUOTA_COSTS.videosList).toBe(1);
    expect(YOUTUBE_QUOTA_COSTS.searchList).toBe(100);
  });

  it("is frozen at runtime and rejects mutation", () => {
    expect(Object.isFrozen(YOUTUBE_QUOTA_COSTS)).toBe(true);
    expect(() => {
      (YOUTUBE_QUOTA_COSTS as { channelsList: number }).channelsList = 999;
    }).toThrow();
    expect(YOUTUBE_QUOTA_COSTS.channelsList).toBe(1);
  });
});

describe("QuotaTracker", () => {
  it("starts at zero", () => {
    const tracker = new QuotaTracker();
    expect(tracker.getTotalUnits()).toBe(0);
    expect(tracker.getCallCount()).toBe(0);
  });

  it("accumulates cost correctly across multiple calls for one operation", () => {
    const tracker = new QuotaTracker();
    tracker.record("channelsList");
    tracker.record("channelsList");
    tracker.record("playlistItemsList");

    expect(tracker.getTotalUnits()).toBe(3);
    expect(tracker.getCallCount()).toBe(3);
  });
});
