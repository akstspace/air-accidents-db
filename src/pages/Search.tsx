import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

import DataSourceDialog from '@/components/DataSourceDialog';
import TopNav from '@/components/TopNav';
import AccidentMap from '@/components/AccidentMap';
import { AircraftTypeChart, AnnualCrashesChart, CausesChart } from '@/components/Charts';
import IncidentTable from '@/components/IncidentTable';
import StatsBar from '@/components/StatsBar';
import { useDashboard } from '@/contexts/DashboardContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SeverityType } from '@/lib/types';
import { CalendarRange, Loader2, Plane, RotateCcw, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';

const SEARCH_PROMPTS = [
  'controlled flight into terrain in mountainous weather',
  'mid-air collision during approach',
  'engine fire after takeoff with survivors',
];

const SEVERITY_DOT: Record<SeverityType, string> = {
  fatal: 'bg-severity-fatal',
  serious: 'bg-severity-serious',
  incident: 'bg-severity-incident',
};

function SearchFilters() {
  const { filters, setFilters, allAircraftTypes, yearBounds } = useDashboard();
  const [aircraftOpen, setAircraftOpen] = useState(false);
  const [aircraftSearch, setAircraftSearch] = useState('');

  const isDefault =
    filters.yearRange[0] === yearBounds[0] &&
    filters.yearRange[1] === yearBounds[1] &&
    filters.aircraftTypes.length === 0 &&
    filters.severities.length === 3;

  const resetFilters = () => {
    setFilters({ yearRange: yearBounds, aircraftTypes: [], severities: ['fatal', 'serious', 'incident'] });
  };

  const toggleSeverity = (s: SeverityType) => {
    setFilters((f) => ({
      ...f,
      severities: f.severities.includes(s) ? f.severities.filter((x) => x !== s) : [...f.severities, s],
    }));
  };

  const toggleAircraftType = (t: string) => {
    setFilters((f) => ({
      ...f,
      aircraftTypes: f.aircraftTypes.includes(t) ? f.aircraftTypes.filter((x) => x !== t) : [...f.aircraftTypes, t],
    }));
  };

  const visibleTypes = aircraftSearch
    ? allAircraftTypes.filter((t) => t.toLowerCase().includes(aircraftSearch.toLowerCase()))
    : allAircraftTypes;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Year range */}
      <div className="flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 text-sm">
        <CalendarRange className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Input
          type="number"
          min={yearBounds[0]}
          max={filters.yearRange[1]}
          value={filters.yearRange[0]}
          onChange={(e) => setFilters((f) => ({ ...f, yearRange: [Number(e.target.value), f.yearRange[1]] }))}
          className="h-6 w-[4.5rem] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="number"
          min={filters.yearRange[0]}
          max={yearBounds[1]}
          value={filters.yearRange[1]}
          onChange={(e) => setFilters((f) => ({ ...f, yearRange: [f.yearRange[0], Number(e.target.value)] }))}
          className="h-6 w-[4.5rem] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Aircraft type */}
      <Popover open={aircraftOpen} onOpenChange={setAircraftOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Plane className="mr-1 h-3.5 w-3.5" />
            Aircraft
            {filters.aircraftTypes.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[0.65rem]">
                {filters.aircraftTypes.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <Input
            placeholder="Search aircraft types…"
            value={aircraftSearch}
            onChange={(e) => setAircraftSearch(e.target.value)}
            className="mb-2 h-8 text-xs"
          />
          <ScrollArea className="h-56">
            <div className="space-y-2 pr-3">
              {visibleTypes.map((t) => (
                <label key={t} className="flex cursor-pointer items-start gap-2.5 text-xs">
                  <Checkbox
                    checked={filters.aircraftTypes.includes(t)}
                    onCheckedChange={() => toggleAircraftType(t)}
                    className="mt-0.5"
                  />
                  <span className="line-clamp-2">{t}</span>
                </label>
              ))}
              {visibleTypes.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">No aircraft types found</p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Severity pills */}
      {(['fatal', 'serious', 'incident'] as SeverityType[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => toggleSeverity(s)}
          className={cn(
            'flex h-8 items-center gap-1.5 border px-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
            filters.severities.includes(s)
              ? 'border-accent bg-secondary text-foreground'
              : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-accent',
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', SEVERITY_DOT[s])} />
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </button>
      ))}

      {!isDefault && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs text-muted-foreground">
          <RotateCcw className="mr-1 h-3 w-3" />
          Reset
        </Button>
      )}
    </div>
  );
}

function SearchResults({ searching, filteredAccidents, databaseProgress }: Readonly<{ searching: boolean; filteredAccidents: ReturnType<typeof useDashboard>['filteredAccidents']; databaseProgress: ReturnType<typeof useDashboard>['databaseProgress'] }>) {
  if (searching) {
    const isDownloading = databaseProgress.active && databaseProgress.stage === 'preparing';
    return (
      <Card>
        <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDownloading ? databaseProgress.message : 'Searching…'}
          </p>
          {isDownloading && databaseProgress.percent > 0 && (
            <Progress value={databaseProgress.percent} className="mx-auto h-1.5 w-48" />
          )}
        </CardContent>
      </Card>
    );
  }

  if (filteredAccidents.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center">
          <SearchIcon className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No close matches found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <StatsBar />

      <div className="min-h-[400px]">
        <AccidentMap variant="search" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AircraftTypeChart />
        <CausesChart />
      </div>

      <AnnualCrashesChart />
      <IncidentTable />
    </div>
  );
}

export default function Search() {
  const {
    loading,
    searching,
    filteredAccidents,
    databaseProgress,
    databaseStatus,
    searchQuery,
    setSearchPageActive,
    setSearchQuery,
    importFromFile,
    importFromUrl,
    refreshing,
    dataSource,
  } = useDashboard();
  const [draftQuery, setDraftQuery] = useState(searchQuery);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const committedQuery = searchQuery.trim();
  const hasSearchSession = committedQuery.length > 0;
  const requiresImport = !loading && !databaseStatus.loaded;

  useEffect(() => {
    setDraftQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setSearchPageActive(true);

    return () => {
      setSearchPageActive(false);
    };
  }, [setSearchPageActive]);

  useEffect(() => {
    if (requiresImport) {
      setShowImportDialog(true);
    }
  }, [requiresImport]);

  const runSearch = (query: string) => {
    setSearchQuery(query.trim());
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex w-full max-w-sm flex-col gap-3 border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <div>
              <p className="text-sm font-medium">Loading database…</p>
              <p className="text-xs text-muted-foreground">{databaseProgress.message}</p>
            </div>
          </div>
          <Progress value={databaseProgress.percent} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {databaseProgress.total > 0
              ? `${databaseProgress.current} of ${databaseProgress.total} steps`
              : 'Preparing…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen"
    >
      <TopNav />

      {/* Search Hero */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="font-heading text-2xl font-bold text-foreground">Search the Archive</h1>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                runSearch(draftQuery);
              }}
              className="mt-4"
            >
              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                <div className="relative w-full sm:flex-1">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={draftQuery}
                    onChange={(event) => setDraftQuery(event.target.value)}
                    placeholder="Describe an incident: e.g. engine failure after takeoff..."
                    className="h-11 border-0 bg-transparent pl-10 text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
                <Button type="submit" size="default" className="h-11 px-5">
                  {searching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  Search
                </Button>
                {hasSearchSession && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-muted-foreground"
                    onClick={() => {
                      setDraftQuery('');
                      runSearch('');
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Try:</span>
              {SEARCH_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setDraftQuery(prompt);
                    runSearch(prompt);
                  }}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {!hasSearchSession && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mx-auto flex max-w-3xl flex-col items-center gap-4"
          >
            {!databaseStatus.loaded && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowImportDialog(true)}>
                Import JSONL to start searching
              </Button>
            )}
          </motion.div>
        )}

        {hasSearchSession && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 pb-8"
          >
            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
              {/* Filter Sidebar */}
              <aside className="space-y-6">
                <div>
                  <p className="mb-3 border-b border-border pb-2 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Active Filters
                  </p>
                  <SearchFilters />
                </div>

                <div>
                  <p className="mb-3 border-b border-border pb-2 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Quick Stats
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-sm text-muted-foreground">Results</span>
                      <span className="font-semibold">{filteredAccidents.length.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Results */}
              <main className="space-y-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-primary pb-2">
                  <h2 className="font-heading text-xl font-bold text-foreground">Search Results</h2>
                  <span className="text-sm text-muted-foreground">{filteredAccidents.length.toLocaleString()} results</span>
                </div>

                <SearchResults searching={searching} filteredAccidents={filteredAccidents} databaseProgress={databaseProgress} />
              </main>
            </div>
          </motion.section>
        )}

        <DataSourceDialog
          open={requiresImport || showImportDialog}
          required={requiresImport}
          busy={refreshing || databaseProgress.active}
          statusMessage={databaseProgress.message}
          initialUrl={dataSource.type === 'url' ? dataSource.dataUrl : ''}
          onOpenChange={setShowImportDialog}
          onImportFromUrl={importFromUrl}
          onImportFromFile={importFromFile}
        />
      </main>
    </motion.div>
  );
}
