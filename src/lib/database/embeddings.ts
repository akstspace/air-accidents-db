import { AutoModel, AutoTokenizer, env, pipeline } from '@huggingface/transformers';

const DOCUMENT_PROMPT_TITLE_FALLBACK = 'none';
const MAX_EMBEDDING_TEXT_CHARS = 10000;

// ── Browser ONNX model catalog ───────────────────────────────────────────────
export const DEFAULT_BROWSER_MODEL_ID = 'onnx-community/embeddinggemma-300m-ONNX';
// Backward-compat alias used by db.ts metadata writes.
export const EMBEDDING_MODEL_ID = DEFAULT_BROWSER_MODEL_ID;

// These reflect the default dimensions.
export const BROWSER_EMBEDDING_DIMENSIONS = 768;
export const EMBEDDING_DIMENSIONS = BROWSER_EMBEDDING_DIMENSIONS;

type BrowserModelSpec = {
  dimensions: number;
  /** Prepended to query text for asymmetric search; empty = symmetric model. */
  queryPrefix: string;
  /** 'pipeline' = FeatureExtractionPipeline (mean-pool); 'automodel' = sentence_embedding output. */
  bundleType: 'pipeline' | 'automodel';
};

const BROWSER_MODEL_REGISTRY: Record<string, BrowserModelSpec> = {
  'Xenova/all-MiniLM-L6-v2': {
    dimensions: 384,
    queryPrefix: '',       // symmetric — no asymmetric prefix needed
    bundleType: 'pipeline',
  },
  'onnx-community/embeddinggemma-300m-ONNX': {
    dimensions: 768,
    queryPrefix: 'task: search result | query: ',
    bundleType: 'automodel',
  },
};

function getModelSpec(modelId: string): BrowserModelSpec {
  return BROWSER_MODEL_REGISTRY[modelId] ?? BROWSER_MODEL_REGISTRY[DEFAULT_BROWSER_MODEL_ID];
}

export function getBrowserModelDimensions(modelId: string): number {
  return getModelSpec(modelId).dimensions;
}

export function getBrowserModelQueryPrefix(modelId: string): string {
  return getModelSpec(modelId).queryPrefix;
}

type EmbeddingSupport = {
  available: boolean;
  reason: string | null;
};

let embeddingSupportPromise: Promise<EmbeddingSupport> | undefined;
type ModelBundle = { embed: (texts: string[]) => Promise<number[][]> };
const modelBundles = new Map<string, Promise<ModelBundle>>();

export type ModelProgressCallback = (info: { file: string; loaded: number; total: number; status: string }) => void;

env.allowLocalModels = false;

