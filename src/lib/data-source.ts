import type { DataSourceConfig } from './types';

const STORAGE_KEY = 'accident-visualizer:data-source';
const LEGACY_STORAGE_KEY = 'accident-visualizer:csv-data-source';

export const DEFAULT_REMOTE_URL =
  'https://raw.githubusercontent.com/akstspace/air-accidents-data/refs/heads/main/accidents.jsonl';

export const DEFAULT_DATA_SOURCE: DataSourceConfig = {
  type: 'url',
  dataUrl: DEFAULT_REMOTE_URL,
  fileName: '',
};

function normalizeUrl(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function normalizeName(value: string | undefined) {
  return value?.trim() ?? '';
}

function normalizeType(source: Partial<DataSourceConfig> | null | undefined, dataUrl: string, fileName: string): DataSourceConfig['type'] {
  if (source?.type === 'url' && dataUrl) {
    return 'url';
  }

  if (source?.type === 'file' && fileName) {
    return 'file';
  }

  if (source?.type === 'none') {
    return 'none';
  }

  if (dataUrl) {
    return 'url';
  }

  if (fileName) {
    return 'file';
  }

  return 'none';
}

export function normalizeDataSource(source: Partial<DataSourceConfig> | null | undefined): DataSourceConfig {
  const dataUrl = normalizeUrl(source?.dataUrl, '');
  const fileName = normalizeName(source?.fileName);
  const type = normalizeType(source, dataUrl, fileName);

  return {
    type,
    dataUrl: type === 'url' ? dataUrl : '',
    fileName: type === 'file' ? fileName : '',
  };
}

export function createUrlDataSource(dataUrl: string): DataSourceConfig {
  return normalizeDataSource({
    type: 'url',
    dataUrl,
  });
}

export function createFileDataSource(fileName: string): DataSourceConfig {
  return normalizeDataSource({
    type: 'file',
    fileName,
  });
}

export function describeDataSource(source: DataSourceConfig) {
  switch (source.type) {
    case 'url':
      return source.dataUrl;
    case 'file':
      return source.fileName || 'Selected local JSONL file';
    case 'none':
    default:
      return 'No data source selected';
  }
}

export function getDataSource(): DataSourceConfig {
  if (globalThis.window === undefined) {
    return DEFAULT_DATA_SOURCE;
  }

  try {
    const rawValue = globalThis.localStorage.getItem(STORAGE_KEY) ?? globalThis.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_DATA_SOURCE;
    }

    return normalizeDataSource(JSON.parse(rawValue) as Partial<DataSourceConfig>);
  } catch {
    return DEFAULT_DATA_SOURCE;
  }
}

export function setDataSource(source: DataSourceConfig) {
  const normalized = normalizeDataSource(source);

  if (globalThis.window !== undefined) {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    globalThis.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  return normalized;
}