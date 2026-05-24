import { Platform } from '../types/platform';

export const DOM_SELECTORS = {
  claude: [
    '[data-testid="conversation-turn"]',
    '[class*="ConversationTurn"]',
    '.font-claude-message',
    'div[data-is-streaming]',
    '.prose'
  ],
  chatgpt: [
    '[data-message-author-role]',
    '[class*="ConversationItem"]',
    '.markdown',
    '[class*="message"]'
  ],
  gemini: [
    '.conversation-container .turn',
    '.message-content',
    'div[data-message-author]'
  ]
} as const;

export const INPUT_SELECTORS = {
  claude: 'div[contenteditable="true"], textarea',
  chatgpt: '#prompt-textarea, textarea',
  gemini: '.ql-editor, textarea'
} as const;

export const CONTEXT_WARNING_SIGNALS = {
  claude: [
    "your conversation is getting long",
    "consider starting a new conversation",
    "i may not be able to",
    "context limit",
    "i'm having trouble remembering"
  ],
  chatgpt: [
    "conversation is too long",
    "start a new chat",
    "i cannot process",
    "context length"
  ],
  gemini: [
    "conversation is getting too long",
    "start a new chat"
  ]
} as const;

export const EXTRACTION_CONFIG = {
  LOCAL_CONFIDENCE_THRESHOLD: 0.7,
  MAX_MESSAGES_TO_EXTRACT: 20,
  API_TIMEOUT_MS: 3000,
  API_RETRY_COUNT: 2,
  RATE_LIMIT_RETRY_DELAY_MS: 30000,
  DEMO_FALLBACK_ENABLED: true
} as const;

export const STORAGE_CONFIG = {
  DB_NAME: 'synapse',
  DB_VERSION: 1,
  STORE_NAME: 'snapshots'
} as const;

export const TOAST_CONFIG = {
  AUTO_DISMISS_MS: 10000,
  POSITION: 'bottom-right'
} as const;

export const DEMO_FALLBACK_SNAPSHOT = {
  snapshot_id: 'demo-fallback-001',
  project_id: 'demo-project',
  platform: Platform.CLAUDE,
  account_identifier: 'demo-hash',
  timestamp: Date.now(),
  current_goal: 'Building JWT authentication middleware for Express API',
  active_tasks: [
    'Implement token refresh endpoint with mutex lock',
    'Add role-based middleware for admin routes'
  ],
  blockers: [
    'Race condition on concurrent refresh requests'
  ],
  decisions_made: [
    'RS256 chosen over HS256 for asymmetric key security',
    'Refresh token stored in httpOnly cookie not localStorage',
    'Access token expiry set to 15 minutes'
  ],
  raw_context: 'Stored via fallback',
  confidence_score: 0.95
};