export async function checkWebGPUSupport(): Promise<boolean> {
  const gpuNavigator = navigator as Navigator & {
    gpu?: {
      requestAdapter?: () => Promise<unknown>;
    };
  };

  if (!gpuNavigator.gpu || typeof gpuNavigator.gpu.requestAdapter !== 'function') {
    return false;
  }

  try {
    const adapter = await gpuNavigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

async function resolveEmbeddingSupport(): Promise<EmbeddingSupport> {
  if (typeof navigator === 'undefined') {
    return {
      available: false,
      reason: 'Semantic search is only available in the browser.',
    };
  }

  // Transformers.js allows WASM fallback, so semantic search is functionally always
  // available in a modern browser even if WebGPU is disabled/missing.
  return {
    available: true,
    reason: null,
  };
}

export async function getEmbeddingSupport() {
  if (embeddingSupportPromise !== undefined) {
    return embeddingSupportPromise;
  }

  embeddingSupportPromise = resolveEmbeddingSupport();
  return embeddingSupportPromise;
}

function loadModelBundle(modelId: string, onProgress?: ModelProgressCallback): Promise<ModelBundle> {
  // Only reuse cached bundle when there's no progress callback
  // (callback callers need fresh progress events)
  if (!onProgress) {
    const cached = modelBundles.get(modelId);
    if (cached) return cached;
  }

  const spec = getModelSpec(modelId);

  const progressCallback = onProgress
    ? (event: { status: string; file?: string; loaded?: number; total?: number; progress?: number }) => {
      if (event.status === 'progress' && event.file && event.loaded !== undefined && event.total !== undefined) {
        onProgress({ file: event.file, loaded: event.loaded, total: event.total, status: 'downloading' });
      } else if (event.status === 'initiate' && event.file) {
        onProgress({ file: event.file, loaded: 0, total: 0, status: 'initiate' });
      } else if (event.status === 'done' && event.file) {
        onProgress({ file: event.file, loaded: 1, total: 1, status: 'done' });
      }
    }
    : undefined;

  const promise: Promise<ModelBundle> = (async () => {
    const support = await getEmbeddingSupport();
    if (!support.available) {
      throw new Error(support.reason ?? 'Semantic search is not available in this browser.');
    }

    const hasWebGPU = await checkWebGPUSupport();
    const device = hasWebGPU ? 'webgpu' : 'wasm';

    if (spec.bundleType === 'pipeline') {
      const extractor = await pipeline('feature-extraction', modelId, {
        device,
        dtype: 'fp32',
        progress_callback: progressCallback,
      });
      return {
        embed: async (texts: string[]) => {
          type ExtractFn = (input: string[], opts: { pooling: string; normalize: boolean }) => Promise<{ tolist: () => number[][] }>;
          const output = await (extractor as unknown as ExtractFn)(texts, {
            pooling: 'mean',
            normalize: true,
          });
          const list = output.tolist();
          return list.map((row) => {
            const nums = row.map(Number);
            if (nums.length !== spec.dimensions || nums.some((v) => !Number.isFinite(v))) {
              throw new TypeError(`Embedding model returned ${nums.length} dims but ${spec.dimensions} were expected.`);
            }
            return nums;
          });
        },
      };
    }

    // automodel strategy: models that expose a `sentence_embedding` output tensor
    const [tokenizer, model] = await Promise.all([
      AutoTokenizer.from_pretrained(modelId, { progress_callback: progressCallback }),
      AutoModel.from_pretrained(modelId, { device, dtype: 'fp32', progress_callback: progressCallback }),
    ]);
    return {
      embed: async (texts: string[]) => {
        const inputs = await tokenizer(texts, { padding: true, truncation: true });
        const output = await model(inputs);
        return extractSentenceEmbeddingsWithDims(output, spec.dimensions);
      },
    };
  })();

  modelBundles.set(modelId, promise);
  return promise;
}

function toEmbeddingArray(output: unknown) {
  if (
    typeof output === 'object' &&
    output !== null &&
    'tolist' in output &&
    typeof (output as { tolist: () => unknown }).tolist === 'function'
  ) {
    return (output as { tolist: () => unknown }).tolist();
  }

  return output;
}

function normalizeEmbeddingRow(row: unknown, expectedDims: number) {
  if (!Array.isArray(row)) {
    throw new TypeError('Unexpected semantic search data format.');
  }

  const normalized = row.map(Number);

  if (normalized.length !== expectedDims || normalized.some((value) => !Number.isFinite(value))) {
    throw new TypeError('Semantic search data is not in the expected format.');
  }

  return normalized;
}

function l2Normalize(values: number[]) {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));

  if (!Number.isFinite(norm) || norm <= 0) {
    return values;
  }

  return values.map((value) => value / norm);
}

function extractSentenceEmbeddingsWithDims(output: unknown, expectedDims: number) {
  if (
    typeof output !== 'object' ||
    output === null ||
    !('sentence_embedding' in output)
  ) {
    throw new TypeError('Semantic search data could not be prepared.');
  }

  const embeddings = toEmbeddingArray((output as { sentence_embedding: unknown }).sentence_embedding);
  if (!Array.isArray(embeddings)) {
    throw new TypeError('Semantic search data is not in the expected format.');
  }

  return embeddings.map((row) => l2Normalize(normalizeEmbeddingRow(row, expectedDims)));
}

function normalizeDocumentValue(value: string | number) {
  return String(value).trim();
}

function formatStructuredValue(label: string, value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return '';
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    return `${label} ${JSON.stringify(parsed)}`;
  } catch {
    return `${label} ${normalized}`;
  }
}

function clampDocumentText(text: string) {
  const normalized = text.trim();
  if (normalized.length <= MAX_EMBEDDING_TEXT_CHARS) {
    return normalized;
  }

  // Keep prefix context while avoiding token overflow quality loss on very long records.
  return `${normalized.slice(0, MAX_EMBEDDING_TEXT_CHARS - 1).trimEnd()}…`;
}

