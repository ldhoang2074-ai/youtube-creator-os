export type TranscriptErrorCode =
  | "TRANSCRIPT_NOT_FOUND"
  | "TRANSCRIPT_UNAVAILABLE"
  | "TRANSCRIPT_PROVIDER_TIMEOUT"
  | "TRANSCRIPT_PROVIDER_ERROR"
  | "INVALID_PROVIDER_RESPONSE"
  | "MISSING_TRANSCRIPT_PROVIDER_CONFIGURATION";

const TRANSCRIPT_ERROR_MESSAGES: Readonly<Record<TranscriptErrorCode, string>> = Object.freeze({
  TRANSCRIPT_NOT_FOUND: "Transcript was not found for this video",
  TRANSCRIPT_UNAVAILABLE: "Transcript is unavailable for this video",
  TRANSCRIPT_PROVIDER_TIMEOUT: "Transcript provider request timed out",
  TRANSCRIPT_PROVIDER_ERROR: "Transcript provider request failed",
  INVALID_PROVIDER_RESPONSE: "Transcript provider returned an invalid response",
  MISSING_TRANSCRIPT_PROVIDER_CONFIGURATION: "Transcript provider is not configured",
});

export class TranscriptError extends Error {
  readonly code: TranscriptErrorCode;

  constructor(code: TranscriptErrorCode) {
    super(TRANSCRIPT_ERROR_MESSAGES[code]);
    this.name = "TranscriptError";
    this.code = code;
  }
}
