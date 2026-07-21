export type YoutubeErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_CHANNEL_FORMAT"
  | "CHANNEL_NOT_FOUND"
  | "MISSING_API_KEY"
  | "YOUTUBE_API_ERROR"
  | "QUOTA_EXCEEDED"
  | "INVALID_RESPONSE_SCHEMA"
  | "TIMEOUT";

export class YoutubeError extends Error {
  readonly code: YoutubeErrorCode;

  constructor(code: YoutubeErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "YoutubeError";
    this.code = code;
  }
}
