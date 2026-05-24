import { logger } from '../lib/logger';
import { initializeDatabase, saveSnapshot, getLatestSnapshot } from './storage';
import { smartExtract } from './extraction';
import { generateReconstructionBrief } from './reconstruction';
import { Platform } from '../types/platform';

initializeDatabase().catch(err => {
  logger.error('Failed to initialize DB on startup', { err });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRIGGER_EXTRACTION') {
    handleExtraction(message.payload).then(sendResponse);
    return true;
  }
  
  if (message.type === 'GET_LATEST_SNAPSHOT') {
    getLatestSnapshot().then(snapshot => {
      sendResponse({ snapshot });
    }).catch(error => {
      sendResponse({ error: String(error) });
    });
    return true;
  }
  
  if (message.type === 'GENERATE_AND_INJECT_BRIEF') {
    reconstructBrief(message.payload).then(sendResponse);
    return true;
  }
  
  if (message.type === 'NEW_SESSION_DETECTED') {
    handleNewSession(message.payload.platform, sender.tab?.id).then(sendResponse);
    return true;
  }
});

async function handleExtraction(payload: { messages: string[], platform: Platform, account_identifier: string }) {
  try {
    const { messages, platform, account_identifier } = payload;
    
    // In production, we'd pull the real API key from settings
    const dummyApiKey = 'sk-ant-dummy-key'; 
    
    const snapshot = await smartExtract(messages, platform, account_identifier, dummyApiKey);
    await saveSnapshot(snapshot);
    
    return { success: true, snapshot_id: snapshot.snapshot_id };
  } catch (error) {
    logger.error('Extraction pipeline failed', { error });
    return { success: false, error: String(error) };
  }
}

async function reconstructBrief(payload: { snapshot: any, platform: string }) {
  try {
    const brief = await generateReconstructionBrief(payload.snapshot);
    logger.info('Brief generated successfully', { briefPreview: brief.substring(0, 50) });
    return { success: true, brief };
  } catch (error) {
    logger.error('Brief generation failed', { error });
    return { success: false, error: String(error) };
  }
}

async function handleNewSession(platform: Platform, tabId?: number) {
  try {
    const latestSnapshot = await getLatestSnapshot();
    if (!latestSnapshot) return { success: false, reason: 'No snapshots found' };
    
    // Priority 1 - Confidence gating. Don't offer resume if the last snapshot was weak
    if (latestSnapshot.confidence_score < 0.5) {
      return { success: false, reason: 'Latest snapshot confidence too low for auto-resume' };
    }
    
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_INJECTION_TOAST',
        payload: { snapshot: latestSnapshot, platform }
      });
    }
    return { success: true };
  } catch (error) {
    logger.error('New session handling failed', { error });
    return { success: false, error: String(error) };
  }
}
