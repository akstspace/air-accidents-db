import type { EmbeddingProvider } from './types';

export type OllamaConfig = {
  endpoint: string;
  model: string;
};

// ── Browser (ONNX) model catalog ─────────────────────────────────────────
export type BrowserModelInfo = {
  id: string;      // HuggingFace model ID
  label: string;
  dimensions: number;
  size: string;
  description: string;
};

export const BROWSER_KNOWN_MODELS: BrowserModelInfo[] = [
  {
    id: 'Xenova/all-MiniLM-L6-v2',
    label: 'all-MiniLM-L6-v2 (33 MB) ★ default',
    dimensions: 384,
    size: '33 MB',
    description: 'Fast 384-dim symmetric model. No query prefix needed. Best for low-memory environments.',
  },
  {
    id: 'onnx-community/embeddinggemma-300m-ONNX',
    label: 'embeddinggemma-300m (300 MB)',
    dimensions: 768,
    size: '300 MB',
    description: 'Google EmbeddingGemma 300M — 768 dims, asymmetric retrieval with query prefix. Higher quality, larger download.',
  },
];

export const DEFAULT_BROWSER_MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

export type OllamaModelInfo = {
  id: string;
  label: string;
  dimensions: number;
  contextLength: number;
  size: string;
  category: 'fast' | 'balanced' | 'quality';
  description: string;
  /** Prefix prepended to query text at search time. Empty string = no prefix. */
  queryPrefix?: string;
  /** Prefix prepended to document text at embedding-generation time. Empty string = no prefix. */
  docPrefix?: string;
  /**
   * When true, a dynamic task instruction is built from the search query at runtime
   * instead of using a static queryPrefix. Used for instruct-tuned embedding models
   * (e.g. qwen3-embedding) that benefit from a query-specific Instruct: … \nQuery: format.
   */
  instructQuery?: boolean;
};

// Curated catalog of Ollama embedding models with known native output dimensions.
// Models are grouped by speed/quality tier. Dimensions reflect native model output
// (Ollama's /api/embed does not support MRL truncation like OpenAI's API does).
export const OLLAMA_KNOWN_MODELS: OllamaModelInfo[] = [
  // ── Balanced ────────────────────────────────────────────────────────────────
  {
    id: 'nomic-embed-text',
    label: 'nomic-embed-text (274 MB) ★ recommended',
    dimensions: 768,
    contextLength: 8192,
    size: '274 MB',
    category: 'balanced',
    description: 'Best speed-to-quality ratio. 8K context, 768 dims. Most popular choice.',
    queryPrefix: 'search_query: ',
    docPrefix: 'search_document: ',
  },
  {
    id: 'mxbai-embed-large',
    label: 'mxbai-embed-large (670 MB)',
    dimensions: 1024,
    contextLength: 512,
    size: '670 MB',
    category: 'balanced',
    description: 'High-quality 1024-dim English embeddings from MixedBread AI.',
    queryPrefix: 'Represent this sentence for searching relevant passages: ',
    docPrefix: '',
  },
  // ── Quality / Long context ───────────────────────────────────────────────────
  {
    id: 'qwen3-embedding:0.6b',
    label: 'qwen3-embedding:0.6b (639 MB)',
    dimensions: 1024,
    contextLength: 32768,
    size: '639 MB',
    category: 'quality',
    description: 'Qwen3 0.6B — 32K context, 1024 dims. Great quality for its size.',
    instructQuery: true,
    docPrefix: '',
  },
  {
    id: 'qwen3-embedding:4b',
    label: 'qwen3-embedding:4b (2.5 GB)',
    dimensions: 2560,
    contextLength: 40960,
    size: '2.5 GB',
    category: 'quality',
    description: 'Qwen3 4B — 40K context, 2560 dims. High accuracy for long documents.',
    instructQuery: true,
    docPrefix: '',
  },
  {
    id: 'qwen3-embedding:8b',
    label: 'qwen3-embedding:8b (4.7 GB)',
    dimensions: 4096,
    contextLength: 40960,
    size: '4.7 GB',
    category: 'quality',
    description: 'Qwen3 8B — 40K context, 4096 dims. Highest accuracy, requires significant RAM.',
    instructQuery: true,
    docPrefix: '',
  },
];

export type OpenAIConfig = {
  apiKey: string;
  model: string;
  /** Override base URL for OpenAI-compatible APIs (e.g. OpenRouter). Leave blank for OpenAI. */
  baseUrl: string;
};

export type EmbeddingConfig = {
  provider: EmbeddingProvider;
  dimensions: number;
  /** HuggingFace model ID for the browser (ONNX WebGPU) provider. */
  browserModel: string;
  ollamaConfig: OllamaConfig;
  openaiConfig: OpenAIConfig;
};

// Per-model dimension presets for OpenAI embedding models.
// text-embedding-3-{small,large} support the `dimensions` MRL parameter;
// text-embedding-ada-002 does not (fixed at 1536).
export const OPENAI_MODEL_DIMENSIONS: Record<string, readonly number[]> = {
  'text-embedding-3-small': [512, 1536],
  'text-embedding-3-large': [256, 1024, 3072],
  'text-embedding-ada-002': [1536],
  // OpenRouter-hosted models (OpenAI-compatible API)
  'qwen/qwen3-embedding-4b': [2560],
};
export const OPENAI_MODELS = Object.keys(OPENAI_MODEL_DIMENSIONS);
export const DEFAULT_OPENAI_MODEL = 'text-embedding-3-small';

