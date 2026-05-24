import { Platform } from './platform';

export interface CognitiveSnapshot {
  snapshot_id: string;
  project_id: string;
  platform: Platform;
  account_identifier: string;
  timestamp: number;
  current_goal: string;
  active_tasks: string[];
  blockers: string[];
  decisions_made: string[];
  raw_context: string;
  confidence_score: number;
}

export interface ExtractionResult {
  current_goal: string;
  active_tasks: string[];
  blockers: string[];
  decisions_made: string[];
  confidence_score: number;
}
