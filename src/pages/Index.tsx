import { useEffect, useRef, useState } from 'react';

import DataSourceDialog from '@/components/DataSourceDialog';
import FilterSidebar from '@/components/FilterSidebar';
import TopNav from '@/components/TopNav';
import AccidentMap from '@/components/AccidentMap';
import { AircraftTypeChart, CausesChart, AnnualCrashesChart } from '@/components/Charts';
import IncidentTable from '@/components/IncidentTable';
import AccidentDetail from '@/components/AccidentDetail';
import StatsBar from '@/components/StatsBar';
import DownloadEmbeddingsDialog from '@/components/DownloadEmbeddingsDialog';
import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

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
  } = useDashboard();
  const [settingUpSearch, setSettingUpSearch] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [downloadEmbeddingsDialogOpen, setDownloadEmbeddingsDialogOpen] = useState(false);
  const autoSetupTriggeredRef = useRef(false);

  const requiresImport = !loading && !databaseStatus.loaded;

  useEffect(() => {
    if (requiresImport) {
      setShowImportDialog(true);
    }
  }, [requiresImport]);

  useEffect(() => {
    if (!loading && databaseStatus.loaded && !databaseStatus.semanticSearchAvailable && !autoSetupTriggeredRef.current) {
      autoSetupTriggeredRef.current = true;
      setDownloadEmbeddingsDialogOpen(true);
    }
    // autoSetupSearchEmbeddings is stable from context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, databaseStatus.loaded, databaseStatus.semanticSearchAvailable]);

  if (loading || settingUpSearch) {
    const isSearchSetup = settingUpSearch;
    const idleMessage = isSearchSetup ? 'Preparing semantic search' : 'Preparing data';
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {isSearchSetup ? 'Setting up search...' : 'Loading accident database...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isSearchSetup ? 'Downloading search index' : 'Downloading data'}
              </p>
            </div>
          </div>
          <Progress value={databaseProgress.percent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {databaseProgress.total > 0
              ? `${databaseProgress.current} of ${databaseProgress.total} steps completed`
              : idleMessage}
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
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{filteredAccidents.length.toLocaleString()} visible accidents</p>
            <p className="text-xs text-muted-foreground">Dashboard filters are available in the collapsible sidebar.</p>
          </div>
          <div className="flex items-center gap-2">
            {!databaseStatus.loaded && (
              <Button variant="secondary" className="rounded-full" onClick={() => setShowImportDialog(true)}>
                Import JSONL
              </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-sm border-r border-border/60 bg-background/95 p-0">
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

        <div className="space-y-6">
          <StatsBar />

          <div className="min-h-[420px]">
            <AccidentMap variant="dashboard" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AircraftTypeChart />
            <CausesChart />
          </div>

          <AnnualCrashesChart />
          <IncidentTable />
        </div>

        <AccidentDetail />
        <DataSourceDialog
          open={requiresImport || showImportDialog}
          required={requiresImport}
          busy={databaseProgress.active}
          statusMessage={databaseProgress.active ? 'Downloading data...' : undefined}
          initialUrl={dataSource.type === 'url' ? dataSource.dataUrl : ''}
          onOpenChange={setShowImportDialog}
          onImportFromUrl={importFromUrl}
          onImportFromFile={importFromFile}
        />
        <DownloadEmbeddingsDialog
          open={downloadEmbeddingsDialogOpen}
          onOpenChange={setDownloadEmbeddingsDialogOpen}
        />
      </main>
    </motion.div>
  );
}
