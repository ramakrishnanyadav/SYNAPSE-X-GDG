import type { PlasmoCSConfig } from 'plasmo';
import { BaseMonitor, getMessages, detectContextPressure } from './shared/monitor';
import { Platform } from '../types/platform';
import { logger } from '../lib/logger';

export const config: PlasmoCSConfig = {
  matches: ['https://claude.ai/*'],
  all_frames: true
};

class ClaudeMonitor extends BaseMonitor {
  constructor() {
    super(Platform.CLAUDE);
  }

  protected setupObserver(): void {
    const targetNode = document.body;
    if (!targetNode) return;

    this.observer = new MutationObserver(() => {
      this.checkForNewConversation();
      this.onConversationUpdate();
    });

    this.observer.observe(targetNode, {
      childList: true,
      subtree: true
    });
  }

  private onConversationUpdate(): void {
    if (this.extractionDebounceTimer !== null) {
      window.clearTimeout(this.extractionDebounceTimer);
    }
    
    this.extractionDebounceTimer = window.setTimeout(async () => {
      // Priority 3: Abort extraction mid-stream
      const isStreaming = document.querySelector('div[data-is-streaming], .result-streaming');
      if (isStreaming) return;

      const messages = getMessages(this.platform);
      
      if (messages.length >= 2) {
        await this.triggerExtraction('conversation_update');
      }
    }, this.DOM_STABLE_WAIT_MS);
  }

  private checkForNewConversation(): void {
    if (window.location.pathname === '/new') {
      if (!sessionStorage.getItem('synapse_toast_shown')) {
        sessionStorage.setItem('synapse_toast_shown', 'true');
        chrome.runtime.sendMessage({
          type: 'NEW_SESSION_DETECTED',
          payload: { platform: this.platform }
        });
      }
    } else {
      sessionStorage.removeItem('synapse_toast_shown');
    }
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_INJECTION_TOAST') {
    import('./shared/injector').then(({ showInjectionToast }) => {
      showInjectionToast(message.payload.snapshot, message.payload.platform);
    });
  }
});

try {
  const monitor = new ClaudeMonitor();
  monitor.start();
} catch (error) {
  logger.debug(`Claude monitor init failed: ${error}`);
}
