import { AudioTranscriptError } from "@/lib/transcript/audio-errors";

export const MAX_AUDIO_FILE_BYTES = 25 * 1024 * 1024;

const SUPPORTED_AUDIO_FILE_EXTENSIONS: ReadonlySet<string> = new Set([
  "flac",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "ogg",
  "wav",
  "webm",
]);

function getFileExtension(fileName: string): string | null {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return null;
  }

  return fileName.slice(lastDotIndex + 1).toLowerCase();
}

export function validateAudioFile(value: unknown): File {
  if (!(value instanceof File) || value.size === 0) {
    throw new AudioTranscriptError("INVALID_AUDIO_FILE");
  }

  if (value.size > MAX_AUDIO_FILE_BYTES) {
    throw new AudioTranscriptError("AUDIO_FILE_TOO_LARGE");
  }

  const extension = getFileExtension(value.name.trim());

  if (
    extension === null ||
    !SUPPORTED_AUDIO_FILE_EXTENSIONS.has(extension)
  ) {
    throw new AudioTranscriptError("UNSUPPORTED_AUDIO_FORMAT");
  }

  return value;
}
