import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';

import { DEFAULT_DATA_SOURCE, DEFAULT_REMOTE_URL, describeDataSource, getDataSource } from './data-source';
import {
  buildSearchDocument,
  BROWSER_EMBEDDING_DIMENSIONS,
  DEFAULT_BROWSER_MODEL_ID,
  EMBEDDING_MODEL_ID,
  embedText,
  embedTexts,
  getBrowserModelDimensions,
  getEmbeddingSupport,
  warmupEmbeddings,
  type ModelProgressCallback,
} from './database/embeddings';
import { DEFAULT_EMBEDDING_CONFIG, getEmbeddingConfig, saveEmbeddingConfig, type EmbeddingConfig } from './app-config';
import { accident_embeddings, accidents, images, meta, schema } from './database/schema';
import type {
  Accident,
  AccidentImage,
  AircraftEntry,
  AccidentQueryState,
  AccidentSourceRecord,
  DataSourceConfig,
  DatabaseProgress,
  DatabaseProgressMode,
  DatabaseStatus,
  FilterState,
  SeverityType,
} from './types';

const DB_PATH = 'idb://air-accident-pg';
const MAX_SEMANTIC_SEARCH_RESULTS = 150;
const MAX_SEMANTIC_CANDIDATES = 150;
const EMBEDDING_BATCH_SIZE = 5;
const EMBEDDINGS_NOT_GENERATED_REASON = 'Embeddings are not generated yet. Generate embeddings or import an embeddings file to enable semantic search.';
const GEMMA_EMBEDDINGS_URL = 'https://raw.githubusercontent.com/akstspace/air-accidents-data/refs/heads/main/gemma-embeddings.jsonl';
const MINILM_EMBEDDINGS_URL = 'https://raw.githubusercontent.com/akstspace/air-accidents-data/refs/heads/main/minilm-embedding.jsonl';
const LAST_UPDATED_URL = 'https://raw.githubusercontent.com/akstspace/air-accidents-data/refs/heads/main/last_updated.json';
const REMOTE_DATA_VERSION_META_KEY = 'remote_data_version';

type AccidentRow = Omit<Accident, 'id'> & { id: number };
type ImageRow = AccidentImage & { id: number };
type NormalizableValue = string | number | null | undefined;
type DataImportSource = {
  source: DataSourceConfig;
  file?: File;
};
type AccidentEmbeddingRow = { accident_id: number; search_document: string; embedding: number[] };
type EmbeddingExportMetadataRecord = {
  type: 'metadata';
  embedding_model: string;
  embedding_dimensions: number;
  exported_at: string;
  embedding_config?: {
    dimensions: number;
    browser_model?: string;
  };
};
type EmbeddingExportRecord = {
  type: 'embedding';
  wikipedia_url: string;
  search_document: string;
  embedding: number[];
};
const FIRST_INTEGER_PATTERN = /\d+/;

let dbInstance: PGlite | null = null;
let drizzleInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let initPromise: Promise<void> | undefined;
let databaseProgress: DatabaseProgress = {
  active: false,
  mode: null,
  stage: 'idle',
  message: 'Database idle.',
  current: 0,
  total: 0,
  percent: 0,
  error: null,
  startedAt: null,
  updatedAt: null,
  source: DEFAULT_DATA_SOURCE,
};

const progressListeners = new Set<(progress: DatabaseProgress) => void>();

function normalizeText(value: NormalizableValue) {
  return String(value ?? '').trim();
}

function normalizeNumber(value: NormalizableValue) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCount(value: NormalizableValue) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return 0;
  }

  const direct = Number.parseInt(normalized, 10);
  if (Number.isFinite(direct)) {
    return direct;
  }

  const firstNumber = FIRST_INTEGER_PATTERN.exec(normalized);
  if (!firstNumber) {
    return 0;
  }

  const parsed = Number.parseInt(firstNumber[0], 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFloat(value: NormalizableValue) {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMatchPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

const MODEL_SIMILARITY_CUTOFF: Record<string, number> = {
  'Xenova/all-MiniLM-L6-v2': 0.1,
  'onnx-community/embeddinggemma-300m-ONNX': 0.2,
};
function getSimilarityCutoff(embConfig: EmbeddingConfig): number {
  return MODEL_SIMILARITY_CUTOFF[embConfig.browserModel] ?? 0.1;
}

function normalizeJson(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return '';
    }

    try {
      return JSON.stringify(JSON.parse(trimmed));
    } catch {
      return trimmed;
    }
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

// Returns the first entry of aircraft_list (if present) so base fields can fall back to it.
function parseFirstAircraftEntry(aircraftList: unknown): AircraftEntry | null {
  if (!Array.isArray(aircraftList) || aircraftList.length === 0) return null;
  const first = aircraftList[0];
  return typeof first === 'object' && first !== null ? (first as AircraftEntry) : null;
}

// Returns `base` when non-empty, otherwise the fallback from aircraft_list[0].
function resolveAircraftField(
  base: NormalizableValue,
  fallback: string | null | undefined,
): NormalizableValue {
  const s = base === null || base === undefined ? '' : String(base).trim();
  return s === '' ? (fallback ?? null) : base;
}

function emitProgress(update: Partial<DatabaseProgress>) {
  const nextCurrent = update.current ?? databaseProgress.current;
  const total = update.total ?? databaseProgress.total;
  const current = total > 0 ? Math.min(nextCurrent, total) : nextCurrent;
  let percent = 0;

  if (total > 0) {
    percent = Math.min(100, Math.round((current / total) * 100));
  }

  const nextProgress: DatabaseProgress = {
    ...databaseProgress,
    ...update,
    percent,
    updatedAt: new Date().toISOString(),
  };

  databaseProgress = nextProgress;
  progressListeners.forEach((listener) => listener(nextProgress));
}

function startProgress(mode: DatabaseProgressMode, source: DataSourceConfig, message: string) {
  databaseProgress = {
    active: true,
    mode,
    stage: 'preparing',
    message,
    current: 0,
    total: 0,
    percent: 0,
    error: null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source,
  };

  progressListeners.forEach((listener) => listener(databaseProgress));
}

function completeProgress(message: string) {
  emitProgress({
    active: false,
    stage: 'complete',
    message,
    current: databaseProgress.total || databaseProgress.current,
    total: databaseProgress.total,
    error: null,
  });
}

/**
 * Returns a ModelProgressCallback that forwards Transformers.js file-download
 * events to emitProgress. It aggregates individual file progresses to present
 * a single, smooth overall download percentage to the user.
 */
function makeModelProgressEmitter(source: DataSourceConfig): ModelProgressCallback {
  const fileProgress = new Map<string, { loaded: number; total: number }>();
  const startTime = Date.now();
  let hasShownProgress = false;

  return ({ file, loaded, total, status }) => {
    if (status === 'initiate' || status === 'downloading' || status === 'done') {
      // Transformers.js progress event
      if (total > 0) {
        fileProgress.set(file, { loaded, total });
      }
    }

    if (status === 'ready') {
      // Pipeline completely instantiated
      if (hasShownProgress) {
        emitProgress({
          active: false,
          stage: 'complete',
          message: 'Model ready',
        });
      }
      return;
    }

    let overallLoaded = 0;
    let overallTotal = 0;
    for (const p of fileProgress.values()) {
      overallLoaded += p.loaded;
      overallTotal += p.total;
    }

    const isComplete = overallTotal > 0 && overallLoaded >= overallTotal;

    // Wait 10 seconds before showing progress to let fast loading finish silently
    if (!hasShownProgress && Date.now() - startTime > 10000) {
      if (!isComplete) {
        hasShownProgress = true;
      }
    }

    if (hasShownProgress) {
      if (isComplete) {
        emitProgress({
          active: false,
          stage: 'complete',
          message: 'Model ready',
        });
        // Prevent re-emitting once complete
        hasShownProgress = false;
      } else if (overallTotal > 0) {
        const pct = Math.round((overallLoaded / overallTotal) * 100);
        emitProgress({
          active: true,
          stage: 'preparing',
          message: `Loading model: ${pct}%`,
          current: pct,
          total: 100,
          source,
        });
      } else if (status === 'initiate') {
        emitProgress({
          active: true,
          stage: 'preparing',
          message: `Preparing model…`,
          source,
        });
      }
    }
  };
}

function failProgress(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown database error';
  emitProgress({
    active: false,
    stage: 'error',
    message,
    error: message,
  });
}

function resolveDataRequestUrl(url: string, cacheBust: boolean) {
  if (!cacheBust) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}ts=${Date.now()}`;
}

async function fetchTextFromUrl(url: string, options?: { cacheBust?: boolean }) {
  const requestUrl = resolveDataRequestUrl(url, options?.cacheBust ?? false);
  const response = await fetch(requestUrl, {
    cache: options?.cacheBust ? 'no-store' : 'default',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url} (${response.status})`);
  }

  return response.text();
}

