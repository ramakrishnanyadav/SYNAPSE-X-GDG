import { CognitiveSnapshot } from '../types/snapshot';
import { PROMPTS } from '../lib/prompts';
import { logger } from '../lib/logger';
import { Platform } from '../types/platform';

export class ReconstructionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReconstructionError';
  }
}

export async function generateReconstructionBrief(snapshot: CognitiveSnapshot): Promise<string> {
  try {
    const relativeTime = getRelativeTimeString(snapshot.timestamp);
    let brief = PROMPTS.RECONSTRUCTION_TEMPLATE
      .replace('{PLATFORM}', formatPlatform(snapshot.platform))
      .replace('{RELATIVE_TIME}', relativeTime)
      .replace('{CURRENT_GOAL}', snapshot.current_goal);

    brief = brief.replace('{ACTIVE_TASKS}', formatList(snapshot.active_tasks, 'None'));
    brief = brief.replace('{BLOCKERS}', formatList(snapshot.blockers, 'None'));
    brief = brief.replace('{DECISIONS}', formatList(snapshot.decisions_made, 'None'));

    const MAX_BRIEF_CHARS = 2500;
    if (brief.length > MAX_BRIEF_CHARS) {
      brief = brief.substring(0, MAX_BRIEF_CHARS) + '\\n...[Truncated to meet platform limits]';
    }

    return brief;
  } catch (error) {
    logger.error('Failed to generate brief', { error });
    throw new ReconstructionError('Brief generation failed');
  }
}

function formatList(items: string[], emptyState: string): string {
  if (!items || items.length === 0) return \`- \${emptyState}\`;
  return items.map(item => \`- \${item}\`).join('\\n');
}

function formatPlatform(platform: Platform): string {
  const map: Record<Platform, string> = {
    [Platform.CLAUDE]: 'Claude',
    [Platform.CHATGPT]: 'ChatGPT',
    [Platform.GEMINI]: 'Gemini',
    [Platform.CURSOR]: 'Cursor'
  };
  return map[platform] || 'Unknown Platform';
}

function getRelativeTimeString(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return \`\${diffMins} minutes ago\`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return \`\${diffHours} hours ago\`;
  const diffDays = Math.floor(diffHours / 24);
  return \`\${diffDays} days ago\`;
}
