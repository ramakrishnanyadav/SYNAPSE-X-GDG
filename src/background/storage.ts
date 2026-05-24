import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CognitiveSnapshot } from '../types/snapshot';
import { CognitiveSnapshotSchema } from '../lib/schemas';
import { STORAGE_CONFIG } from '../lib/constants';
import { logger } from '../lib/logger';
import { encrypt, decrypt, getOrCreateKey, verifyStorageIntegrity } from '../lib/crypto';

interface EncryptedSnapshotRecord {
  snapshot_id: string;
  project_id: string;
  timestamp: number;
  data: { ciphertext: string; iv: string };
}

interface SynapseDB extends DBSchema {
  snapshots: {
    key: string;
    value: EncryptedSnapshotRecord;
    indexes: {
      'by-timestamp': number;
      'by-project': string;
    };
  };
}

let db: IDBPDatabase<SynapseDB> | null = null;

export class StorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    const isIntact = await verifyStorageIntegrity();
    if (!isIntact) {
      logger.warn('Storage integrity failed. Database will be reset to prevent decryption errors.');
      await clearAllSnapshots();
    }
    await getDB();
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed', { error });
    throw new StorageError('Database initialization failed', error);
  }
}

async function getDB(): Promise<IDBPDatabase<SynapseDB>> {
  if (db) return db;
  db = await openDB<SynapseDB>(STORAGE_CONFIG.DB_NAME, STORAGE_CONFIG.DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_NAME)) {
        const store = db.createObjectStore(STORAGE_CONFIG.STORE_NAME, {
          keyPath: 'snapshot_id'
        });
        store.createIndex('by-timestamp', 'timestamp');
        store.createIndex('by-project', 'project_id');
      }
    }
  });
  return db;
}

export async function clearAllSnapshots(): Promise<void> {
  try {
    const database = await getDB();
    await database.clear(STORAGE_CONFIG.STORE_NAME);
    logger.info('All snapshots cleared.');
  } catch (err) {
    logger.error('Failed to clear snapshots', { err });
  }
}

export async function saveSnapshot(snapshot: CognitiveSnapshot): Promise<void> {
  try {
    const validated = CognitiveSnapshotSchema.parse(snapshot);
    const key = await getOrCreateKey();
    
    // Auto-infer project ID if not set
    if (!validated.project_id) {
      validated.project_id = await inferProjectId(validated);
    }
    
    const encryptedData = await encrypt(JSON.stringify(validated), key);
    
    const record: EncryptedSnapshotRecord = {
      snapshot_id: validated.snapshot_id,
      project_id: validated.project_id,
      timestamp: validated.timestamp,
      data: encryptedData
    };

    const database = await getDB();
    await database.put(STORAGE_CONFIG.STORE_NAME, record);
    logger.info('Snapshot saved successfully', { id: validated.snapshot_id });
  } catch (error) {
    logger.error('Failed to save snapshot', { error });
    throw new StorageError('Failed to save snapshot', error);
  }
}

export async function getLatestSnapshot(projectId?: string): Promise<CognitiveSnapshot | null> {
  try {
    const database = await getDB();
    const key = await getOrCreateKey();
    let records: EncryptedSnapshotRecord[] = [];
    
    if (projectId) {
      records = await database.getAllFromIndex(STORAGE_CONFIG.STORE_NAME, 'by-project', projectId);
    } else {
      records = await database.getAllFromIndex(STORAGE_CONFIG.STORE_NAME, 'by-timestamp');
    }
    
    if (!records || records.length === 0) return null;
    
    // Sort by timestamp just in case index return order isn't strictly guaranteed
    records.sort((a, b) => a.timestamp - b.timestamp);
    const latestRecord = records[records.length - 1];
    
    const decryptedJson = await decrypt(latestRecord.data, key);
    const snapshot = JSON.parse(decryptedJson);
    return CognitiveSnapshotSchema.parse(snapshot);
  } catch (error) {
    logger.error('Failed to retrieve snapshot', { error });
    throw new StorageError('Failed to retrieve snapshot', error);
  }
}

function cosineSimilaritySimple(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\\s+/);
  const wordsB = b.toLowerCase().split(/\\s+/);
  
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  
  const intersection = new Set([...setA].filter(w => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  
  return intersection.size / union.size;
}

async function inferProjectId(snapshot: CognitiveSnapshot): Promise<string> {
  try {
    const database = await getDB();
    const key = await getOrCreateKey();
    
    const records = await database.getAllFromIndex(STORAGE_CONFIG.STORE_NAME, 'by-timestamp');
    const recentRecords = records.slice(-10);
    
    for (let i = recentRecords.length - 1; i >= 0; i--) {
      const record = recentRecords[i];
      try {
        const decryptedJson = await decrypt(record.data, key);
        const pastSnapshot = JSON.parse(decryptedJson) as CognitiveSnapshot;
        
        const goalSimilarity = cosineSimilaritySimple(pastSnapshot.current_goal, snapshot.current_goal);
        if (goalSimilarity > 0.3) {
          return pastSnapshot.project_id;
        }
      } catch (err) {
        continue; // Skip decryption failures or parsing errors
      }
    }
  } catch (err) {
    logger.debug('Failed to infer project id', { err });
  }
  return crypto.randomUUID();
}
