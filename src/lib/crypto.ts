import { logger } from './logger';

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = await chrome.storage.local.get('synapse_key');
  
  if (stored.synapse_key) {
    return await crypto.subtle.importKey(
      'raw',
      base64ToBuffer(stored.synapse_key),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const exported = await crypto.subtle.exportKey('raw', key);
  await chrome.storage.local.set({ 
    synapse_key: bufferToBase64(exported) 
  });
  
  return key;
}

export async function encrypt(text: string, key: CryptoKey): Promise<{ ciphertext: string, iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv.buffer)
  };
}

export async function decrypt(encrypted: { ciphertext: string, iv: string }, key: CryptoKey): Promise<string> {
  const iv = new Uint8Array(base64ToBuffer(encrypted.iv));
  const ciphertext = base64ToBuffer(encrypted.ciphertext);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(decryptedBuffer);
}

export async function verifyStorageIntegrity(): Promise<boolean> {
  try {
    const key = await getOrCreateKey();
    const testData = 'synapse_integrity_check';
    const encrypted = await encrypt(testData, key);
    const decrypted = await decrypt(encrypted, key);
    return decrypted === testData;
  } catch (err) {
    logger.warn('Storage integrity check failed', { err });
    await chrome.storage.local.remove('synapse_key');
    await getOrCreateKey();
    return false;
  }
}

export function generateSessionFingerprint(): string {
  const signals = [
    window.location.hostname,
    navigator.language,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    document.querySelector('[data-user-id]')?.getAttribute('data-user-id') ?? '',
    document.querySelector('meta[name="user"]')?.getAttribute('content') ?? ''
  ];
  return btoa(signals.join('|')).slice(0, 16);
}
