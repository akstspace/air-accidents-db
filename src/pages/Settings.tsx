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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
      <main className="mx-auto flex w-full max-w-screen-xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Settings</p>
          <h2 className="text-[30px] font-extrabold tracking-[-0.03em]">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Manage data import and browser-based semantic search.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-accent" />
                Data Store
              </CardTitle>
              <CardDescription>
                Your imported data is stored locally in the browser and can be rebuilt on demand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary">{databaseStatus.accidentCount.toLocaleString()} accidents</Badge>
                <Badge variant="secondary">{databaseStatus.imageCount.toLocaleString()} images</Badge>
                <Badge variant={databaseStatus.loaded ? 'default' : 'outline'}>
                  {databaseStatus.loaded ? 'Ready' : 'Not loaded'}
                </Badge>
                <Badge variant={databaseStatus.semanticSearchAvailable ? 'default' : 'outline'}>
                  {databaseStatus.semanticSearchAvailable ? 'Search ready' : 'Search disabled'}
                </Badge>
                <Badge variant="outline">{describeDataSource(dataSource)}</Badge>
              </div>

              {!databaseStatus.semanticSearchAvailable && databaseStatus.semanticSearchReason && (
                <div className="rounded-lg border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                  {databaseStatus.semanticSearchReason}
                </div>
              )}

              {shouldShowProgressAlert ? (
                <Alert>
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

              <div className="space-y-3 p-4 text-sm text-muted-foreground border-b border-border">
                <p>
                  Last refreshed:{' '}
                  <span className="font-medium text-foreground">
                    {databaseStatus.refreshedAt ? new Date(databaseStatus.refreshedAt).toLocaleString() : 'Never'}
                  </span>
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-foreground">Import Source</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 p-4 bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-accent" />
                      <p className="text-sm font-medium text-foreground">Local JSONL file</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
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

                  <div className="space-y-3 p-4 bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-accent" />
                      <p className="text-sm font-medium text-foreground">Remote JSONL URL</p>
                    </div>
                    <div className="space-y-2">
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  URL imports can be refreshed later. File imports require choosing the file again because browsers do not persist local file access automatically.
                </div>
              </div>

              {dataSource.type === 'url' && dataSource.dataUrl && (
                <Button onClick={handleRefresh} disabled={refreshing} className="w-full sm:w-auto">
                  {refreshing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {refreshing ? 'Rebuilding Database' : 'Rebuild Using Saved URL'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent" />
                Browser Embeddings
              </CardTitle>
              <CardDescription>
                Semantic search runs entirely in the browser using a local ONNX model.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
<div className="space-y-3 p-4 bg-secondary/50">
                  <p className="text-sm font-medium text-foreground">Browser Model</p>
                <div className="space-y-2">
                  <Label htmlFor="browser-model">ONNX Model</Label>
                  <Select value={draftBrowserModel} onValueChange={handleBrowserModelChange}>
                    <SelectTrigger id="browser-model">
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
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    ) : null;
                  })()}
                </div>
                <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  {draftDimensions}-dimensional vectors will be generated for search.
                </div>
              </div>

              <Button
                type="button"
                onClick={() => void handleSaveEmbeddingConfig()}
                disabled={savingConfig}
              >
                {savingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-accent" />
              Embeddings
            </CardTitle>
            <CardDescription>
              Use browser-based semantic search data. MiniLM is the default precomputed option, with Gemma also available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={embeddingsInputRef}
              type="file"
              accept=".jsonl,application/x-ndjson,text/plain"
              className="hidden"
              onChange={(event) => { void handleImportEmbeddings(event); }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDownloadEmbeddingsDialogOpen(true)}
                disabled={refreshing || !databaseStatus.loaded || databaseProgress.active}
              >
                {databaseProgress.active ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download Precomputed Embeddings
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleExportEmbeddings()} disabled={refreshing || !databaseStatus.loaded}>
                <Download className="mr-2 h-4 w-4" />
                Export Embeddings
              </Button>
              <Button type="button" variant="outline" onClick={() => embeddingsInputRef.current?.click()} disabled={refreshing || !databaseStatus.loaded}>
                <Upload className="mr-2 h-4 w-4" />
                Import Embeddings
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void generateSearchEmbeddings()}
                disabled={refreshing || !databaseStatus.loaded || databaseProgress.active}
              >
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Generating Search Data...' : 'Generate Search Data'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <DownloadEmbeddingsDialog
        open={downloadEmbeddingsDialogOpen}
        onOpenChange={setDownloadEmbeddingsDialogOpen}
      />
    </motion.div>
  );
}
