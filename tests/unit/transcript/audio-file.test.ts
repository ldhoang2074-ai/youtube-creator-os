import { describe, expect, it } from "vitest";

import {
  MAX_AUDIO_FILE_BYTES,
  validateAudioFile,
} from "@/lib/transcript/audio-file";
import { AudioTranscriptError } from "@/lib/transcript/audio-errors";

function expectAudioError(action: () => unknown, code: string): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AudioTranscriptError);
    expect((error as AudioTranscriptError).code).toBe(code);
    return;
  }

  throw new Error("Expected AudioTranscriptError");
}

describe("validateAudioFile", () => {
  it.each([
    "sample.flac",
    "sample.mp3",
    "sample.mp4",
    "sample.mpeg",
    "sample.mpga",
    "sample.m4a",
    "sample.ogg",
    "sample.wav",
    "sample.webm",
  ])("accepts supported file %s", (name) => {
    const file = new File(["audio"], name);

    expect(validateAudioFile(file)).toBe(file);
  });

  it("accepts uppercase extensions", () => {
    const file = new File(["audio"], "VOICE.MP3");

    expect(validateAudioFile(file)).toBe(file);
  });

  it("accepts a file exactly at the size limit", () => {
    const file = new File(
      [new Uint8Array(MAX_AUDIO_FILE_BYTES)],
      "sample.mp3",
    );

    expect(validateAudioFile(file)).toBe(file);
  });

  it("rejects a missing file", () => {
    expectAudioError(
      () => validateAudioFile(null),
      "INVALID_AUDIO_FILE",
    );
  });

  it("rejects an empty file", () => {
    expectAudioError(
      () => validateAudioFile(new File([], "sample.mp3")),
      "INVALID_AUDIO_FILE",
    );
  });

  it("rejects unsupported extensions", () => {
    expectAudioError(
      () => validateAudioFile(new File(["text"], "sample.txt")),
      "UNSUPPORTED_AUDIO_FORMAT",
    );
  });

  it("rejects a file larger than the size limit", () => {
    const file = new File(
      [new Uint8Array(MAX_AUDIO_FILE_BYTES + 1)],
      "sample.mp3",
    );

    expectAudioError(
      () => validateAudioFile(file),
      "AUDIO_FILE_TOO_LARGE",
    );
  });
});
