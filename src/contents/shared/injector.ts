import { CognitiveSnapshot } from '../../types/snapshot';
import { TOAST_CONFIG } from '../../lib/constants';
import { logger } from '../../lib/logger';

import { INPUT_SELECTORS } from '../../lib/constants';

export function injectBrief(snapshot: CognitiveSnapshot, platform: string): void {
  chrome.runtime.sendMessage({
    type: 'GENERATE_AND_INJECT_BRIEF',
    payload: { snapshot, platform }
  }, (response) => {
    if (response?.success && response.brief) {
      const selector = INPUT_SELECTORS[platform as keyof typeof INPUT_SELECTORS];
      const inputBox = document.querySelector(selector) as HTMLElement | HTMLTextAreaElement | HTMLInputElement;
      
      if (!inputBox) {
        logger.error('Input box not found for injection');
        return;
      }
      
      try {
        if ('value' in inputBox) {
          if (typeof inputBox.value === 'string' && inputBox.value.trim().length > 0) {
            logger.info('Aborting injection: User already typing');
            return;
          }
          // It's a textarea or input
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
          )?.set;
          
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(inputBox, response.brief);
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            inputBox.value = response.brief;
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else if (inputBox.isContentEditable) {
          if (inputBox.innerText.trim().length > 0) {
            logger.info('Aborting injection: User already typing in contenteditable');
            return;
          }
          
          inputBox.focus();
          // Use execCommand for React-safe contenteditable insertion
          const success = document.execCommand('insertText', false, response.brief);
          
          if (!success) {
            // Fallback for newer browsers that deprecate execCommand
            inputBox.innerText = response.brief;
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
            inputBox.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      } catch (error) {
        logger.error('Injection failed', { error });
      }
    }
  });
}

export function showInjectionToast(snapshot: CognitiveSnapshot, platform: string): void {
  try {
    const existingToast = document.getElementById('synapse-preview-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'synapse-preview-toast';
    toast.innerHTML = `
      <style>
        @keyframes synapse-slide-in {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      </style>
      <div style="
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #1a1a1a;
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        font-family: sans-serif;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        max-width: 320px;
        animation: synapse-slide-in 0.3s ease-out forwards;
      ">
        <div style="font-weight:600;margin-bottom:8px">
          ⚡ SYNAPSE — Resume Session?
        </div>
        <div style="font-size:12px;opacity:0.6;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;">
          ${snapshot.decisions_made[0] ?? 'Previous session detected'}
        </div>
        <div style="opacity:0.8;margin-bottom:12px;font-size:13px;line-height:1.4">
          ${snapshot.current_goal}
        </div>
        <div style="display:flex;gap:8px">
          <button id="synapse-inject" style="
            background:#6366f1;border:none;color:white;
            padding:8px 16px;border-radius:8px;cursor:pointer;
            font-size:13px;font-weight:500;
            transition: background 0.2s;
          " onmouseover="this.style.background='#4f46e5'" onmouseout="this.style.background='#6366f1'">Continue →</button>
          <button id="synapse-dismiss" style="
            background:transparent;border:1px solid #444;color:white;
            padding:8px 16px;border-radius:8px;cursor:pointer;
            font-size:13px;
            transition: background 0.2s;
          " onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'">Dismiss</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    const injectBtn = document.getElementById('synapse-inject');
    const dismissBtn = document.getElementById('synapse-dismiss');
    
    let timerId = window.setTimeout(() => toast.remove(), TOAST_CONFIG.AUTO_DISMISS_MS);

    injectBtn?.addEventListener('click', () => {
      window.clearTimeout(timerId);
      injectBrief(snapshot, platform);
      toast.remove();
    });
    
    dismissBtn?.addEventListener('click', () => {
      window.clearTimeout(timerId);
      toast.remove();
    });
  } catch (error) {
    logger.debug(`Failed to show injection toast: ${error}`);
  }
}