export function buildSearchDocument(record: {
  page_title: string;
  wikipedia_url: string;
  decade: string;
  summary_infobox: string;
  site: string;
  operator: string;
  aircraft_type: string;
  aircraft_name: string;
  iata_flight: string;
  icao_flight: string;
  call_sign: string;
  registration: string;
  flight_origin: string;
  destination: string;
  stopover: string;
  occupants: string;
  passengers: string;
  crew: string;
  fatalities: string;
  total_fatalities: number;
  ground_fatalities: string;
  total_ground_fatalities: number;
  injuries: string;
  total_injuries: number;
  ground_injuries: string;
  total_ground_injuries: number;
  survivors: string;
  total_survivors: number;
  latitude: number;
  longitude: number;
  coordinates_raw: string;
  investigation_text: string;
  cause_text: string;
  aircraft_specs_text: string;
  technical_details_text: string;
  accident_description: string;
  sections_json: string;
  infobox_extra_json: string;
  scrape_error: string;
  index_summary: string;
  image_count: number;
  year: number;
  date: string;
}) {
  const contentSections = [
    ['title', record.page_title],
    ['wikipedia url', record.wikipedia_url],
    ['decade', record.decade],
    ['year', record.year],
    ['date', record.date],
    ['location', record.site],
    ['summary infobox', record.summary_infobox],
    ['operator', record.operator],
    ['aircraft type', record.aircraft_type],
    ['aircraft name', record.aircraft_name],
    ['iata flight', record.iata_flight],
    ['icao flight', record.icao_flight],
    ['call sign', record.call_sign],
    ['registration', record.registration],
    ['origin', record.flight_origin],
    ['destination', record.destination],
    ['stopover', record.stopover],
    ['occupants', record.occupants],
    ['passengers', record.passengers],
    ['crew', record.crew],
    ['fatalities', record.fatalities],
    ['total fatalities', record.total_fatalities],
    ['ground fatalities', record.ground_fatalities],
    ['total ground fatalities', record.total_ground_fatalities],
    ['injuries', record.injuries],
    ['total injuries', record.total_injuries],
    ['ground injuries', record.ground_injuries],
    ['total ground injuries', record.total_ground_injuries],
    ['survivors', record.survivors],
    ['total survivors', record.total_survivors],
    ['latitude', record.latitude],
    ['longitude', record.longitude],
    ['coordinates', record.coordinates_raw],
    ['investigation', record.investigation_text],
    ['cause', record.cause_text],
    ['aircraft specs', record.aircraft_specs_text],
    ['technical details', record.technical_details_text],
    ['description', record.accident_description],
    ['index summary', record.index_summary],
    ['image count', record.image_count],
  ]
    .map(([label, value]) => {
      const normalized = normalizeDocumentValue(value);
      return normalized ? `${label} ${normalized}` : '';
    })
    .filter(Boolean);

  const structuredSections = [
    formatStructuredValue('sections', record.sections_json),
    formatStructuredValue('infobox extra', record.infobox_extra_json),
    formatStructuredValue('scrape error', record.scrape_error),
  ].filter(Boolean);

  const content = [
    ...contentSections,
    ...structuredSections,
  ]
    .filter(Boolean)
    .join(' | ')
    .trim();

  const title = normalizeDocumentValue(record.page_title) || DOCUMENT_PROMPT_TITLE_FALLBACK;
  const text = clampDocumentText(content);
  return `title: ${title} | text: ${text}`;
}

export async function warmupEmbeddings(modelId: string = DEFAULT_BROWSER_MODEL_ID, onProgress?: ModelProgressCallback) {
  await embedText('warm up', modelId, onProgress);
}

export async function embedTexts(texts: string[], modelId: string = DEFAULT_BROWSER_MODEL_ID, onProgress?: ModelProgressCallback) {
  if (texts.length === 0) {
    return [];
  }
  const { embed } = await loadModelBundle(modelId, onProgress);
  return embed(texts);
}

export async function embedText(text: string, modelId: string = DEFAULT_BROWSER_MODEL_ID, onProgress?: ModelProgressCallback) {
  const queryPrefix = getBrowserModelQueryPrefix(modelId);
  const [embedding] = await embedTexts([`${queryPrefix}${text}`], modelId, onProgress);
  return embedding;
}