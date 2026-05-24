import type { PlasmoCSConfig } from 'plasmo';
import { BaseMonitor, getMessages, detectContextPressure } from './shared/monitor';
import { Platform } from '../types/platform';
import { logger } from '../lib/logger';
import { showInjectionToast } from './shared/injector';

export const config: PlasmoCSConfig = {
  matches: ['https://gemini.google.com/*'],
  all_frames: true
};

class GeminiMonitor extends BaseMonitor {
  constructor() {
    super(Platform.GEMINI);
  }

  protected setupObserver(): void {
    const targetNode = document.body;
    if (!targetNode) return;

    this.observer = new MutationObserver(() => {
      this.checkForNewConversation();
      this.onConversationUpdate();
    });

    this.observer.observe(targetNode, { childList: true, subtree: true });
  }

  private onConversationUpdate(): void {
    if (this.extractionDebounceTimer !== null) {
      window.clearTimeout(this.extractionDebounceTimer);
    }
    
    // Debounce extraction by 2000ms to allow streaming to finish
    this.extractionDebounceTimer = window.setTimeout(async () => {
      try {
        const messages = getMessages(this.platform);
        
        // Trigger extraction if we have at least 2 messages
        if (messages.length >= 2) {
          await this.triggerExtraction('conversation_update');
        }
      } catch (error) {
        logger.debug(`Extraction trigger failed silently: ${error}`);
      }
    }, 2000);
  }

  private checkForNewConversation(): void {
    try {
      // Gemini's default URL is /app, specific chats have /app/[id]
      if (window.location.pathname === '/' || window.location.pathname === '/app') {
        if (!sessionStorage.getItem('synapse_toast_shown')) {
          sessionStorage.setItem('synapse_toast_shown', 'true');
          chrome.runtime.sendMessage({
            type: 'NEW_SESSION_DETECTED',
            payload: { platform: this.platform }
          }).catch(() => {
            // Rule 11: Content scripts fail silently
          });
        }
      } else {
        sessionStorage.removeItem('synapse_toast_shown');
      }
    } catch (error) {
      logger.debug(`New session check failed silently: ${error}`);
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_INJECTION_TOAST') {
    try {
      showInjectionToast(message.payload.snapshot, message.payload.platform);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: String(error) });
    }
    return true; // Rule 18: Message bus: always return true for async listeners
  }
});

try {
  const monitor = new GeminiMonitor();
  monitor.start();
} catch (error) {
  logger.debug(`Gemini monitor init failed: ${error}`);
}
