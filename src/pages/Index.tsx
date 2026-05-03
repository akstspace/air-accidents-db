import { useEffect, useRef, useState } from 'react';

import DataSourceDialog from '@/components/DataSourceDialog';
import FilterSidebar from '@/components/FilterSidebar';
import TopNav from '@/components/TopNav';
import AccidentMap from '@/components/AccidentMap';
import { AircraftTypeChart, CausesChart, AnnualCrashesChart } from '@/components/Charts';
import IncidentTable from '@/components/IncidentTable';
import StatsBar from '@/components/StatsBar';
import RecentIncidents from '@/components/RecentIncidents';
import TodayInHistory from '@/components/TodayInHistory';
import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, Loader2, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const {
    loading,
    filteredAccidents,
    databaseProgress,
    databaseStatus,
    importFromFile,
    importFromUrl,
    dataSource,
    autoSetupSearchEmbeddings,
    accidents,
  } = useDashboard();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const autoSetupTriggeredRef = useRef(false);
  const navigate = useNavigate();

  const requiresImport = !loading && !databaseStatus.loaded;

  useEffect(() => {
    if (requiresImport) {
      setShowImportDialog(true);
    }
  }, [requiresImport]);

  useEffect(() => {
    if (!loading && databaseStatus.loaded && !databaseStatus.semanticSearchAvailable && !autoSetupTriggeredRef.current) {
      autoSetupTriggeredRef.current = true;
      // Run embedding setup in the background without blocking the UI
      void autoSetupSearchEmbeddings({ modelChoice: 'minilm' });
    }
    // autoSetupSearchEmbeddings is stable from context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, databaseStatus.loaded, databaseStatus.semanticSearchAvailable]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex w-full max-w-sm flex-col gap-3 border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Loading accident database…
              </p>
              <p className="text-xs text-muted-foreground">
                Downloading data
              </p>
            </div>
          </div>
          <Progress value={databaseProgress.percent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {databaseProgress.total > 0
              ? `${databaseProgress.current} of ${databaseProgress.total} steps completed`
              : 'Preparing data'}
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Incidents', value: accidents.length.toLocaleString() },
    { label: 'Visible', value: filteredAccidents.length.toLocaleString() },
    { label: 'Aircraft Types', value: new Set(accidents.map(a => a.aircraft_type).filter(Boolean)).size.toLocaleString() },
    { label: 'Countries', value: new Set(accidents.map(a => a.site).filter(Boolean)).size.toLocaleString() },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen flex flex-col"
    >
      <TopNav />

      {/* Hero Section */}
      <section className="border-b-2 border-primary bg-background">
        <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="font-heading text-4xl font-extrabold leading-[1.05] text-foreground sm:text-5xl">
                Aviation Safety<br />Archive
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Explore aviation incidents through interactive maps, search, and data visualization.
              </p>
            </div>
            <div className="grid grid-cols-2 border border-border" style={{ gap: '1px', background: 'var(--color-border)' }}>
              {stats.map((s) => (
                <div key={s.label} className="bg-background p-5 sm:p-6">
                  <p className="font-heading text-2xl font-bold leading-none text-foreground">{s.value}</p>
                  <p className="mt-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-screen-2xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dashboard</p>
            <p className="text-lg font-bold tracking-[-0.02em] text-foreground">{filteredAccidents.length.toLocaleString()} visible accidents</p>
          </div>
          <div className="flex items-center gap-2">
            {!databaseStatus.loaded && (
              <Button variant="secondary" onClick={() => setShowImportDialog(true)}>
                Import JSONL
              </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-sm border-r border-border bg-background p-0">
                <SheetHeader className="px-6 py-5">
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>Refine the dashboard dataset while keeping the map in view.</SheetDescription>
                </SheetHeader>
                <div className="px-6 pb-6">
                  <FilterSidebar className="border-0 bg-transparent shadow-none" />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left Column */}
          <div className="min-w-0 space-y-6">
            <section>
              <div className="mb-3 flex items-baseline justify-between border-b border-border pb-2">
                <h2 className="font-heading text-lg font-bold text-foreground">Global Distribution</h2>
              </div>
              <div className="min-h-[360px] min-w-0 overflow-hidden border border-border bg-card">
                <AccidentMap variant="dashboard" />
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 border-b border-border pb-2 font-heading text-base font-semibold text-foreground">Aircraft Types</h3>
                <div className="min-w-0 overflow-hidden border border-border bg-card">
                  <AircraftTypeChart />
                </div>
              </div>
              <div>
                <h3 className="mb-3 border-b border-border pb-2 font-heading text-base font-semibold text-foreground">Primary Causes</h3>
                <div className="min-w-0 overflow-hidden border border-border bg-card">
                  <CausesChart />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 border-b border-border pb-2 font-heading text-base font-semibold text-foreground">Annual Crash Trend</h3>
              <div className="min-w-0 overflow-hidden border border-border bg-card">
                <AnnualCrashesChart />
              </div>
            </section>

            <section>
              <IncidentTable />
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <aside className="min-w-0 space-y-6">
            {/* Search Box */}
            <div className="border border-border p-4">
              <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Search Archive</p>
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => navigate('/search')}
              >
                <Search className="mr-2 h-4 w-4" />
                Search incidents…
              </Button>
            </div>

            <RecentIncidents />
            <TodayInHistory />
          </aside>
        </div>

        <p className="pb-2 text-center text-xs text-muted-foreground/80">
          Accident records and article summaries are sourced from{' '}
          <a
            href="https://www.wikipedia.org/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
          >
            Wikipedia
          </a>
          .
        </p>

        <DataSourceDialog
          open={requiresImport || showImportDialog}
          required={requiresImport}
          busy={databaseProgress.active}
          statusMessage={databaseProgress.active ? 'Downloading data…' : undefined}
          initialUrl={dataSource.type === 'url' ? dataSource.dataUrl : ''}
          onOpenChange={setShowImportDialog}
          onImportFromUrl={importFromUrl}
          onImportFromFile={importFromFile}
        />
      </main>
    </motion.div>
  );
}
