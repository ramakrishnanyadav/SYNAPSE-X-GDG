import { logger } from '../../lib/logger';
import { DOM_SELECTORS, CONTEXT_WARNING_SIGNALS } from '../../lib/constants';
import { Platform } from '../../types/platform';

const selectorCache = new Map<Platform, string>();

export function getMessages(platform: Platform): string[] {
  const cached = selectorCache.get(platform);
  
  if (cached) {
    const elements = document.querySelectorAll(cached);
    if (elements.length > 0) {
      return Array.from(elements).map(el => el.textContent ?? '');
    }
    selectorCache.delete(platform);
  }
  
  const selectors = DOM_SELECTORS[platform] as readonly string[];
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      selectorCache.set(platform, selector);
      return Array.from(elements).map(el => el.textContent ?? '');
    }
  }
  
  const nuclear = Array.from(document.querySelectorAll('p, pre, code'))
    .filter(el => (el.textContent?.length ?? 0) > 50)
    .map(el => el.textContent ?? '');
    
  return nuclear;
}

export function detectContextPressure(messages: string[], platform: Platform): number {
  if (messages.length === 0) return 0;
  
  const recentText = messages.slice(-5).join(' ').toLowerCase();
  const signals = CONTEXT_WARNING_SIGNALS[platform] as readonly string[];
  
  const phraseMatch = signals.some(s => recentText.includes(s));
  if (phraseMatch) return 0.95;
  
  const messageCountPressure = Math.min(messages.length / 80, 1);
  return Math.max(0, messageCountPressure * 0.4);
}

export abstract class BaseMonitor {
  protected observer: MutationObserver | null = null;
  private inactivityTimer: number | null = null;
  protected extractionDebounceTimer: number | null = null;

  constructor(protected platform: Platform) {}

  public start(): void {
    try {
      this.setupObserver();
      this.setupEventListeners();
      this.resetInactivityTimer();
      logger.info(`Started monitor for ${this.platform}`);
    } catch (error) {
      logger.debug(`Monitor start failed silently: ${error}`);
    }
  }

  public stop(): void {
    try {
      if (this.observer) this.observer.disconnect();
      this.removeEventListeners();
      if (this.inactivityTimer !== null) window.clearTimeout(this.inactivityTimer);
      if (this.extractionDebounceTimer !== null) window.clearTimeout(this.extractionDebounceTimer);
      logger.info(`Stopped monitor for ${this.platform}`);
    } catch (error) {
      logger.debug(`Monitor stop failed silently: ${error}`);
    }
  }

  protected abstract setupObserver(): void;

  private setupEventListeners(): void {
    window.addEventListener('beforeunload', this.handleUnload);
    document.addEventListener('mousemove', this.resetInactivityTimer);
    document.addEventListener('keypress', this.resetInactivityTimer);
  }

  private removeEventListeners(): void {
    window.removeEventListener('beforeunload', this.handleUnload);
    document.removeEventListener('mousemove', this.resetInactivityTimer);
    document.removeEventListener('keypress', this.resetInactivityTimer);
  }

  private handleUnload = (): void => {
    this.triggerExtraction('unload');
  };

  private resetInactivityTimer = (): void => {
    if (this.inactivityTimer !== null) window.clearTimeout(this.inactivityTimer);
    this.inactivityTimer = window.setTimeout(() => {
      this.triggerExtraction('inactivity');
    }, 5 * 60 * 1000);
  };

  private lastExtractionTime: number = 0;
  private readonly EXTRACTION_COOLDOWN_MS = 15000;
  protected readonly DOM_STABLE_WAIT_MS = 800;

  protected async triggerExtraction(reason: string): Promise<void> {
    const now = Date.now();
    if (now - this.lastExtractionTime < this.EXTRACTION_COOLDOWN_MS) {
      return; // Prevent extraction storms
    }

    try {
      const messages = getMessages(this.platform);
      if (messages.length === 0) return;

      this.lastExtractionTime = now;

      // Priority 5 UX - Show smooth capturing state
      const toast = document.createElement('div');
      toast.innerHTML = `<div style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:8px 16px;border-radius:20px;font-size:12px;font-family:sans-serif;z-index:999999;opacity:0.9;box-shadow:0 4px 12px rgba(0,0,0,0.2);">🧠 Capturing cognitive state...</div>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      import('../../lib/crypto').then(({ generateSessionFingerprint }) => {
        chrome.runtime.sendMessage({
          type: 'TRIGGER_EXTRACTION',
          payload: {
            platform: this.platform,
            reason,
            messages: messages.slice(-20),
            account_identifier: generateSessionFingerprint()
          }
        });
      });
    } catch (error) {
      logger.debug(`Extraction trigger failed silently: ${error}`);
    }
  }
}
