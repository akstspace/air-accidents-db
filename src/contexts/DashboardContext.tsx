import React, { createContext, startTransition, useContext, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createFileDataSource, createUrlDataSource, getDataSource, setDataSource as persistDataSource } from '@/lib/data-source';
import { autoSetupEmbeddings, exportEmbeddings, generateEmbeddings, generateEmbeddingsWithOpenAI, generateEmbeddingsWithOllama, getAllAccidents, getDatabaseProgress, getDatabaseStatus, importEmbeddings, initDatabase, queryAccidents, refreshDatabase, subscribeToDatabaseProgress, updateDatabase } from '@/lib/db';
import { DEFAULT_EMBEDDING_CONFIG, getEmbeddingConfig, migrateOldOllamaConfig, saveEmbeddingConfig, type EmbeddingConfig } from '@/lib/app-config';
import type { Accident, DataSourceConfig, DatabaseProgress, DatabaseStatus, FilterState } from '@/lib/types';

interface DashboardContextType {
  accidents: Accident[];
  filteredAccidents: Accident[];
  searchResultCount: number;
  searchMatchThreshold: number;
  setSearchMatchThreshold: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  searching: boolean;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSearchPageActive: React.Dispatch<React.SetStateAction<boolean>>;
  selectedAccident: Accident | null;
  setSelectedAccident: (a: Accident | null) => void;
  allAircraftTypes: string[];
  yearBounds: [number, number];
  databaseStatus: DatabaseStatus;
  databaseProgress: DatabaseProgress;
  dataSource: DataSourceConfig;
  embeddingConfig: EmbeddingConfig;
  setEmbeddingConfig: (config: EmbeddingConfig) => Promise<void>;
  rebuildFromUrl: (url: string) => Promise<void>;
  rebuildFromFile: (file: File) => Promise<void>;
  updateFromUrl: (url: string) => Promise<void>;
  updateFromFile: (file: File) => Promise<void>;
  importFromUrl: (url: string) => Promise<void>;
  importFromFile: (file: File) => Promise<void>;
  refreshData: () => Promise<void>;
  generateSearchEmbeddings: () => Promise<void>;
  generateSearchEmbeddingsWithOllama: (config: { endpoint: string; model: string; dimensions: number }) => Promise<void>;
  generateSearchEmbeddingsWithOpenAI: (config: { apiKey: string; model: string; dimensions: number; baseUrl?: string }) => Promise<void>;
  exportSearchData: () => Promise<Blob>;
  importSearchData: (file: File) => Promise<void>;
  autoSetupSearchEmbeddings: (options?: { modelChoice?: 'qwen-4b' | 'minilm' | 'gemma' }) => Promise<void>;
  refreshing: boolean;
}

const DashboardContext = createContext<DashboardContextType>(null!);

export function useDashboard() {
  return useContext(DashboardContext);
}

