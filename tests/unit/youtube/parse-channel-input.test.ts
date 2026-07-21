import { describe, expect, it } from "vitest";
import { parseChannelInput } from "@/lib/youtube/parse-channel-input";
import { YoutubeError } from "@/lib/youtube/errors";

const VALID_CHANNEL_ID = "UCabcdefghijklmnopqrstuv";

function captureError(fn: () => unknown): YoutubeError {
  try {
    fn();
  } catch (error) {
    if (error instanceof YoutubeError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected function to throw a YoutubeError");
}

describe("parseChannelInput", () => {
  it("accepts a bare channel ID", () => {
    expect(parseChannelInput(VALID_CHANNEL_ID)).toEqual({
      kind: "channelId",
      value: VALID_CHANNEL_ID,
    });
  });

  it("accepts a /channel/ URL", () => {
    expect(parseChannelInput(`https://www.youtube.com/channel/${VALID_CHANNEL_ID}`)).toEqual({
      kind: "channelId",
      value: VALID_CHANNEL_ID,
    });
  });

  it("accepts a bare handle", () => {
    expect(parseChannelInput("@somecreator")).toEqual({
      kind: "handle",
      value: "@somecreator",
    });
  });

  it("accepts a /@handle URL", () => {
    expect(parseChannelInput("https://www.youtube.com/@somecreator")).toEqual({
      kind: "handle",
      value: "@somecreator",
    });
  });

  it("accepts a URL with a trailing slash", () => {
    expect(
      parseChannelInput(`https://www.youtube.com/channel/${VALID_CHANNEL_ID}/`),
    ).toEqual({ kind: "channelId", value: VALID_CHANNEL_ID });
  });

  it("accepts a URL with a query string", () => {
    expect(parseChannelInput("https://www.youtube.com/@somecreator?feature=share")).toEqual({
      kind: "handle",
      value: "@somecreator",
    });
  });

  it("accepts a URL with a fragment", () => {
    expect(parseChannelInput("https://www.youtube.com/@somecreator#about")).toEqual({
      kind: "handle",
      value: "@somecreator",
    });
  });

  it("rejects empty input", () => {
    expect(captureError(() => parseChannelInput("")).code).toBe("INVALID_INPUT");
    expect(captureError(() => parseChannelInput("   ")).code).toBe("INVALID_INPUT");
  });

  it("rejects a malformed channel ID", () => {
    expect(captureError(() => parseChannelInput("UCshort")).code).toBe("INVALID_INPUT");
  });

  it("rejects a malformed handle", () => {
    expect(captureError(() => parseChannelInput("@a")).code).toBe("INVALID_INPUT");
  });

  it("rejects a spoofed lookalike domain", () => {
    const error = captureError(() =>
      parseChannelInput(`https://youtube.com.evil.com/channel/${VALID_CHANNEL_ID}`),
    );
    expect(error.code).toBe("INVALID_INPUT");
  });

  it("rejects a URL outside YouTube", () => {
    const error = captureError(() =>
      parseChannelInput(`https://example.com/channel/${VALID_CHANNEL_ID}`),
    );
    expect(error.code).toBe("INVALID_INPUT");
  });

  it("rejects /c/ URLs with UNSUPPORTED_CHANNEL_FORMAT", () => {
    const error = captureError(() => parseChannelInput("https://www.youtube.com/c/SomeCustomName"));
    expect(error.code).toBe("UNSUPPORTED_CHANNEL_FORMAT");
  });

  it("rejects /user/ URLs with UNSUPPORTED_CHANNEL_FORMAT", () => {
    const error = captureError(() => parseChannelInput("https://www.youtube.com/user/SomeLegacyName"));
    expect(error.code).toBe("UNSUPPORTED_CHANNEL_FORMAT");
  });

  it("rejects a video URL", () => {
    const error = captureError(() => parseChannelInput("https://www.youtube.com/watch?v=abc123"));
    expect(error.code).toBe("INVALID_INPUT");
  });

  it("rejects a playlist URL", () => {
    const error = captureError(() => parseChannelInput("https://www.youtube.com/playlist?list=PL123"));
    expect(error.code).toBe("INVALID_INPUT");
  });

  it("accepts an m.youtube.com handle URL", () => {
    expect(parseChannelInput("https://m.youtube.com/@validhandle")).toEqual({
      kind: "handle",
      value: "@validhandle",
    });
  });
});
