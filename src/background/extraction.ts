import { CognitiveSnapshot, ExtractionResult } from '../types/snapshot';
import { ExtractionResultSchema } from '../lib/schemas';
import { EXTRACTION_CONFIG, DEMO_FALLBACK_SNAPSHOT } from '../lib/constants';
import { logger } from '../lib/logger';
import { PROMPTS } from '../lib/prompts';
import { Platform } from '../types/platform';

export class ExtractionError extends Error {
  constructor(message: string, public readonly isRateLimit: boolean = false) {
    super(message);
    this.name = 'ExtractionError';
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function isNaturalLanguage(line: string): boolean {
  const codeSignals = ['{', '}', '=>', '===', '!==', '++', '//', '/*'];
  return !codeSignals.some(signal => line.includes(signal));
}

function extractFirstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    pattern.lastIndex = 0; // reset
    const match = pattern.exec(text);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

function extractAllMatches(text: string, patterns: RegExp[]): string[] {
  const results = new Set<string>();
  for (const pattern of patterns) {
    pattern.lastIndex = 0; // reset
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) results.add(match[1].trim());
    }
  }
  return Array.from(results);
}

function calculateConfidence(goal: string, decisions: string[], blockers: string[]): number {
  if (!goal) return 0.2;
  let score = 0.5; // Has a goal
  if (decisions.length > 0) score += 0.2;
  if (decisions.length > 1) score += 0.1;
  if (blockers.length > 0) score += 0.2;
  return Math.min(score, 1.0);
}

export function extractLocally(messages: string[], platform: Platform, account_identifier: string): CognitiveSnapshot {
  const naturalLines = messages
    .join('\\n')
    .split('\\n')
    .filter(isNaturalLanguage)
    .join('\\n')
    .toLowerCase();
    
  const GOAL_PATTERNS = [
    /(?:building|creating|implementing|fixing|working on)\\s+(?!.*[{};])([\\w\\s]+?)(?:\\.|,|\\n|$)/gi,
    /(?:i need to|i want to|i'm trying to|trying to)\\s+(?!.*[{};])([\\w\\s]+?)(?:\\.|,|\\n|$)/gi,
    /(?:the goal is|my goal is)\\s+(?!.*[{};])([\\w\\s]+?)(?:\\.|,|\\n|$)/gi
  ];
  
  const DECISION_PATTERNS = [
    /(?:i'll use|using|decided to use|going with)\\s+(?!.*[{};])([\\w\\s]+?)(?:\\.|,|\\n|$)/gi,
    /(?:instead of|rather than|over)\\s+(?!.*[{};])([\\w\\s]+?)(?:\\.|,|\\n|$)/gi
  ];
  
  const BLOCKER_PATTERNS = [
    /(?:error|issue|problem|bug|failing|broken|not working)\\s*:?\\s*(?!.*[{};])([\\w\\s]+?)(?:\\.|,|\\n|$)/gi,
    /(?:stuck on|blocked by|can't figure out)\\s+(?!.*[{};])([\\w\\s]+?)(?:\\.|,|\\n|$)/gi
  ];
  
  const goal = extractFirstMatch(naturalLines, GOAL_PATTERNS);
  const decisions = extractAllMatches(naturalLines, DECISION_PATTERNS).slice(0, 3);
  const blockers = extractAllMatches(naturalLines, BLOCKER_PATTERNS).slice(0, 2);
  
  const confidence = calculateConfidence(goal, decisions, blockers);
  
  return {
    snapshot_id: crypto.randomUUID(),
    current_goal: goal || 'Unknown goal',
    active_tasks: [],
    blockers,
    decisions_made: decisions,
    confidence_score: confidence,
    timestamp: Date.now(),
    platform,
    project_id: '', // Will be inferred during save
    account_identifier,
    raw_context: 'Stored via local extraction'
  };
}

export async function smartExtract(
  messages: string[], 
  platform: Platform, 
  account_identifier: string,
  apiKey: string
): Promise<CognitiveSnapshot> {
  // TIER 1 - Local extraction
  const localSnapshot = extractLocally(messages, platform, account_identifier);
  
  if (localSnapshot.confidence_score > EXTRACTION_CONFIG.LOCAL_CONFIDENCE_THRESHOLD) {
    logger.info('Using local extraction', { confidence: localSnapshot.confidence_score });
    return localSnapshot;
  }
  
  // TIER 2 - Claude API Extraction with Timeout Fallback
  logger.info('Local extraction insufficient, calling API');
  const context = messages.slice(-EXTRACTION_CONFIG.MAX_MESSAGES_TO_EXTRACT).join('\\n\\n');
  
  const timeoutPromise = new Promise<CognitiveSnapshot>((resolve) => {
    setTimeout(() => {
      logger.info('API timeout exceeded, using demo fallback snapshot');
      resolve({
        ...DEMO_FALLBACK_SNAPSHOT,
        snapshot_id: crypto.randomUUID(),
        platform,
        account_identifier
      } as CognitiveSnapshot);
    }, EXTRACTION_CONFIG.API_TIMEOUT_MS);
  });
  
  const extractionPromise = extractWithClaude(context, apiKey).then(apiResult => {
    if (typeof apiResult === 'string') {
      return {
        ...localSnapshot,
        raw_context: apiResult,
        confidence_score: 0.2
      };
    }
    
    return {
      snapshot_id: crypto.randomUUID(),
      current_goal: apiResult.current_goal,
      active_tasks: apiResult.active_tasks,
      blockers: apiResult.blockers,
      decisions_made: apiResult.decisions_made,
      confidence_score: apiResult.confidence_score,
      timestamp: Date.now(),
      platform,
      project_id: '',
      account_identifier,
      raw_context: 'Stored via API extraction'
    };
  }).catch(error => {
    logger.error('Extraction promise failed', { error });
    // In case of immediate rejection, fallback anyway
    return {
      ...DEMO_FALLBACK_SNAPSHOT,
      snapshot_id: crypto.randomUUID(),
      platform,
      account_identifier
    } as CognitiveSnapshot;
  });
  
  return Promise.race([extractionPromise, timeoutPromise]);
}

async function extractWithClaude(
  context: string,
  apiKey: string,
  retryCount = 0
): Promise<ExtractionResult | string> {
  const userPrompt = PROMPTS.EXTRACTION_USER.replace('{CONTEXT}', context);
  
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: PROMPTS.EXTRACTION_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }]
    })
  }, EXTRACTION_CONFIG.API_TIMEOUT_MS + 5000); // Allow fetch to run slightly longer than the Promise.race timeout
  
  if (response.status === 429) {
    if (retryCount >= EXTRACTION_CONFIG.API_RETRY_COUNT) {
      throw new ExtractionError('Rate limit exceeded', true);
    }
    await new Promise(resolve => setTimeout(resolve, EXTRACTION_CONFIG.RATE_LIMIT_RETRY_DELAY_MS));
    return extractWithClaude(context, apiKey, retryCount + 1);
  }
  
  if (!response.ok) {
    throw new ExtractionError(\`API Error: \${response.statusText}\`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  
  try {
    const json = JSON.parse(content);
    return ExtractionResultSchema.parse(json);
  } catch (parseError) {
    logger.warn('Malformed JSON from API', { parseError });
    if (retryCount === 0) {
      return extractWithClaude(context, apiKey, 1);
    }
    return context;
  }
}
