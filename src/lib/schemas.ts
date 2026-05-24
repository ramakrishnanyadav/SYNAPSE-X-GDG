import { z } from 'zod';
import { Platform } from '../types/platform';

export const ExtractionResultSchema = z.object({
  current_goal: z.string(),
  active_tasks: z.array(z.string()).max(3),
  blockers: z.array(z.string()).max(2),
  decisions_made: z.array(z.string()).max(3),
  confidence_score: z.number().min(0).max(1)
});

export const CognitiveSnapshotSchema = z.object({
  snapshot_id: z.string().uuid(),
  project_id: z.string(),
  platform: z.nativeEnum(Platform),
  account_identifier: z.string(),
  timestamp: z.number().positive(),
  current_goal: z.string().max(200),
  active_tasks: z.array(z.string().max(100)).max(3),
  blockers: z.array(z.string().max(100)).max(2),
  decisions_made: z.array(z.string().max(100)).max(3),
  raw_context: z.string(),
  confidence_score: z.number().min(0).max(1)
});

export const ProjectSchema = z.object({
  project_id: z.string(),
  name: z.string(),
  created_at: z.number(),
  last_active_at: z.number(),
  total_snapshots: z.number()
});
