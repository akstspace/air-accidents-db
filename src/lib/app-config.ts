export type BrowserModelInfo = {
  id: string;
  label: string;
  dimensions: number;
  size: string;
  description: string;
};

export type EmbeddingConfig = {
  dimensions: number;
  browserModel: string;
};

export const BROWSER_KNOWN_MODELS: BrowserModelInfo[] = [
  {
    id: 'Xenova/all-MiniLM-L6-v2',
    label: 'all-MiniLM-L6-v2 (33 MB) ★ default',
    dimensions: 384,
    size: '33 MB',
    description: 'Fast 384-dim local browser embeddings. Best default for lightweight semantic search.',
  },
  {
    id: 'onnx-community/embeddinggemma-300m-ONNX',
    label: 'embeddinggemma-300m (300 MB)',
    dimensions: 768,
    size: '300 MB',
    description: 'Higher-quality local browser embeddings with a larger download size.',
  },
];

export const DEFAULT_BROWSER_MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
export const DEFAULT_EMBEDDING_DIMENSIONS = 384;

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
  browserModel: DEFAULT_BROWSER_MODEL_ID,
};

const CONFIG_DB_NAME = 'accident-visualizer-config';
const CONFIG_STORE_NAME = 'app-config';
const EMBEDDING_CONFIG_KEY = 'embedding';

function normalizeEmbeddingConfig(raw: Partial<EmbeddingConfig>): EmbeddingConfig {
  const browserModel = String(raw.browserModel ?? DEFAULT_BROWSER_MODEL_ID).trim() || DEFAULT_BROWSER_MODEL_ID;
  const dimensions = Number(raw.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS);

  return {
    browserModel,
    dimensions: Number.isFinite(dimensions) && dimensions > 0
      ? dimensions
      : (BROWSER_KNOWN_MODELS.find((model) => model.id === browserModel)?.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS),
  };
}

function openConfigDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CONFIG_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONFIG_STORE_NAME)) {
        db.createObjectStore(CONFIG_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open config database.'));
  });
}

export async function getEmbeddingConfig(): Promise<EmbeddingConfig> {
  if (typeof indexedDB === 'undefined') {
    return DEFAULT_EMBEDDING_CONFIG;
  }

  const db = await openConfigDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CONFIG_STORE_NAME, 'readonly');
      const store = tx.objectStore(CONFIG_STORE_NAME);
      const request = store.get(EMBEDDING_CONFIG_KEY);

      request.onsuccess = () => {
        const value = request.result as Partial<EmbeddingConfig> | undefined;
        if (!value || typeof value !== 'object') {
          resolve(DEFAULT_EMBEDDING_CONFIG);
          return;
        }

        resolve(normalizeEmbeddingConfig(value));
      };

      request.onerror = () => reject(request.error ?? new Error('Failed to read embedding configuration.'));
    });
  } finally {
    db.close();
  }
}

export async function saveEmbeddingConfig(config: EmbeddingConfig): Promise<EmbeddingConfig> {
  if (typeof indexedDB === 'undefined') {
    return normalizeEmbeddingConfig(config);
  }

  const normalized = normalizeEmbeddingConfig(config);
  const db = await openConfigDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CONFIG_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CONFIG_STORE_NAME);
      const request = store.put(normalized, EMBEDDING_CONFIG_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to save embedding configuration.'));
    });

    return normalized;
  } finally {
    db.close();
  }
}

export async function migrateLegacyEmbeddingConfig(): Promise<void> {
  return;
}