async function fetchJsonFromUrl<T>(url: string, options?: { cacheBust?: boolean }): Promise<T> {
  const text = await fetchTextFromUrl(url, options);
  return JSON.parse(text) as T;
}

function extractRemoteDataVersion(payload: unknown): string {
  if (typeof payload === 'string') {
    const normalized = payload.trim();
    return normalized || JSON.stringify(payload);
  }

  if (typeof payload === 'number' || typeof payload === 'boolean') {
    return String(payload);
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const preferredKeys = [
      'last_updated',
      'updated_at',
      'updatedAt',
      'timestamp',
      'version',
      'sha',
      'commit',
      'date',
    ];

    for (const key of preferredKeys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
    }
  }

  return JSON.stringify(payload);
}

function parseJsonlText<T>(text: string): T[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
}

async function parseJsonlFromUrl<T>(url: string, options?: { cacheBust?: boolean }): Promise<T[]> {
  const text = await fetchTextFromUrl(url, options);
  return parseJsonlText(text);
}

async function parseJsonlFromFile<T>(file: File): Promise<T[]> {
  const text = await file.text();
  return parseJsonlText(text);
}

async function parseSourceRecords(importSource: DataImportSource) {
  return importSource.source.type === 'file'
    ? parseJsonlFromFile<AccidentSourceRecord>(importSource.file)
    : parseJsonlFromUrl<AccidentSourceRecord>(importSource.source.dataUrl, { cacheBust: true });
}

function buildAccidentRow(row: AccidentSourceRecord, id: number): AccidentRow {
  const firstAircraft = parseFirstAircraftEntry(row.aircraft_list);
  return {
    id,
    page_title: normalizeText(row.page_title),
    wikipedia_url: normalizeText(row.wikipedia_url),
    decade: normalizeText(row.decade),
    year: normalizeNumber(row.year),
    date: normalizeText(row.date),
    summary_infobox: normalizeText(row.summary_infobox),
    site: normalizeText(row.site),
    aircraft_type: normalizeText(resolveAircraftField(row.aircraft_type, firstAircraft?.aircraft_type)),
    aircraft_name: normalizeText(resolveAircraftField(row.aircraft_name, firstAircraft?.aircraft_name)),
    operator: normalizeText(resolveAircraftField(row.operator, firstAircraft?.operator)),
    iata_flight: normalizeText(resolveAircraftField(row.iata_flight, firstAircraft?.iata_flight)),
    icao_flight: normalizeText(resolveAircraftField(row.icao_flight, firstAircraft?.icao_flight)),
    call_sign: normalizeText(resolveAircraftField(row.call_sign, firstAircraft?.call_sign)),
    registration: normalizeText(resolveAircraftField(row.registration, firstAircraft?.registration)),
    flight_origin: normalizeText(resolveAircraftField(row.flight_origin, firstAircraft?.flight_origin)),
    destination: normalizeText(resolveAircraftField(row.destination, firstAircraft?.destination)),
    stopover: normalizeText(resolveAircraftField(row.stopover, firstAircraft?.stopover)),
    occupants: normalizeText(resolveAircraftField(row.occupants, firstAircraft?.occupants)),
    passengers: normalizeText(resolveAircraftField(row.passengers, firstAircraft?.passengers)),
    crew: normalizeText(resolveAircraftField(row.crew, firstAircraft?.crew)),
    fatalities: normalizeText(resolveAircraftField(row.fatalities, firstAircraft?.fatalities)),
    total_fatalities: normalizeCount(resolveAircraftField(row.fatalities, firstAircraft?.fatalities)),
    ground_fatalities: normalizeText(row.ground_fatalities),
    total_ground_fatalities: normalizeCount(row.ground_fatalities),
    injuries: normalizeText(resolveAircraftField(row.injuries, firstAircraft?.injuries)),
    total_injuries: normalizeCount(resolveAircraftField(row.injuries, firstAircraft?.injuries)),
    ground_injuries: normalizeText(row.ground_injuries),
    total_ground_injuries: normalizeCount(row.ground_injuries),
    survivors: normalizeText(resolveAircraftField(row.survivors, firstAircraft?.survivors)),
    total_survivors: normalizeCount(resolveAircraftField(row.survivors, firstAircraft?.survivors)),
    latitude: normalizeFloat(row.latitude),
    longitude: normalizeFloat(row.longitude),
    coordinates_raw: normalizeText(row.coordinates_raw),
    investigation_text: normalizeText(row.investigation_text),
    cause_text: normalizeText(row.cause_text),
    aircraft_specs_text: normalizeText(row.aircraft_specs_text),
    technical_details_text: normalizeText(row.technical_details_text),
    accident_description: normalizeText(row.accident_description),
    sections_json: normalizeJson(row.sections),
    infobox_extra_json: normalizeJson(row.infobox_extra),
    aircraft_list_json: normalizeJson(row.aircraft_list),
    scrape_error: normalizeText(row.scrape_error),
    index_summary: normalizeText(row.index_summary),
    image_count: normalizeNumber(row.image_count ?? row.images?.length),
  };
}

