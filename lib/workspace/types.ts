import type { OpportunityFeedResult } from "../channel-analyzer/types";

export const WORKSPACE_SCHEMA_VERSION = 1;
export const MAX_SAVED_SESSIONS = 10;
export const MAX_SESSION_NAME_LENGTH = 80;

export interface SavedResearchSession {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly name: string;
  readonly savedAt: string;
  readonly inputs: readonly string[];
  readonly result: OpportunityFeedResult;
}