export function DashboardProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [dashboardFilteredAccidents, setDashboardFilteredAccidents] = useState<Accident[]>([]);
  const [searchResults, setSearchResults] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchPageActive, setSearchPageActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchThreshold, setSearchMatchThreshold] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<Accident | null>(null);
  const [databaseProgress, setDatabaseProgress] = useState<DatabaseProgress>(getDatabaseProgress());
  const [dataSource, setDataSource] = useState(() => getDataSource());
  const [embeddingConfig, setEmbeddingConfigState] = useState<EmbeddingConfig>(DEFAULT_EMBEDDING_CONFIG);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>({
    loaded: false,
    accidentCount: 0,
    imageCount: 0,
    refreshedAt: null,
    semanticSearchAvailable: false,
    semanticSearchReason: null,
  });
  const [filters, setFilters] = useState<FilterState>({
    yearRange: [1919, 2024],
    aircraftTypes: [],
    severities: ['fatal', 'serious', 'incident'],
  });
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const loadDashboardState = async (activeFilters: FilterState) => {
    const [data, filteredData, status] = await Promise.all([
      getAllAccidents(),
      queryAccidents({
        ...activeFilters,
        searchQuery: '',
      }),
      getDatabaseStatus(),
    ]);

    setAccidents(data);
    setDashboardFilteredAccidents(filteredData);
    setDatabaseStatus(status);

    if (data.length > 0) {
      const years = data.map((accident) => accident.year).filter((year) => year > 0);
      setFilters((current) => ({
        ...current,
        yearRange: [Math.min(...years), Math.max(...years)],
      }));
    }
  };

  const effectiveSearchFilters = useMemo(
    () => ({
      ...filters,
      searchQuery: deferredSearchQuery,
    }),
    [deferredSearchQuery, filters],
  );

  useEffect(() => {
    const load = async () => {
      await migrateOldOllamaConfig().catch(() => undefined);
      const savedEmbeddingConfig = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
      setEmbeddingConfigState(savedEmbeddingConfig);

      await initDatabase();
      await loadDashboardState({
        yearRange: filters.yearRange,
        aircraftTypes: [],
        severities: ['fatal', 'serious', 'incident'],
      });
      setLoading(false);
    };

    void load();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDatabaseProgress(setDatabaseProgress);
    return unsubscribe;
  }, []);

  const allAircraftTypes = useMemo(() => {
    const types = new Set(accidents.map((a) => a.aircraft_type).filter(Boolean));
    return Array.from(types).sort((left, right) => left.localeCompare(right));
  }, [accidents]);

  const yearBounds = useMemo<[number, number]>(() => {
    const years = accidents.map((a) => a.year).filter((y) => y > 0);
    return years.length ? [Math.min(...years), Math.max(...years)] : [1919, 2024];
  }, [accidents]);

  useEffect(() => {
    if (loading) {
      return;
    }

    let cancelled = false;

    const loadFiltered = async () => {
      const data = await queryAccidents({
        ...filters,
        searchQuery: '',
      });

      if (!cancelled) {
        startTransition(() => {
          setDashboardFilteredAccidents(data);
        });
      }
    };

    void loadFiltered();

    return () => {
      cancelled = true;
    };
  }, [filters, loading]);

  useEffect(() => {
    if (databaseStatus.semanticSearchAvailable || !searchQuery) {
      return;
    }

    setSearchQuery('');
  }, [databaseStatus.semanticSearchAvailable, searchQuery]);

  useEffect(() => {
    if (loading) {
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      const hasCommittedQuery = effectiveSearchFilters.searchQuery.trim().length > 0;

      setSearching(hasCommittedQuery);

      if (!hasCommittedQuery) {
        startTransition(() => {
          setSearchResults([]);
          setSearching(false);
        });
        return;
      }

      startTransition(() => {
        setSearchResults([]);
      });

      const data = await queryAccidents(effectiveSearchFilters);

      if (!cancelled) {
        startTransition(() => {
          setSearchResults(data);
          setSearching(false);
        });
      }
    };

    void runSearch();

    return () => {
      cancelled = true;
      setSearching(false);
    };
  }, [effectiveSearchFilters, loading]);

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await refreshDatabase();
      await loadDashboardState(filters);
    } finally {
      setRefreshing(false);
    }
  };

  const persistSource = (source: DataSourceConfig) => {
    const normalizedSource = persistDataSource(source);
    setDataSource(normalizedSource);
    setDatabaseProgress((current) => ({
      ...current,
      source: normalizedSource,
    }));

    return normalizedSource;
  };

  const persistEmbeddingConfig = async (config: EmbeddingConfig) => {
    const saved = await saveEmbeddingConfig(config);
    setEmbeddingConfigState(saved);
  };

  const rebuildFromUrl = async (url: string) => {
    setRefreshing(true);

    try {
      const source = persistSource(createUrlDataSource(url));
      await refreshDatabase({
        sourceOverride: { source },
      });
      await loadDashboardState(filters);
    } finally {
      setRefreshing(false);
    }
  };

  const rebuildFromFile = async (file: File) => {
    setRefreshing(true);

    try {
      const source = persistSource(createFileDataSource(file.name));
      await refreshDatabase({
        sourceOverride: { source, file },
      });
      await loadDashboardState(filters);
    } finally {
      setRefreshing(false);
    }
  };

  const updateFromUrl = async (url: string) => {
    setRefreshing(true);

    try {
      const source = persistSource(createUrlDataSource(url));
      await updateDatabase({
        sourceOverride: { source },
      });
      await loadDashboardState(filters);
    } finally {
      setRefreshing(false);
    }
  };

  const updateFromFile = async (file: File) => {
    setRefreshing(true);

    try {
      const source = persistSource(createFileDataSource(file.name));
      await updateDatabase({
        sourceOverride: { source, file },
      });
      await loadDashboardState(filters);
    } finally {
      setRefreshing(false);
    }
  };

  const importFromUrl = async (url: string) => {
    await rebuildFromUrl(url);
  };

  const importFromFile = async (file: File) => {
    await rebuildFromFile(file);
  };

  const exportSearchData = async () => {
    return exportEmbeddings();
  };

  const generateSearchEmbeddings = async () => {
    setRefreshing(true);

    try {
      await generateEmbeddings();
      await loadDashboardState(filters);
    } finally {
      setRefreshing(false);
    }
  };

  const generateSearchEmbeddingsWithOllama = async (config: { endpoint: string; model: string; dimensions: number }) => {
    setRefreshing(true);

    try {
      await generateEmbeddingsWithOllama(config);
      await loadDashboardState(filters);
    } finally {
      setRefreshing(false);
    }
  };

  const generateSearchEmbeddingsWithOpenAI = async (config: { apiKey: string; model: string; dimensions: number; baseUrl?: string }) => {
    setRefreshing(true);

    try {
      await generateEmbeddingsWithOpenAI(config);
      await loadDashboardState(filters);
    } finally {
      setRefreshing(false);
    }
  };

  const importSearchData = async (file: File) => {
    setRefreshing(true);

    try {
      await importEmbeddings(file);
      const updatedConfig = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
      setEmbeddingConfigState(updatedConfig);
      await loadDashboardState(filters);
    } finally {
      setRefreshing(false);
    }
  };

  const autoSetupSearchEmbeddings = async (options?: { modelChoice?: 'qwen-4b' | 'minilm' | 'gemma' }) => {
    setRefreshing(true);

    try {
      await autoSetupEmbeddings(options);
      const updatedConfig = await getEmbeddingConfig().catch(() => DEFAULT_EMBEDDING_CONFIG);
      setEmbeddingConfigState(updatedConfig);
      await loadDashboardState(filters);
    } finally {
      setRefreshing(false);
    }
  };

  const searchResultCount = useMemo(
    () => (searchPageActive && searchQuery.trim().length > 0 ? searchResults.length : 0),
    [searchPageActive, searchQuery, searchResults.length],
  );

  const filteredAccidents = useMemo(() => {
    if (!(searchPageActive && searchQuery.trim().length > 0)) {
      return dashboardFilteredAccidents;
    }

    return searchResults.filter((accident) => {
      if (accident.searchMatchPercent === undefined || accident.searchMatchPercent === null) {
        return true;
      }

      return accident.searchMatchPercent >= searchMatchThreshold;
    });
  }, [dashboardFilteredAccidents, searchMatchThreshold, searchPageActive, searchQuery, searchResults]);

  const value = useMemo(
    () => ({
      accidents,
      filteredAccidents,
      searchResultCount,
      searchMatchThreshold,
      setSearchMatchThreshold,
      loading,
      searching,
      filters,
      setFilters,
      searchQuery,
      setSearchQuery,
      setSearchPageActive,
      selectedAccident,
      setSelectedAccident,
      allAircraftTypes,
      yearBounds,
      databaseStatus,
      databaseProgress,
      dataSource,
      embeddingConfig,
      setEmbeddingConfig: persistEmbeddingConfig,
      rebuildFromUrl,
      rebuildFromFile,
      updateFromUrl,
      updateFromFile,
      importFromUrl,
      importFromFile,
      refreshData,
      generateSearchEmbeddings,
      generateSearchEmbeddingsWithOllama,
      generateSearchEmbeddingsWithOpenAI,
      exportSearchData,
      importSearchData,
      autoSetupSearchEmbeddings,
      refreshing,
    }),
    [
      accidents,
      allAircraftTypes,
      dataSource,
      databaseProgress,
      databaseStatus,
      exportSearchData,
      filteredAccidents,
      filters,
      embeddingConfig,
      searchResultCount,
      searchMatchThreshold,
      importSearchData,
      autoSetupSearchEmbeddings,
      importFromFile,
      importFromUrl,
      loading,
      rebuildFromFile,
      rebuildFromUrl,
      generateSearchEmbeddings,
      generateSearchEmbeddingsWithOllama,
      generateSearchEmbeddingsWithOpenAI,
      searching,
      refreshing,
      searchQuery,
      selectedAccident,
      persistEmbeddingConfig,
      setSearchMatchThreshold,
      updateFromFile,
      updateFromUrl,
      yearBounds,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
