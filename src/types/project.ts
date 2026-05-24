import { Platform } from './platform';

export interface Project {
  project_id: string;
  name: string;
  updated_at: number;
  snapshot_ids: string[];
  platform: Platform[];
}
