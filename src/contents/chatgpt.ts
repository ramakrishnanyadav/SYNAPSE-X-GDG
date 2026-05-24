import type { PlasmoCSConfig } from 'plasmo';
import { BaseMonitor, getMessages, detectContextPressure } from './shared/monitor';
import { Platform } from '../types/platform';
import { logger } from '../lib/logger';
import { showInjectionToast } from './shared/injector';

export const config: PlasmoCSConfig = {
  matches: ['https://chatgpt.com/*'],
  all_frames: true
};

class ChatgptMonitor extends BaseMonitor {
  constructor() {
    super(Platform.CHATGPT);
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
    
    this.extractionDebounceTimer = window.setTimeout(async () => {
      // Priority 3: Abort extraction mid-stream
      const isStreaming = document.querySelector('.result-streaming');
      if (isStreaming) return;

      const messages = getMessages(this.platform);
      const pressure = detectContextPressure(messages, this.platform);
      
      if (pressure > 0.8) {
        await this.triggerExtraction('context_pressure');
      }
    }, this.DOM_STABLE_WAIT_MS);
  }

  private checkForNewConversation(): void {
    if (window.location.pathname.startsWith('/c/new')) {
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
    showInjectionToast(message.payload.snapshot, message.payload.platform);
  }
});

try {
  const monitor = new ChatgptMonitor();
  monitor.start();
} catch (error) {
  logger.debug(\`ChatGPT monitor init failed: \${error}\`);
}
