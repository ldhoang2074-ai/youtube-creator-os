import type {
    TranscriptChunk,
    TranscriptDocument,
    TranscriptSegment,
} from "./types";

export interface ChunkTranscriptOptions {
    readonly maxCharacters: number;
}

export type TranscriptChunkingErrorCode = "INVALID_MAX_CHARACTERS";

export class TranscriptChunkingError extends Error {
    readonly code: TranscriptChunkingErrorCode;

    constructor(code: TranscriptChunkingErrorCode, message: string) {
        super(message);
        this.name = "TranscriptChunkingError";
        this.code = code;
    }
}

function validateMaxCharacters(maxCharacters: number): void {
    if (!Number.isSafeInteger(maxCharacters) || maxCharacters <= 0) {
        throw new TranscriptChunkingError(
            "INVALID_MAX_CHARACTERS",
            "maxCharacters must be a positive safe integer",
        );
    }
}

function copyAndFreezeSegment(segment: TranscriptSegment): TranscriptSegment {
    return Object.freeze({
        index: segment.index,
        startSeconds: segment.startSeconds,
        durationSeconds: segment.durationSeconds,
        text: segment.text,
    });
}

function createChunk(
    index: number,
    sourceSegments: readonly TranscriptSegment[],
): TranscriptChunk {
    const segments = Object.freeze(sourceSegments.map(copyAndFreezeSegment));
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    if (firstSegment === undefined || lastSegment === undefined) {
        throw new Error("Cannot create an empty transcript chunk");
    }

    const text = segments.map((segment) => segment.text).join("\n");
    let endSeconds = firstSegment.startSeconds + firstSegment.durationSeconds;

    for (const segment of segments) {
        endSeconds = Math.max(
            endSeconds,
            segment.startSeconds + segment.durationSeconds,
        );
    }

    return Object.freeze({
        index,
        startSegmentIndex: firstSegment.index,
        endSegmentIndex: lastSegment.index,
        startSeconds: firstSegment.startSeconds,
        endSeconds,
        characterCount: text.length,
        text,
        segments,
    });
}

export function chunkTranscript(
    document: TranscriptDocument,
    options: ChunkTranscriptOptions,
): readonly TranscriptChunk[] {
    validateMaxCharacters(options.maxCharacters);

    if (document.segments.length === 0) {
        const emptyChunks: TranscriptChunk[] = [];
        return Object.freeze(emptyChunks);
    }

    const chunks: TranscriptChunk[] = [];
    let currentSegments: TranscriptSegment[] = [];
    let currentCharacterCount = 0;

    for (const segment of document.segments) {
        const separatorLength = currentSegments.length === 0 ? 0 : 1;
        const nextCharacterCount =
            currentCharacterCount + separatorLength + segment.text.length;

        if (
            currentSegments.length > 0 &&
            nextCharacterCount > options.maxCharacters
        ) {
            chunks.push(createChunk(chunks.length, currentSegments));
            currentSegments = [segment];
            currentCharacterCount = segment.text.length;
            continue;
        }

        currentSegments.push(segment);
        currentCharacterCount = nextCharacterCount;
    }

    if (currentSegments.length > 0) {
        chunks.push(createChunk(chunks.length, currentSegments));
    }

    return Object.freeze(chunks);
}