function buildImageRowsForRecord(row: AccidentSourceRecord): Array<Omit<ImageRow, 'id'>> {
  return (row.images ?? []).map((image, index) => ({
    wikipedia_url: normalizeText(image.wikipedia_url || row.wikipedia_url),
    page_title: normalizeText(image.page_title || row.page_title),
    year: normalizeNumber(image.year ?? row.year ?? 0),
    image_index: normalizeNumber(image.image_index ?? index),
    src: normalizeText(image.src),
    full_src: normalizeText(image.full_src),
    alt: normalizeText(image.alt),
    caption: normalizeText(image.caption),
  }));
}

function buildAccidentRows(records: AccidentSourceRecord[], startingId = 1) {
  return records.map((row, index) => buildAccidentRow(row, startingId + index));
}

function buildImageRows(records: AccidentSourceRecord[], startingId = 1) {
  return records
    .flatMap((row) => buildImageRowsForRecord(row))
    .map((image, index) => ({
      ...image,
      id: startingId + index,
    }));
}

function buildImageKey(wikipediaUrl: string, imageIndex: number, fullSrc: string) {
  return `${wikipediaUrl}::${imageIndex}::${fullSrc}`;
}

function resolveImportSource(sourceOverride?: DataImportSource): DataImportSource | null {
  if (sourceOverride) {
    return sourceOverride;
  }

  const source = getDataSource();

  if (source.type === 'url' && source.dataUrl) {
    return { source };
  }

  return null;
}

function isManagedRemoteDataSource(source: DataSourceConfig) {
  return source.type === 'url' && source.dataUrl === DEFAULT_REMOTE_URL;
}

async function resolveRemoteDataVersion(source: DataSourceConfig): Promise<string | null> {
  if (!isManagedRemoteDataSource(source)) {
    return null;
  }

  const payload = await fetchJsonFromUrl<unknown>(LAST_UPDATED_URL, { cacheBust: true });
  return extractRemoteDataVersion(payload);
}

async function setMetaEntries(entries: Array<{ key: string; value: string }>) {
  if (entries.length === 0) {
    return;
  }

  const db = await getDB();
  await db.delete(meta).where(inArray(meta.key, entries.map((entry) => entry.key)));
  await db.insert(meta).values(entries);
}

