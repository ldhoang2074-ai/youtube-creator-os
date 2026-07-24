export type AudioTranscriptErrorCode =
  | "INVALID_AUDIO_FILE"
  | "UNSUPPORTED_AUDIO_FORMAT"
  | "AUDIO_FILE_TOO_LARGE"
  | "AUDIO_TRANSCRIPT_NOT_FOUND"
  | "AUDIO_TRANSCRIPTION_TIMEOUT"
  | "AUDIO_TRANSCRIPTION_PROVIDER_ERROR"
  | "INVALID_AUDIO_TRANSCRIPTION_RESPONSE"
  | "MISSING_AUDIO_TRANSCRIPTION_CONFIGURATION";

const AUDIO_TRANSCRIPT_ERROR_MESSAGES: Readonly<
  Record<AudioTranscriptErrorCode, string>
> = Object.freeze({
  INVALID_AUDIO_FILE: "A valid audio or video file is required",
  UNSUPPORTED_AUDIO_FORMAT: "The selected audio or video format is not supported",
  AUDIO_FILE_TOO_LARGE: "The selected file exceeds the maximum allowed size",
  AUDIO_TRANSCRIPT_NOT_FOUND: "No speech transcript was found in the selected file",
  AUDIO_TRANSCRIPTION_TIMEOUT: "Audio transcription request timed out",
  AUDIO_TRANSCRIPTION_PROVIDER_ERROR: "Audio transcription provider request failed",
  INVALID_AUDIO_TRANSCRIPTION_RESPONSE:
    "Audio transcription provider returned an invalid response",
  MISSING_AUDIO_TRANSCRIPTION_CONFIGURATION:
    "Audio transcription provider is not configured",
});

export class AudioTranscriptError extends Error {
  readonly code: AudioTranscriptErrorCode;

  constructor(code: AudioTranscriptErrorCode) {
    super(AUDIO_TRANSCRIPT_ERROR_MESSAGES[code]);
    this.name = "AudioTranscriptError";
    this.code = code;
  }
}
