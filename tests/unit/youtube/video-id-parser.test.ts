import { describe, expect, it } from "vitest";
import {
  parseYouTubeVideoId,
  YoutubeVideoReferenceError,
  type YoutubeVideoReferenceErrorCode,
} from "@/lib/youtube/video-id-parser";

const VIDEO_ID = "dQw4w9WgXcQ";
const SECOND_VIDEO_ID = "AbCdEfGhI-J";

function captureError(fn: () => unknown): YoutubeVideoReferenceError {
  try {
    fn();
  } catch (error) {
    if (error instanceof YoutubeVideoReferenceError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected function to throw YoutubeVideoReferenceError");
}

function expectErrorCode(input: string, code: YoutubeVideoReferenceErrorCode): void {
  expect(captureError(() => parseYouTubeVideoId(input)).code).toBe(code);
}

describe("parseYouTubeVideoId", () => {
  it.each([
    [VIDEO_ID, VIDEO_ID],
    [`  ${SECOND_VIDEO_ID}  `, SECOND_VIDEO_ID],
    [`https://www.youtube.com/watch?v=${VIDEO_ID}`, VIDEO_ID],
    [`https://youtube.com/watch?v=${VIDEO_ID}`, VIDEO_ID],
    [`https://m.youtube.com/watch?v=${VIDEO_ID}`, VIDEO_ID],
    [`https://music.youtube.com/watch?v=${VIDEO_ID}`, VIDEO_ID],
    [`youtube.com/watch?v=${VIDEO_ID}`, VIDEO_ID],
    [`//www.youtube.com/watch?v=${VIDEO_ID}`, VIDEO_ID],
    [`https://www.youtube.com/watch?list=abc&v=${VIDEO_ID}&t=20`, VIDEO_ID],
    [`https://www.youtube.com/watch?list=abc&v=${VIDEO_ID}`, VIDEO_ID],
    [`https://www.youtube.com/watch?v=${VIDEO_ID}#section`, VIDEO_ID],
    [`https://www.youtube.com/watch?v=${VIDEO_ID}&next=../other`, VIDEO_ID],
    [`https://www.youtube.com/watch/?v=${VIDEO_ID}`, VIDEO_ID],
    [`https://www.youtube.com/watch?v=${SECOND_VIDEO_ID}&v=${VIDEO_ID}`, SECOND_VIDEO_ID],
    [`https://youtu.be/${VIDEO_ID}`, VIDEO_ID],
    [`youtu.be/${VIDEO_ID}`, VIDEO_ID],
    [`https://youtu.be/${VIDEO_ID}?t=20`, VIDEO_ID],
    [`https://youtu.be/${VIDEO_ID}/`, VIDEO_ID],
    [`https://www.youtube.com/shorts/${VIDEO_ID}`, VIDEO_ID],
    [`youtube.com/shorts/${VIDEO_ID}?feature=share#section`, VIDEO_ID],
    [`https://www.youtube.com/embed/${VIDEO_ID}`, VIDEO_ID],
    [`https://youtube-nocookie.com/embed/${VIDEO_ID}`, VIDEO_ID],
    [`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`, VIDEO_ID],
    [`https://www.youtube.com/live/${VIDEO_ID}`, VIDEO_ID],
    [`http://www.youtube.com/watch?v=${VIDEO_ID}`, VIDEO_ID],
    [`HTTPS://WWW.YOUTUBE.COM/watch?v=${VIDEO_ID}`, VIDEO_ID],
  ])("accepts %s", (input, expectedVideoId) => {
    expect(parseYouTubeVideoId(input)).toBe(expectedVideoId);
  });

  it.each([
    ["", "EMPTY_YOUTUBE_REFERENCE"],
    ["   ", "EMPTY_YOUTUBE_REFERENCE"],
    ["dQw4w9WgXc", "INVALID_VIDEO_ID"],
    ["dQw4w9WgXcQx", "INVALID_VIDEO_ID"],
    ["dQw4w9WgXc.", "INVALID_VIDEO_ID"],
    ["dQw4 w9WgXcQ", "INVALID_VIDEO_ID"],
    ["dQw4w9WgXcé", "INVALID_VIDEO_ID"],
    ["https://www.youtube.com/watch", "MISSING_VIDEO_ID"],
    ["https://www.youtube.com/watch?v=", "MISSING_VIDEO_ID"],
    ["https://www.youtube.com/watch?v=not-valid", "INVALID_VIDEO_ID"],
    ["https://www.youtube.com/watch?v=%64Qw4w9WgXcQ", "INVALID_VIDEO_ID"],
    [`https://www.youtube.com/watch?v=${VIDEO_ID}%2Fextra`, "INVALID_VIDEO_ID"],
    [`https://www.youtube.com/watch?v=INVALID000&v=${VIDEO_ID}`, "INVALID_VIDEO_ID"],
    ["https://youtu.be/", "MISSING_VIDEO_ID"],
    [`https://youtu.be/${VIDEO_ID}/extra`, "UNSUPPORTED_YOUTUBE_PATH"],
    ["https://www.youtube.com/shorts", "MISSING_VIDEO_ID"],
    [`https://www.youtube.com/shorts/${VIDEO_ID}/extra`, "UNSUPPORTED_YOUTUBE_PATH"],
    ["https://www.youtube.com/embed", "MISSING_VIDEO_ID"],
    [`https://www.youtube.com/embed/${VIDEO_ID}/extra`, "UNSUPPORTED_YOUTUBE_PATH"],
    ["https://www.youtube.com/live", "MISSING_VIDEO_ID"],
    [`https://www.youtube.com/live/${VIDEO_ID}/extra`, "UNSUPPORTED_YOUTUBE_PATH"],
    ["https://www.youtube.com/channel/UC123", "UNSUPPORTED_YOUTUBE_PATH"],
    ["https://www.youtube.com/@channel", "UNSUPPORTED_YOUTUBE_PATH"],
    ["https://www.youtube.com/playlist?list=PL123", "UNSUPPORTED_YOUTUBE_PATH"],
    ["https://www.youtube.com/clip/abc", "UNSUPPORTED_YOUTUBE_PATH"],
    ["https://www.youtube.com/search?q=test", "UNSUPPORTED_YOUTUBE_PATH"],
    ["https://www.youtube.com/results?search_query=test", "UNSUPPORTED_YOUTUBE_PATH"],
    [`https://example.com/watch?v=${VIDEO_ID}`, "UNSUPPORTED_YOUTUBE_HOST"],
    [`https://youtube.com.evil.example/watch?v=${VIDEO_ID}`, "UNSUPPORTED_YOUTUBE_HOST"],
    [`https://notyoutube.com/watch?v=${VIDEO_ID}`, "UNSUPPORTED_YOUTUBE_HOST"],
    [`https://studio.youtube.com/watch?v=${VIDEO_ID}`, "UNSUPPORTED_YOUTUBE_HOST"],
    ["javascript:alert(1)", "INVALID_YOUTUBE_REFERENCE"],
    [`ftp://youtube.com/watch?v=${VIDEO_ID}`, "INVALID_YOUTUBE_REFERENCE"],
    ["https://", "INVALID_YOUTUBE_REFERENCE"],
    ["https:youtube.com/watch", "INVALID_YOUTUBE_REFERENCE"],
    [`https://youtube.com\\watch?v=${VIDEO_ID}`, "INVALID_YOUTUBE_REFERENCE"],
    [`https://youtube.com/shorts/../watch?v=${VIDEO_ID}`, "INVALID_YOUTUBE_REFERENCE"],
    ["https://youtube-nocookie.com/watch?v=abc", "UNSUPPORTED_YOUTUBE_PATH"],
    [`https://youtu.be/${VIDEO_ID}%51`, "INVALID_VIDEO_ID"],
  ] as const)("rejects %s with %s", (input, code) => {
    expectErrorCode(input, code);
  });

  it("does not expose query parameters in an error message", () => {
    const error = captureError(() =>
      parseYouTubeVideoId("https://www.youtube.com/watch?v=bad&access_token=private-value"),
    );

    expect(error.code).toBe("INVALID_VIDEO_ID");
    expect(error.message).not.toContain("access_token");
    expect(error.message).not.toContain("private-value");
  });

  it("does not mutate or alter the caller's input string", () => {
    const input = `  https://www.youtube.com/watch?v=${SECOND_VIDEO_ID}#fragment  `;

    expect(parseYouTubeVideoId(input)).toBe(SECOND_VIDEO_ID);
    expect(input).toBe(`  https://www.youtube.com/watch?v=${SECOND_VIDEO_ID}#fragment  `);
  });
});