async function getMetaValue(key: string): Promise<string | null> {
  const db = await getDB();
  const rows = await db.select({ value: meta.value }).from(meta).where(eq(meta.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

function setIdleProgress(source: DataSourceConfig, message: string) {
  emitProgress({
    active: false,
    stage: 'idle',
    message,
    current: 0,
    total: 0,
    error: null,
    source,
  });
}

export function getDatabaseProgress() {
  return databaseProgress;
}

export function subscribeToDatabaseProgress(listener: (progress: DatabaseProgress) => void) {
  progressListeners.add(listener);
  listener(databaseProgress);

  return () => {
    progressListeners.delete(listener);
  };
}

async function getClient() {
  if (dbInstance && !dbInstance.closed) return dbInstance;

  dbInstance = await PGlite.create(DB_PATH, {
    extensions: { vector },
    relaxedDurability: true,
  });
  drizzleInstance = null;

  return dbInstance;
}

async function getDB() {
  if (drizzleInstance) return drizzleInstance;

  const client = await getClient();
  drizzleInstance = drizzle({ client, schema });

  return drizzleInstance;
}

async function ensureSchema() {
  // Get dimensions from config (IndexedDB) before acquiring DB client to avoid deadlock
  const config = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
  const dims = config.dimensions;
  const client = await getClient();
  await client.exec(`
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS accidents (
      id INTEGER PRIMARY KEY,
      page_title TEXT NOT NULL,
      wikipedia_url TEXT NOT NULL,
      decade TEXT NOT NULL,
      year INTEGER NOT NULL,
      date TEXT NOT NULL,
      summary_infobox TEXT NOT NULL,
      site TEXT NOT NULL,
      aircraft_type TEXT NOT NULL,
      aircraft_name TEXT NOT NULL,
      operator TEXT NOT NULL,
      iata_flight TEXT NOT NULL,
      icao_flight TEXT NOT NULL,
      call_sign TEXT NOT NULL,
      registration TEXT NOT NULL,
      flight_origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      stopover TEXT NOT NULL,
      occupants TEXT NOT NULL,
      passengers TEXT NOT NULL,
      crew TEXT NOT NULL,
      fatalities TEXT NOT NULL,
      total_fatalities INTEGER NOT NULL,
      ground_fatalities TEXT NOT NULL,
      total_ground_fatalities INTEGER NOT NULL,
      injuries TEXT NOT NULL,
      total_injuries INTEGER NOT NULL,
      ground_injuries TEXT NOT NULL,
      total_ground_injuries INTEGER NOT NULL,
      survivors TEXT NOT NULL,
      total_survivors INTEGER NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      coordinates_raw TEXT NOT NULL,
      investigation_text TEXT NOT NULL,
      cause_text TEXT NOT NULL,
      aircraft_specs_text TEXT NOT NULL,
      technical_details_text TEXT NOT NULL,
      accident_description TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      infobox_extra_json TEXT NOT NULL,
      aircraft_list_json TEXT NOT NULL,
      scrape_error TEXT NOT NULL,
      index_summary TEXT NOT NULL,
      image_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY,
      wikipedia_url TEXT NOT NULL,
      page_title TEXT NOT NULL,
      year INTEGER NOT NULL,
      image_index INTEGER NOT NULL,
      src TEXT NOT NULL,
      full_src TEXT NOT NULL,
      alt TEXT NOT NULL,
      caption TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accident_embeddings (
      accident_id INTEGER PRIMARY KEY REFERENCES accidents(id) ON DELETE CASCADE,
      search_document TEXT NOT NULL,
      embedding vector(${dims}) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS accidents_year_idx ON accidents (year);
    CREATE INDEX IF NOT EXISTS accidents_aircraft_type_idx ON accidents (aircraft_type);
    CREATE INDEX IF NOT EXISTS accidents_coordinates_idx ON accidents (latitude, longitude);
    CREATE INDEX IF NOT EXISTS images_wikipedia_url_idx ON images (wikipedia_url);
    CREATE INDEX IF NOT EXISTS accident_embeddings_accident_id_idx ON accident_embeddings (accident_id);

    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS iata_flight TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS icao_flight TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS call_sign TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS stopover TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS ground_fatalities TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS total_ground_fatalities INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS ground_injuries TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS total_ground_injuries INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS coordinates_raw TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS investigation_text TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS aircraft_specs_text TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS technical_details_text TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS sections_json TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS infobox_extra_json TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS aircraft_list_json TEXT NOT NULL DEFAULT '';
    ALTER TABLE accidents ADD COLUMN IF NOT EXISTS scrape_error TEXT NOT NULL DEFAULT '';
  `);
}

async function getStoredEmbeddingDimensions(): Promise<number> {
  // Try to read stored dimensions from meta table; fall back to config then default.
  try {
    const client = await getClient();
    const result = await client.query<{ value: string }>(
      `SELECT value FROM meta WHERE key = 'embedding_dimensions' LIMIT 1`,
    );
    const stored = Number(result.rows[0]?.value ?? '');
    if (Number.isFinite(stored) && stored > 0) return stored;
  } catch {
    // table may not exist yet; that's fine
  }
  const config = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
  return config.dimensions;
}

async function recreateSchema() {
  const client = await getClient();
  await client.exec(`
    DROP TABLE IF EXISTS accident_embeddings;
    DROP TABLE IF EXISTS images;
    DROP TABLE IF EXISTS accidents;
    DROP TABLE IF EXISTS meta;
  `);
  await ensureSchema();
}

async function recreateEmbeddingTable(dims: number): Promise<void> {
  const client = await getClient();
  await client.exec(`
    DROP TABLE IF EXISTS accident_embeddings;
    CREATE TABLE accident_embeddings (
      accident_id INTEGER PRIMARY KEY REFERENCES accidents(id) ON DELETE CASCADE,
      search_document TEXT NOT NULL,
      embedding vector(${dims}) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS accident_embeddings_accident_id_idx ON accident_embeddings (accident_id);
  `);
}

export async function clearEmbeddings(): Promise<void> {
  // Read the current (already-saved) config so the table is recreated with the new dims.
  const config = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
  const dims = config.dimensions;
  const client = await getClient();
  await client.exec(`
    DROP TABLE IF EXISTS accident_embeddings;
    CREATE TABLE IF NOT EXISTS accident_embeddings (
      accident_id INTEGER PRIMARY KEY REFERENCES accidents(id) ON DELETE CASCADE,
      search_document TEXT NOT NULL,
      embedding vector(${dims}) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS accident_embeddings_accident_id_idx ON accident_embeddings (accident_id);
  `);
  // Remove the stored dimension meta so getDatabaseStatus reports no embeddings.
  try {
    const db = await getDB();
    await db.delete(meta).where(eq(meta.key, 'embedding_dimensions'));
  } catch {
    // best-effort
  }
}

async function isLoaded() {
  const db = await getDB();
  const loadedRow = await db.select({ value: meta.value }).from(meta).where(eq(meta.key, 'loaded')).limit(1);
  return loadedRow[0]?.value === 'true';
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function seedDatabase(mode: DatabaseProgressMode, importSource: DataImportSource) {
  const db = await getDB();
  const source = importSource.source;
  const remoteVersionPromise = resolveRemoteDataVersion(source).catch(() => null);

  emitProgress({
    stage: 'fetching-data',
    message: source.type === 'file'
      ? `Reading accident data from ${describeDataSource(source)}`
      : `Downloading accident data from ${describeDataSource(source)}`,
    source,
  });
  const records = await parseSourceRecords(importSource);

  let currentStep = 1;

  emitProgress({
    stage: 'processing-records',
    message: `Processing ${records.length.toLocaleString()} accident records`,
    current: currentStep,
    source,
  });

  const accidentRows = buildAccidentRows(records, 1);
  const imageRows = buildImageRows(records, 1);
  const remoteDataVersion = await remoteVersionPromise;

  currentStep += 1;

  const accidentInsertBatches = chunk(accidentRows, 200);
  const imageInsertBatches = chunk(imageRows, 300);
  const totalSteps = 2 + accidentInsertBatches.length + imageInsertBatches.length + 1;
  const loadModeLabel = mode === 'refreshing' ? 'refresh' : 'initial load';
  const preparedMessage = `Prepared ${accidentRows.length.toLocaleString()} accidents and ${imageRows.length.toLocaleString()} images for ${loadModeLabel}`;

  emitProgress({
    stage: 'processing-records',
    message: preparedMessage,
    current: currentStep,
    total: totalSteps,
    source,
  });

  await db.transaction(async (tx) => {
    for (const [batchIndex, batch] of accidentInsertBatches.entries()) {
      await tx.insert(accidents).values(batch);
      currentStep += 1;
      emitProgress({
        stage: 'storing-accidents',
        message: `Writing accident rows ${batchIndex + 1} of ${accidentInsertBatches.length}`,
        current: currentStep,
        total: totalSteps,
        source,
      });
    }

    for (const [batchIndex, batch] of imageInsertBatches.entries()) {
      await tx.insert(images).values(batch);
      currentStep += 1;
      emitProgress({
        stage: 'storing-images',
        message: `Writing image rows ${batchIndex + 1} of ${imageInsertBatches.length}`,
        current: currentStep,
        total: totalSteps,
        source,
      });
    }

    const metaEntries = [
      { key: 'loaded', value: 'true' },
      { key: 'refreshed_at', value: new Date().toISOString() },
      { key: 'embedding_model', value: EMBEDDING_MODEL_ID },
      { key: 'embedding_dimensions', value: String(BROWSER_EMBEDDING_DIMENSIONS) },
      { key: 'semantic_search_enabled', value: 'false' },
      { key: 'semantic_search_reason', value: EMBEDDINGS_NOT_GENERATED_REASON },
      ...(remoteDataVersion ? [{ key: REMOTE_DATA_VERSION_META_KEY, value: remoteDataVersion }] : []),
    ];

    await tx.insert(meta).values(metaEntries);
  });

  currentStep += 1;
  emitProgress({
    stage: 'finalizing',
    message: 'Database refresh complete',
    current: currentStep,
    total: totalSteps,
    source,
  });
}

export async function updateDatabase(options: { sourceOverride?: DataImportSource }): Promise<void> {
  const importSource = resolveImportSource(options.sourceOverride);

  if (!importSource) {
    throw new Error('Choose a JSONL file or enter a URL before updating the local database.');
  }

  const source = importSource.source;
  const remoteVersionPromise = resolveRemoteDataVersion(source).catch(() => null);
  startProgress('updating', source, 'Preparing database update');
  await ensureSchema();

  if (!(await isLoaded())) {
    await initDatabase({ forceRefresh: true, sourceOverride: importSource });
    return;
  }

  const db = await getDB();

  emitProgress({
    stage: 'fetching-data',
    message: source.type === 'file'
      ? `Reading accident data from ${describeDataSource(source)}`
      : `Downloading accident data from ${describeDataSource(source)}`,
    source,
  });

  const records = await parseSourceRecords(importSource);
  const remoteDataVersion = await remoteVersionPromise;
  let currentStep = 1;

  emitProgress({
    stage: 'processing-records',
    message: `Processing ${records.length.toLocaleString()} accident records`,
    current: currentStep,
    source,
  });

  const [existingAccidentRows, existingImageRows, accidentIdResult, imageIdResult] = await Promise.all([
    db.select({ wikipedia_url: accidents.wikipedia_url }).from(accidents),
    db.select({ wikipedia_url: images.wikipedia_url, image_index: images.image_index, full_src: images.full_src }).from(images),
    db.select({ maxId: sql<number>`coalesce(max(${accidents.id}), 0)::int` }).from(accidents),
    db.select({ maxId: sql<number>`coalesce(max(${images.id}), 0)::int` }).from(images),
  ]);

  const existingAccidentUrls = new Set(
    existingAccidentRows
      .map((row) => normalizeText(row.wikipedia_url))
      .filter(Boolean),
  );
  const existingImageKeys = new Set(
    existingImageRows.map((row) => buildImageKey(normalizeText(row.wikipedia_url), row.image_index, normalizeText(row.full_src))),
  );
  const maxAccidentId = Number(accidentIdResult[0]?.maxId ?? 0);
  const maxImageId = Number(imageIdResult[0]?.maxId ?? 0);

  const newAccidentRecords = records.filter((row) => {
    const wikipediaUrl = normalizeText(row.wikipedia_url);
    return !wikipediaUrl || !existingAccidentUrls.has(wikipediaUrl);
  });
  const newAccidentRows = buildAccidentRows(newAccidentRecords, maxAccidentId + 1);

  const newImageRows = records
    .flatMap((row) => buildImageRowsForRecord(row))
    .filter((image) => {
      const imageKey = buildImageKey(image.wikipedia_url, image.image_index, image.full_src);
      if (existingImageKeys.has(imageKey)) {
        return false;
      }

      existingImageKeys.add(imageKey);
      return true;
    })
    .map((image, index) => ({
      ...image,
      id: maxImageId + index + 1,
    }));

  currentStep += 1;

  const accidentInsertBatches = chunk(newAccidentRows, 200);
  const imageInsertBatches = chunk(newImageRows, 300);
  const totalSteps = 2 + accidentInsertBatches.length + imageInsertBatches.length + 1;

  emitProgress({
    stage: 'processing-records',
    message: `Found ${newAccidentRows.length.toLocaleString()} new accidents and ${newImageRows.length.toLocaleString()} new images`,
    current: currentStep,
    total: totalSteps,
    source,
  });

  await db.transaction(async (tx) => {
    for (const [batchIndex, batch] of accidentInsertBatches.entries()) {
      await tx.insert(accidents).values(batch);
      currentStep += 1;
      emitProgress({
        stage: 'storing-accidents',
        message: `Writing new accident rows ${batchIndex + 1} of ${accidentInsertBatches.length}`,
        current: currentStep,
        total: totalSteps,
        source,
      });
    }

    for (const [batchIndex, batch] of imageInsertBatches.entries()) {
      await tx.insert(images).values(batch);
      currentStep += 1;
      emitProgress({
        stage: 'storing-images',
        message: `Writing new image rows ${batchIndex + 1} of ${imageInsertBatches.length}`,
        current: currentStep,
        total: totalSteps,
        source,
      });
    }

    const metaEntries = [
      { key: 'refreshed_at', value: new Date().toISOString() },
      ...(remoteDataVersion ? [{ key: REMOTE_DATA_VERSION_META_KEY, value: remoteDataVersion }] : []),
    ];

    if (newAccidentRows.length > 0) {
      await tx.delete(accident_embeddings);
      metaEntries.push(
        { key: 'embedding_model', value: EMBEDDING_MODEL_ID },
        { key: 'embedding_dimensions', value: String(BROWSER_EMBEDDING_DIMENSIONS) },
        { key: 'semantic_search_enabled', value: 'false' },
        { key: 'semantic_search_reason', value: EMBEDDINGS_NOT_GENERATED_REASON },
      );
    }

    await tx.delete(meta).where(inArray(meta.key, metaEntries.map((entry) => entry.key)));
    await tx.insert(meta).values(metaEntries);
  });

  currentStep += 1;
  emitProgress({
    stage: 'finalizing',
    message: `Database update complete. Added ${newAccidentRows.length.toLocaleString()} accidents and ${newImageRows.length.toLocaleString()} images.`,
    current: currentStep,
    total: totalSteps,
    source,
  });
}

async function prepareForEmbeddingGeneration(expectedDims: number) {
  await ensureSchema();
  const db = await getDB();
  const storedDims = await getStoredEmbeddingDimensions();

  const isIncremental = storedDims > 0 && storedDims === expectedDims;

  if (!isIncremental) {
    await recreateEmbeddingTable(expectedDims);
  }

  let accidentRows: (typeof accidents.$inferSelect)[];
  if (isIncremental) {
    const rawRows = await db
      .select({ accident: accidents })
      .from(accidents)
      .leftJoin(accident_embeddings, eq(accidents.id, accident_embeddings.accident_id))
      .where(isNull(accident_embeddings.accident_id))
      .orderBy(asc(accidents.id));
    accidentRows = rawRows.map((r) => r.accident);
  } else {
    accidentRows = await db.select().from(accidents).orderBy(asc(accidents.id));
  }

  if (accidentRows.length === 0) {
    const totalCountResp = await db.select({ count: sql<number>`count(*)::int` }).from(accidents);
    const totalCount = totalCountResp[0]?.count || 0;
    if (totalCount === 0) {
      throw new Error('Import accident data before generating embeddings.');
    }
  }

  return { isIncremental, accidentRows };
}

export async function generateEmbeddings(): Promise<void> {
  const source = getDataSource();
  const embConfig = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
  const browserModelId = embConfig.browserModel ?? DEFAULT_BROWSER_MODEL_ID;
  const browserDims = getBrowserModelDimensions(browserModelId);
  startProgress('generating-embeddings', source, 'Preparing embedding generation');

  try {
    const { isIncremental, accidentRows } = await prepareForEmbeddingGeneration(browserDims);
    if (accidentRows.length === 0) {
      completeProgress('All embeddings are already up to date.');
      return;
    }

    const support = await getEmbeddingSupport();

    if (!support.available) {
      throw new Error(support.reason ?? 'Semantic embeddings are not supported in this browser.');
    }

    emitProgress({
      stage: 'preparing',
      message: 'Loading embedding model…',
      current: 1,
      total: 4,
      source,
    });
    const modelProgress = makeModelProgressEmitter(source);
    await warmupEmbeddings(browserModelId, modelProgress);

    const db = await getDB();
    const embeddingBatches = chunk(accidentRows, EMBEDDING_BATCH_SIZE);
    const embeddingRows: AccidentEmbeddingRow[] = [];

    emitProgress({
      stage: 'processing-records',
      message: `Preparing ${accidentRows.length.toLocaleString()} accidents for embedding generation`,
      current: 2,
      total: 4,
      source,
    });

    for (const [batchIndex, batch] of embeddingBatches.entries()) {
      const searchDocuments = batch.map((row) => buildSearchDocument(row));
      const embeddings = await embedTexts(searchDocuments, browserModelId);

      batch.forEach((row, index) => {
        embeddingRows.push({
          accident_id: row.id,
          search_document: searchDocuments[index],
          embedding: embeddings[index],
        });
      });

      emitProgress({
        stage: 'generating-embeddings',
        message: `Generating embeddings batch ${batchIndex + 1} of ${embeddingBatches.length}`,
        current: 3,
        total: 4,
        source,
      });
    }

    const embeddingInsertBatches = chunk(embeddingRows, 100);

    await db.transaction(async (tx) => {
      await tx.delete(accident_embeddings);

      for (const [batchIndex, batch] of embeddingInsertBatches.entries()) {
        await tx.insert(accident_embeddings).values(batch);
        emitProgress({
          stage: 'storing-embeddings',
          message: `Writing embedding rows ${batchIndex + 1} of ${embeddingInsertBatches.length}`,
          current: 3,
          total: 4,
          source,
        });
      }

      const metaEntries = [
        { key: 'embedding_model', value: browserModelId },
        { key: 'embedding_dimensions', value: String(browserDims) },
        { key: 'semantic_search_enabled', value: 'true' },
        { key: 'semantic_search_reason', value: '' },
      ];
      await tx.delete(meta).where(inArray(meta.key, metaEntries.map((entry) => entry.key)));
      await tx.insert(meta).values(metaEntries);
    });

    emitProgress({
      stage: 'finalizing',
      message: `Generated ${embeddingRows.length.toLocaleString()} embeddings`,
      current: 4,
      total: 4,
      source,
    });
    completeProgress('Embedding generation complete. Semantic search is ready.');
  } catch (error) {
    failProgress(error);
    throw error;
  }
}

export async function initDatabase(options?: { forceRefresh?: boolean; sourceOverride?: DataImportSource }): Promise<void> {
  const forceRefresh = options?.forceRefresh ?? false;
  const source = options?.sourceOverride?.source ?? getDataSource();

  if (forceRefresh) {
    initPromise = undefined;
  }

  initPromise ??= (async () => {
    try {
      startProgress(forceRefresh ? 'refreshing' : 'initializing', source, forceRefresh ? 'Preparing database refresh' : 'Preparing accident database');
      await ensureSchema();
      const loaded = await isLoaded();
      const importSource = resolveImportSource(options?.sourceOverride);

      if (forceRefresh || !loaded) {
        if (!importSource) {
          setIdleProgress(source, forceRefresh
            ? 'Choose a JSONL file or enter a URL to refresh the local database.'
            : 'Choose a JSONL file or enter a URL to load accident data.');
          return;
        }

        await seedDatabase(forceRefresh ? 'refreshing' : 'initializing', importSource);
        completeProgress(forceRefresh ? 'Database refresh complete.' : 'Accident database ready.');
      } else {
        completeProgress('Existing in-browser database is up to date.');
      }
    } catch (error) {
      failProgress(error);
      throw error;
    }
  })();

  await initPromise;
}

export async function refreshDatabase(options?: { sourceOverride?: DataImportSource }): Promise<void> {
  initPromise = undefined;
  const importSource = resolveImportSource(options?.sourceOverride);

  if (!importSource) {
    throw new Error('Choose a JSONL file or enter a URL before refreshing the local database.');
  }

  const source = importSource.source;

  try {
    startProgress('refreshing', source, 'Dropping and recreating database schema');
    await recreateSchema();
    await initDatabase({ forceRefresh: true, sourceOverride: importSource });
  } catch (error) {
    failProgress(error);
    throw error;
  }
}

export async function exportEmbeddings(): Promise<Blob> {
  startProgress('exporting-embeddings', getDataSource(), 'Preparing embeddings export');

  try {
    const db = await getDB();
    emitProgress({
      stage: 'exporting-embeddings',
      message: 'Collecting embeddings for export',
      current: 1,
      total: 2,
      source: getDataSource(),
    });

    const rows = await db
      .select({
        wikipedia_url: accidents.wikipedia_url,
        search_document: accident_embeddings.search_document,
        embedding: accident_embeddings.embedding,
      })
      .from(accident_embeddings)
      .innerJoin(accidents, eq(accident_embeddings.accident_id, accidents.id))
      .orderBy(asc(accidents.id));

    const embConfig = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);

    // Read the actual model/dims that were stored when embeddings were generated.
    const metaRows = await (await getDB())
      .select({ key: meta.key, value: meta.value })
      .from(meta)
      .where(inArray(meta.key, ['embedding_model', 'embedding_dimensions']));
    const metaMap = new Map(metaRows.map((r) => [r.key, r.value]));
    const storedModel = metaMap.get('embedding_model') ?? EMBEDDING_MODEL_ID;
    const storedDims = Number(metaMap.get('embedding_dimensions') ?? BROWSER_EMBEDDING_DIMENSIONS);

    const metadata: EmbeddingExportMetadataRecord = {
      type: 'metadata',
      embedding_model: storedModel,
      embedding_dimensions: storedDims,
      exported_at: new Date().toISOString(),
      embedding_config: {
        dimensions: embConfig.dimensions,
        browser_model: embConfig.browserModel ?? DEFAULT_BROWSER_MODEL_ID,
      },
    };
    const lines = [
      JSON.stringify(metadata),
      ...rows.map((row) => JSON.stringify({
        type: 'embedding',
        wikipedia_url: row.wikipedia_url,
        search_document: row.search_document,
        embedding: row.embedding,
      } satisfies EmbeddingExportRecord)),
    ];

    emitProgress({
      stage: 'finalizing',
      message: `Prepared ${rows.length.toLocaleString()} embeddings for export`,
      current: 2,
      total: 2,
      source: getDataSource(),
    });
    completeProgress('Embeddings export ready.');

    return new Blob([lines.join('\n')], { type: 'application/x-ndjson' });
  } catch (error) {
    failProgress(error);
    throw error;
  }
}

export async function importEmbeddings(file: File): Promise<void> {
  startProgress('importing-embeddings', getDataSource(), 'Preparing embeddings import');

  try {
    await ensureSchema();
    const records = await parseJsonlFromFile<EmbeddingExportMetadataRecord | EmbeddingExportRecord>(file);
    const metadata = records.find((record) => record.type === 'metadata');
    const embeddingRecords = records.filter((record) => record.type === 'embedding');

    if (!metadata) {
      throw new Error('The selected embeddings file is missing metadata.');
    }

    // Recreate the embeddings table with the dimensions from the export file so
    // the vector column matches what we are about to insert.
    await recreateEmbeddingTable(metadata.embedding_dimensions);

    emitProgress({
      stage: 'importing-embeddings',
      message: `Processing ${embeddingRecords.length.toLocaleString()} embeddings`,
      current: 1,
      total: 4,
      source: getDataSource(),
    });

    const db = await getDB();
    const [accidentRows, existingEmbeddingRows] = await Promise.all([
      db.select({ id: accidents.id, wikipedia_url: accidents.wikipedia_url }).from(accidents),
      db.select({ accident_id: accident_embeddings.accident_id }).from(accident_embeddings),
    ]);
    const accidentIdByWikipediaUrl = new Map(
      accidentRows
        .map((row) => [normalizeText(row.wikipedia_url), row.id] as const)
        .filter(([wikipediaUrl]) => wikipediaUrl.length > 0),
    );
    const existingEmbeddingIds = new Set(existingEmbeddingRows.map((row) => row.accident_id));

    const rowsToImport: AccidentEmbeddingRow[] = embeddingRecords
      .map((record) => {
        const accidentId = accidentIdByWikipediaUrl.get(normalizeText(record.wikipedia_url));
        if (!accidentId || !Array.isArray(record.embedding)) {
          return null;
        }

        return {
          accident_id: accidentId,
          search_document: record.search_document,
          embedding: record.embedding.map(Number),
        } satisfies AccidentEmbeddingRow;
      })
      .filter((row): row is AccidentEmbeddingRow => row !== null);

    emitProgress({
      stage: 'importing-embeddings',
      message: `Importing ${rowsToImport.length.toLocaleString()} matched embeddings`,
      current: 2,
      total: 4,
      source: getDataSource(),
    });

    const rowsToReplace = rowsToImport.filter((row) => existingEmbeddingIds.has(row.accident_id)).map((row) => row.accident_id);
    const importBatches = chunk(rowsToImport, 100);

    await db.transaction(async (tx) => {
      if (rowsToReplace.length > 0) {
        await tx.delete(accident_embeddings).where(inArray(accident_embeddings.accident_id, rowsToReplace));
      }

      for (const [batchIndex, batch] of importBatches.entries()) {
        await tx.insert(accident_embeddings).values(batch);
        emitProgress({
          stage: 'storing-embeddings',
          message: `Writing imported embedding rows ${batchIndex + 1} of ${importBatches.length}`,
          current: 3,
          total: 4,
          source: getDataSource(),
        });
      }

      const metaEntries = [
        { key: 'embedding_model', value: metadata.embedding_model },
        { key: 'embedding_dimensions', value: metadata.embedding_dimensions.toString() },
        { key: 'semantic_search_enabled', value: 'true' },
        { key: 'semantic_search_reason', value: '' },
      ];
      await tx.delete(meta).where(inArray(meta.key, metaEntries.map((entry) => entry.key)));
      await tx.insert(meta).values(metaEntries);
    });

    emitProgress({
      stage: 'finalizing',
      message: `Imported ${rowsToImport.length.toLocaleString()} embeddings`,
      current: 4,
      total: 4,
      source: getDataSource(),
    });
    completeProgress('Embeddings import complete.');

    const exportedCfg = metadata.embedding_config;
    if (exportedCfg) {
      const currentConfig = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
      const restoredConfig: typeof currentConfig = {
        dimensions: exportedCfg.dimensions > 0 ? exportedCfg.dimensions : currentConfig.dimensions,
        browserModel: exportedCfg.browser_model ?? currentConfig.browserModel ?? DEFAULT_BROWSER_MODEL_ID,
      };
      await saveEmbeddingConfig(restoredConfig);
    }
  } catch (error) {
    failProgress(error);
    throw error;
  }
}

/**
 * Automatically import browser-only pre-built embeddings.
 */
export async function autoSetupEmbeddings(options?: { modelChoice?: 'minilm' | 'gemma' }): Promise<void> {
  const source = getDataSource();
  let url = MINILM_EMBEDDINGS_URL;
  let targetModel = 'Xenova/all-MiniLM-L6-v2';
  const choice = options?.modelChoice;

  if (choice === 'gemma') {
    url = GEMMA_EMBEDDINGS_URL;
    targetModel = 'onnx-community/embeddinggemma-300m-ONNX';
  }

  startProgress('importing-embeddings', source, 'Downloading embeddings');
  emitProgress({
    stage: 'importing-embeddings',
    message: `Downloading ${targetModel} embeddings`,
    current: 1,
    total: 5,
    source,
  });

  try {
    const text = await fetchTextFromUrl(url);
    const file = new File([text], 'embeddings.jsonl');
    await importEmbeddings(file);

    const currentConfig = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
    const newConfig = {
      ...currentConfig,
      browserModel: targetModel,
      dimensions: getBrowserModelDimensions(targetModel),
    };
    await saveEmbeddingConfig(newConfig);
  } catch (error) {
    failProgress(error);
    throw error;
  }
}

async function generateEmbeddingsForConfiguredProvider(): Promise<void> {
  await generateEmbeddings();
}

export async function syncRemoteDataIfNeeded(): Promise<boolean> {
  const source = getDataSource();

  if (!isManagedRemoteDataSource(source)) {
    return false;
  }

  await ensureSchema();

  if (!(await isLoaded())) {
    return false;
  }

  let remoteDataVersion: string;

  try {
    remoteDataVersion = await resolveRemoteDataVersion(source) ?? '';
  } catch (error) {
    console.warn('Automatic remote data version check failed:', error);
    return false;
  }

  if (!remoteDataVersion) {
    return false;
  }

  const storedRemoteDataVersion = await getMetaValue(REMOTE_DATA_VERSION_META_KEY);

  if (storedRemoteDataVersion === remoteDataVersion) {
    return false;
  }

  await refreshDatabase({ sourceOverride: { source } });

  await setMetaEntries([
    { key: REMOTE_DATA_VERSION_META_KEY, value: remoteDataVersion },
  ]);

  try {
    await generateEmbeddingsForConfiguredProvider();
  } catch (error) {
    console.warn('Automatic embedding generation failed after remote data sync:', error);
  }

  return true;
}

export async function getAllAccidents(): Promise<Accident[]> {
  const db = await getDB();
  return db.select().from(accidents).orderBy(desc(accidents.year), desc(accidents.id));
}

export async function getImagesForAccident(wikipediaUrl: string): Promise<AccidentImage[]> {
  const db = await getDB();
  return db
    .select({
      wikipedia_url: images.wikipedia_url,
      page_title: images.page_title,
      year: images.year,
      image_index: images.image_index,
      src: images.src,
      full_src: images.full_src,
      alt: images.alt,
      caption: images.caption,
    })
    .from(images)
    .where(eq(images.wikipedia_url, wikipediaUrl))
    .orderBy(asc(images.image_index));
}

function buildSeverityCondition(severities: SeverityType[]) {
  if (severities.length === 0 || severities.length === 3) {
    return undefined;
  }

  return or(
    ...severities.map((severity) => {
      switch (severity) {
        case 'fatal':
          return sql`${accidents.total_fatalities} > 0`;
        case 'serious':
          return sql`${accidents.total_fatalities} = 0 AND ${accidents.total_injuries} > 0`;
        case 'incident':
        default:
          return sql`${accidents.total_fatalities} = 0 AND ${accidents.total_injuries} = 0`;
      }
    }),
  );
}

function buildFilterConditions(filters: FilterState) {
  const conditions = [
    gte(accidents.year, filters.yearRange[0]),
    lte(accidents.year, filters.yearRange[1]),
  ];

  if (filters.aircraftTypes.length > 0) {
    conditions.push(inArray(accidents.aircraft_type, filters.aircraftTypes));
  }

  const severityCondition = buildSeverityCondition(filters.severities);
  if (severityCondition) {
    conditions.push(severityCondition);
  }

  return and(...conditions);
}

async function embedSearchQuery(searchQuery: string) {
  const embConfig = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
  const browserModelId = embConfig.browserModel ?? DEFAULT_BROWSER_MODEL_ID;
  const modelProgress = makeModelProgressEmitter(getDataSource());
  return embedText(searchQuery, browserModelId, modelProgress);
}

export async function queryAccidents(filters: AccidentQueryState): Promise<Accident[]> {
  const db = await getDB();
  const whereClause = buildFilterConditions(filters);
  const searchQuery = filters.searchQuery.trim();

  if (!searchQuery) {
    return db.select().from(accidents).where(whereClause).orderBy(desc(accidents.year), desc(accidents.id));
  }

  const normalizedSearch = `%${searchQuery.toLowerCase()}%`;
  const originDestinationSiteCondition = or(
    sql`lower(${accidents.flight_origin}) like ${normalizedSearch} escape '\\'`,
    sql`lower(${accidents.destination}) like ${normalizedSearch} escape '\\'`,
    sql`lower(${accidents.site}) like ${normalizedSearch} escape '\\'`,
  );

  const originDestinationSiteRows = await db
    .select()
    .from(accidents)
    .where(and(whereClause, originDestinationSiteCondition))
    .orderBy(desc(accidents.year), desc(accidents.id))
    .limit(MAX_SEMANTIC_SEARCH_RESULTS);

  const normalizedNeedle = searchQuery.toLowerCase();
  const originDestinationSiteMatches: Accident[] = originDestinationSiteRows.map((row) => {
    const origin = row.flight_origin.toLowerCase();
    const destination = row.destination.toLowerCase();

    if (origin.includes(normalizedNeedle)) {
      return {
        ...row,
        searchMatchSource: 'origin',
      };
    }

    if (destination.includes(normalizedNeedle)) {
      return {
        ...row,
        searchMatchSource: 'destination',
      };
    }

    return {
      ...row,
      searchMatchSource: 'site',
    };
  });

  const originDestinationSiteIds = new Set(originDestinationSiteMatches.map((row) => row.id));

  const status = await getDatabaseStatus();
  if (!status.semanticSearchAvailable) {
    return originDestinationSiteMatches;
  }

  const embConfig = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
  const baseCutoff = getSimilarityCutoff(embConfig);

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedSearchQuery(searchQuery);
  } catch {
    // Could not embed query — return text-only results.
    return originDestinationSiteMatches;
  }

  // Validate dimensions: the query embedding must match the stored column dimensions.
  const storedDims = await getStoredEmbeddingDimensions();
  if (storedDims > 0 && queryEmbedding.length !== storedDims) {
    console.warn(
      `Embedding dimension mismatch: query has ${queryEmbedding.length}d but stored embeddings are ${storedDims}d. ` +
      `Falling back to text search. Re-import or regenerate embeddings to fix.`,
    );
    return originDestinationSiteMatches;
  }

  try {
    const queryVector = JSON.stringify(queryEmbedding);
    const distance = sql<number>`${accident_embeddings.embedding} <=> ${queryVector}`;
    const similarity = sql<number>`1 - (${distance})`;
    const rankedRows = db
      .select({
        id: accidents.id,
        similarity: similarity.as('similarity'),
      })
      .from(accidents)
      .innerJoin(accident_embeddings, eq(accident_embeddings.accident_id, accidents.id))
      .where(whereClause)
      .orderBy(asc(distance))
      .limit(MAX_SEMANTIC_CANDIDATES)
      .as('ranked_rows');

    const rows = await db
      .select({
        accident: accidents,
        similarity: rankedRows.similarity,
      })
      .from(rankedRows)
      .innerJoin(accidents, eq(accidents.id, rankedRows.id))
      .orderBy(desc(rankedRows.similarity), desc(accidents.year), desc(accidents.id))
      .limit(MAX_SEMANTIC_SEARCH_RESULTS);

    // Auto-lower the cutoff by 10 percentage points until matches are found (floor: 0).
    let cutoff = baseCutoff;
    let semanticRows = rows
      .filter((row) => !originDestinationSiteIds.has(row.accident.id))
      .filter((row) => row.similarity >= cutoff);
    while (semanticRows.length === 0 && cutoff > 0) {
      cutoff = Math.max(0, cutoff - 0.1);
      semanticRows = rows
        .filter((row) => !originDestinationSiteIds.has(row.accident.id))
        .filter((row) => row.similarity >= cutoff);
    }

    return [...originDestinationSiteMatches, ...semanticRows.map((row) => ({
      ...row.accident,
      searchMatchPercent: normalizeMatchPercent(row.similarity),
    }))].slice(0, MAX_SEMANTIC_SEARCH_RESULTS);
  } catch (semanticError) {
    console.warn('Semantic search failed, returning text-only results:', semanticError);
    return originDestinationSiteMatches;
  }
}



export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const db = await getDB();
  await ensureSchema();

  const [metaRows, accidentCountResult, imageCountResult, embeddingCountResult] = await Promise.all([
    db.select({ key: meta.key, value: meta.value }).from(meta).where(
      inArray(meta.key, [
        'loaded',
        'refreshed_at',
        'embedding_model',
        'embedding_dimensions',
        'semantic_search_enabled',
        'semantic_search_reason',
      ]),
    ),
    db.select({ count: sql<number>`count(*)::int` }).from(accidents),
    db.select({ count: sql<number>`count(*)::int` }).from(images),
    db.select({ count: sql<number>`count(*)::int` }).from(accident_embeddings),
  ]);

  const metaMap = new Map(metaRows.map((row) => [row.key, row.value]));
  const support = await getEmbeddingSupport();
  const loaded = metaMap.get('loaded') === 'true';
  const storedDimensions = Number(metaMap.get('embedding_dimensions') ?? 0);
  const storedSemanticSearchEnabled = metaMap.get('semantic_search_enabled') === 'true';
  const storedSemanticSearchReason = metaMap.get('semantic_search_reason') || null;
  const embeddingCount = Number(embeddingCountResult[0]?.count ?? 0);

  const embConfig = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
  const expectedDimensions = embConfig.dimensions;

  let semanticSearchAvailable = false;
  let semanticSearchReason: string | null = null;

  if (!support.available) {
    semanticSearchReason = support.reason;
  } else if (!loaded) {
    semanticSearchReason = 'Import accident data to enable semantic search.';
  } else if (storedDimensions > 0 && embeddingCount > 0 && storedDimensions !== expectedDimensions) {
    semanticSearchReason = `Stored embeddings use ${storedDimensions} dimensions but current config expects ${expectedDimensions}. Regenerate embeddings.`;
  } else if (!storedSemanticSearchEnabled || embeddingCount === 0) {
    semanticSearchReason = storedSemanticSearchReason ?? EMBEDDINGS_NOT_GENERATED_REASON;
  } else {
    semanticSearchAvailable = true;
  }

  return {
    loaded,
    accidentCount: Number(accidentCountResult[0]?.count ?? 0),
    imageCount: Number(imageCountResult[0]?.count ?? 0),
    refreshedAt: metaMap.get('refreshed_at') ?? null,
    semanticSearchAvailable,
    semanticSearchReason,
  };
}