// OpenAI-compatible models that use the instruct-query format.
// At search time a dynamic task instruction is built from the query content
// instead of a static prefix — see buildInstructPrefix() in db.ts.
export const OPENAI_INSTRUCT_MODELS: ReadonlySet<string> = new Set([
  'qwen/qwen3-embedding-4b',
]);
export const DEFAULT_EMBEDDING_DIMENSIONS = 384; // all-MiniLM default

export const DEFAULT_OLLAMA_MODEL = 'qwen3-embedding:4b';

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  endpoint: 'http://127.0.0.1:11434',
  model: DEFAULT_OLLAMA_MODEL,
};

export const DEFAULT_OPENAI_CONFIG: OpenAIConfig = {
  apiKey: '',
  model: DEFAULT_OPENAI_MODEL,
  baseUrl: '',
};

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: 'browser',
  dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
  browserModel: DEFAULT_BROWSER_MODEL_ID,
  ollamaConfig: DEFAULT_OLLAMA_CONFIG,
  openaiConfig: DEFAULT_OPENAI_CONFIG,
};

const CONFIG_DB_NAME = 'accident-visualizer-config';
const CONFIG_STORE_NAME = 'app-config';
const EMBEDDING_CONFIG_KEY = 'embedding';

function normalizeOllamaConfig(c: Partial<OllamaConfig>): OllamaConfig {
  return {
    endpoint: String(c.endpoint ?? DEFAULT_OLLAMA_CONFIG.endpoint).trim() || DEFAULT_OLLAMA_CONFIG.endpoint,
    model: String(c.model ?? DEFAULT_OLLAMA_CONFIG.model).trim() || DEFAULT_OLLAMA_CONFIG.model,
  };
}

function normalizeOpenAIConfig(c: Partial<OpenAIConfig>): OpenAIConfig {
  return {
    apiKey: String(c.apiKey ?? DEFAULT_OPENAI_CONFIG.apiKey).trim(),
    model: String(c.model ?? DEFAULT_OPENAI_CONFIG.model).trim() || DEFAULT_OPENAI_CONFIG.model,
    baseUrl: String(c.baseUrl ?? DEFAULT_OPENAI_CONFIG.baseUrl).trim(),
  };
}

function normalizeEmbeddingConfig(raw: Partial<EmbeddingConfig>): EmbeddingConfig {
  const dims = Number(raw.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS);
  const rawBrowserModel = String(raw.browserModel ?? DEFAULT_BROWSER_MODEL_ID).trim();
  const browserModel = rawBrowserModel || DEFAULT_BROWSER_MODEL_ID;
  return {
    provider: (['browser', 'ollama', 'openai'] as const).includes(raw.provider as 'browser' | 'ollama' | 'openai')
      ? raw.provider as 'browser' | 'ollama' | 'openai'
      : DEFAULT_EMBEDDING_CONFIG.provider,
    dimensions: Number.isFinite(dims) && dims > 0 ? dims : DEFAULT_EMBEDDING_DIMENSIONS,
    browserModel,
    ollamaConfig: normalizeOllamaConfig((raw.ollamaConfig as Partial<OllamaConfig>) ?? {}),
    openaiConfig: normalizeOpenAIConfig((raw.openaiConfig as Partial<OpenAIConfig>) ?? {}),
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

// ---------- Legacy compat shim (OllamaConfig shape used by old ollama-config.ts) ----------
// Read old separate 'ollama' key and migrate into new unified config on first load.
export async function migrateOldOllamaConfig(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  const db = await openConfigDatabase();

  try {
    const oldValue = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(CONFIG_STORE_NAME, 'readonly');
      const store = tx.objectStore(CONFIG_STORE_NAME);
      const r = store.get('ollama');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });

    if (!oldValue || typeof oldValue !== 'object') return;

    const old = oldValue as Record<string, unknown>;
    const current = await getEmbeddingConfig();

    // Only migrate if endpoint/model fields exist
    if (typeof old.endpoint !== 'string' && typeof old.model !== 'string') return;

    const migrated: EmbeddingConfig = {
      ...current,
      provider: 'ollama',
      ollamaConfig: {
        endpoint: (typeof old.endpoint === 'string' ? old.endpoint.trim() : '') || DEFAULT_OLLAMA_CONFIG.endpoint,
        model: (typeof old.model === 'string' ? old.model.trim() : '') || DEFAULT_OLLAMA_CONFIG.model,
      },
    };

    await saveEmbeddingConfig(migrated);

    // Delete old key
    const db2 = await openConfigDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db2.transaction(CONFIG_STORE_NAME, 'readwrite');
        const store = tx.objectStore(CONFIG_STORE_NAME);
        const r = store.delete('ollama');
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      });
    } finally {
      db2.close();
    }
  } finally {
    db.close();
  }
}
