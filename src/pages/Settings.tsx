import { clearEmbeddings } from '@/lib/db';
import { Brain, Database, Download, FileSpreadsheet, FileUp, Globe, Info, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { describeDataSource } from '@/lib/data-source';
import { useDashboard } from '@/contexts/DashboardContext';
import { BROWSER_KNOWN_MODELS, DEFAULT_BROWSER_MODEL_ID, type EmbeddingConfig } from '@/lib/app-config';
import TopNav from '@/components/TopNav';
import DownloadEmbeddingsDialog from '@/components/DownloadEmbeddingsDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function Settings() {
  const {
    refreshData,
    refreshing,
    databaseProgress,
    databaseStatus,
    dataSource,
    embeddingConfig,
    setEmbeddingConfig,
    rebuildFromFile,
    rebuildFromUrl,
    updateFromFile,
    updateFromUrl,
    exportSearchData,
    importSearchData,
    generateSearchEmbeddings,
  } = useDashboard();

  const [dataUrl, setDataUrl] = useState(dataSource.type === 'url' ? dataSource.dataUrl : '');
  const [draftBrowserModel, setDraftBrowserModel] = useState(embeddingConfig.browserModel ?? DEFAULT_BROWSER_MODEL_ID);
  const [draftDimensions, setDraftDimensions] = useState(embeddingConfig.dimensions);
  const [savingConfig, setSavingConfig] = useState(false);
  const [dismissedProgressAlert, setDismissedProgressAlert] = useState(false);
  const [downloadEmbeddingsDialogOpen, setDownloadEmbeddingsDialogOpen] = useState(false);
  const [pendingFileAction, setPendingFileAction] = useState<'rebuild' | 'update' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const embeddingsInputRef = useRef<HTMLInputElement>(null);

  const isGenerating = databaseProgress.active && databaseProgress.mode === 'generating-embeddings';
  const shouldShowProgressAlert = (databaseProgress.active || databaseProgress.stage === 'error') && !dismissedProgressAlert;

  useEffect(() => {
    setDataUrl(dataSource.type === 'url' ? dataSource.dataUrl : '');
  }, [dataSource]);

  useEffect(() => {
    setDraftBrowserModel(embeddingConfig.browserModel ?? DEFAULT_BROWSER_MODEL_ID);
    setDraftDimensions(embeddingConfig.dimensions);
  }, [embeddingConfig]);

  useEffect(() => {
    if (databaseProgress.active || databaseProgress.stage === 'error') {
      setDismissedProgressAlert(false);
    }
  }, [databaseProgress.active, databaseProgress.stage, databaseProgress.startedAt, databaseProgress.error]);

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleRebuildFromUrl = async () => {
    if (!dataUrl.trim()) {
      toast.error('Enter a JSONL URL before importing.');
      return;
    }

    await rebuildFromUrl(dataUrl);
    toast.success('Database rebuilt from URL.');
  };

  const handleUpdateFromUrl = async () => {
    if (!dataUrl.trim()) {
      toast.error('Enter a JSONL URL before updating.');
      return;
    }

    await updateFromUrl(dataUrl);
    toast.success('Database updated from URL.');
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (pendingFileAction === 'update') {
      await updateFromFile(file);
      toast.success(`Database updated from ${file.name}.`);
    } else {
      await rebuildFromFile(file);
      toast.success(`Database rebuilt from ${file.name}.`);
    }

    setPendingFileAction(null);
    event.target.value = '';
  };

  const handleImportEmbeddings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await importSearchData(file);
    toast.success(`Imported embeddings from ${file.name}.`);
    event.target.value = '';
  };

  const handleExportEmbeddings = async () => {
    const blob = await exportSearchData();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `accident-embeddings-${new Date().toISOString().slice(0, 10)}.jsonl`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Embeddings export downloaded.');
  };

  const handleBrowserModelChange = (id: string) => {
    setDraftBrowserModel(id);
    const info = BROWSER_KNOWN_MODELS.find((model) => model.id === id);
    if (info) {
      setDraftDimensions(info.dimensions);
    }
  };

  const handleSaveEmbeddingConfig = async () => {
    setSavingConfig(true);

    try {
      const next: EmbeddingConfig = {
        browserModel: draftBrowserModel,
        dimensions: BROWSER_KNOWN_MODELS.find((model) => model.id === draftBrowserModel)?.dimensions ?? draftDimensions,
      };

      const needsClear =
        next.dimensions !== embeddingConfig.dimensions
        || next.browserModel !== embeddingConfig.browserModel;

      await setEmbeddingConfig(next);

      if (needsClear) {
        await clearEmbeddings();
        toast.success('Embedding configuration saved. Existing embeddings cleared, so search data will be regenerated when needed.');
      } else {
        toast.success('Embedding configuration saved.');
      }
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen"
    >
      <TopNav />
      <main className="mx-auto flex w-full max-w-screen-xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage data sources, embeddings, and application preferences.
          </p>
        </div>

        {/* Data Store Section */}
        <section>
          <div className="mb-4 flex items-center gap-2 border-b-2 border-primary pb-2">
            <div className="flex h-6 w-6 items-center justify-center bg-primary text-primary-foreground">
              <Database className="h-3 w-3" />
            </div>
            <h2 className="font-heading text-lg font-bold text-foreground">Data Store</h2>
          </div>

          <div className="grid grid-cols-2 border border-border sm:grid-cols-4" style={{ gap: '1px', background: 'var(--color-border)' }}>
            {[
              { label: 'Accidents', value: databaseStatus.accidentCount.toLocaleString() },
              { label: 'Images', value: databaseStatus.imageCount.toLocaleString() },
              { label: 'Status', value: databaseStatus.loaded ? 'Ready' : 'Not loaded' },
              { label: 'Search', value: databaseStatus.semanticSearchAvailable ? 'Enabled' : 'Disabled' },
            ].map((stat) => (
              <div key={stat.label} className="bg-background p-4 text-center">
                <p className="font-heading text-xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {!databaseStatus.semanticSearchAvailable && databaseStatus.semanticSearchReason && (
            <div className="mt-4 border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
              {databaseStatus.semanticSearchReason}
            </div>
          )}

          {shouldShowProgressAlert ? (
            <Alert className="mt-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7"
                onClick={() => setDismissedProgressAlert(true)}
                aria-label="Close refresh progress"
              >
                <X className="h-4 w-4" />
              </Button>
              {databaseProgress.active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Info className="h-4 w-4" />}
              <AlertTitle>
                {databaseProgress.active ? 'Refresh in progress' : 'Refresh failed'}
              </AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>{databaseProgress.message}</p>
                  {databaseProgress.active ? <Progress value={databaseProgress.percent} className="h-2" /> : null}
                  <p className="text-xs text-muted-foreground">
                    {databaseProgress.total > 0 ? `${databaseProgress.current}/${databaseProgress.total}` : 'Preparing'}
                  </p>
                  {databaseProgress.error ? (
                    <p className="text-sm text-destructive">{databaseProgress.error}</p>
                  ) : null}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="border border-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileUp className="h-4 w-4 text-accent" />
                <p className="text-sm font-medium text-foreground">Local JSONL file</p>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Pick a `.jsonl` file from your machine. Rebuild replaces the current data, while update adds only accidents whose Wikipedia URL does not already exist.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jsonl,application/x-ndjson,text/plain"
                className="hidden"
                onChange={(event) => { void handleFileImport(event); }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setPendingFileAction('rebuild'); fileInputRef.current?.click(); }}
                  disabled={refreshing}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rebuild Database
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setPendingFileAction('update'); fileInputRef.current?.click(); }}
                  disabled={refreshing}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Update Database
                </Button>
              </div>
            </div>

            <div className="border border-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-accent" />
                <p className="text-sm font-medium text-foreground">Remote JSONL URL</p>
              </div>
              <div className="mb-3 space-y-2">
                <Label htmlFor="data-url">Accidents JSONL URL</Label>
                <Input
                  id="data-url"
                  value={dataUrl}
                  onChange={(event) => setDataUrl(event.target.value)}
                  placeholder="https://example.com/accidents.jsonl"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void handleRebuildFromUrl()} disabled={refreshing || !dataUrl.trim()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rebuild Database
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleUpdateFromUrl()} disabled={refreshing || !dataUrl.trim()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Update Database
                </Button>
              </div>
            </div>
          </div>

          {dataSource.type === 'url' && dataSource.dataUrl && (
            <Button onClick={handleRefresh} disabled={refreshing} className="mt-4 w-full sm:w-auto">
              {refreshing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {refreshing ? 'Rebuilding Database' : 'Rebuild Using Saved URL'}
            </Button>
          )}
        </section>

        {/* Semantic Search Section */}
        <section>
          <div className="mb-4 flex items-center gap-2 border-b-2 border-primary pb-2">
            <div className="flex h-6 w-6 items-center justify-center bg-primary text-primary-foreground">
              <Brain className="h-3 w-3" />
            </div>
            <h2 className="font-heading text-lg font-bold text-foreground">Semantic Search</h2>
          </div>

          <div className="border border-border p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Browser Model</p>
                <p className="text-xs text-muted-foreground">ONNX model running locally in your browser.</p>
              </div>
              <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.08em] px-2 py-1 bg-success text-white">
                Active
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="browser-model" className="font-mono text-[0.7rem] uppercase text-muted-foreground">Model</Label>
                <Select value={draftBrowserModel} onValueChange={handleBrowserModelChange}>
                  <SelectTrigger id="browser-model" className="mt-1">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {BROWSER_KNOWN_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>{model.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const info = BROWSER_KNOWN_MODELS.find((model) => model.id === draftBrowserModel);
                  return info ? (
                    <p className="mt-1 text-xs text-muted-foreground">{info.description}</p>
                  ) : null;
                })()}
              </div>
              <div>
                <Label htmlFor="dimensions" className="font-mono text-[0.7rem] uppercase text-muted-foreground">Dimensions</Label>
                <Input id="dimensions" value={draftDimensions} readOnly className="mt-1" />
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-border pt-4">
              <Button type="button" onClick={() => void handleSaveEmbeddingConfig()} disabled={savingConfig}>
                {savingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {savingConfig ? 'Saving…' : 'Save Configuration'}
              </Button>
              <Button type="button" variant="outline" onClick={() => void generateSearchEmbeddings()} disabled={refreshing || !databaseStatus.loaded || databaseProgress.active}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Generating Search Data…' : 'Regenerate'}
              </Button>
            </div>
          </div>
        </section>

        {/* Data Management Section */}
        <section>
          <div className="mb-4 flex items-center gap-2 border-b-2 border-primary pb-2">
            <div className="flex h-6 w-6 items-center justify-center bg-primary text-primary-foreground">
              <FileSpreadsheet className="h-3 w-3" />
            </div>
            <h2 className="font-heading text-lg font-bold text-foreground">Data Management</h2>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between border border-border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Export Embeddings</p>
                <p className="text-xs text-muted-foreground">Download computed search vectors as JSONL.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => void handleExportEmbeddings()} disabled={refreshing || !databaseStatus.loaded}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
            <div className="flex items-center justify-between border border-border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Import Embeddings</p>
                <p className="text-xs text-muted-foreground">Restore previously exported embeddings.</p>
              </div>
              <input
                ref={embeddingsInputRef}
                type="file"
                accept=".jsonl,application/x-ndjson,text/plain"
                className="hidden"
                onChange={(event) => { void handleImportEmbeddings(event); }}
              />
              <Button type="button" variant="outline" onClick={() => embeddingsInputRef.current?.click()} disabled={refreshing || !databaseStatus.loaded}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
            <div className="flex items-center justify-between border border-border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Download Precomputed</p>
                <p className="text-xs text-muted-foreground">Get official pre-generated embeddings.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDownloadEmbeddingsDialogOpen(true)}
                disabled={refreshing || !databaseStatus.loaded || databaseProgress.active}
              >
                {databaseProgress.active ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download
              </Button>
            </div>
          </div>
        </section>
      </main>
      <DownloadEmbeddingsDialog
        open={downloadEmbeddingsDialogOpen}
        onOpenChange={setDownloadEmbeddingsDialogOpen}
      />
    </motion.div>
  );
}
