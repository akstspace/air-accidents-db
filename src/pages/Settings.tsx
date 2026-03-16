import { clearEmbeddings, pullOllamaModel } from '@/lib/db';
import { Brain, Database, Download, FileSpreadsheet, FileUp, Globe, Info, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { describeDataSource } from '@/lib/data-source';
import { useDashboard } from '@/contexts/DashboardContext';
import { BROWSER_KNOWN_MODELS, DEFAULT_BROWSER_MODEL_ID, OLLAMA_KNOWN_MODELS, OPENAI_MODEL_DIMENSIONS, OPENAI_MODELS, type EmbeddingConfig } from '@/lib/app-config';
import type { EmbeddingProvider } from '@/lib/types';
import TopNav from '@/components/TopNav';
import DownloadEmbeddingsDialog from '@/components/DownloadEmbeddingsDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    generateSearchEmbeddingsWithOllama,
    generateSearchEmbeddingsWithOpenAI,
    autoSetupSearchEmbeddings,
  } = useDashboard();

  const [dataUrl, setDataUrl] = useState(dataSource.type === 'url' ? dataSource.dataUrl : '');

  // Draft state mirroring embeddingConfig — saved on explicit button press
  const [draftProvider, setDraftProvider] = useState<EmbeddingProvider>(embeddingConfig.provider);
  const [draftDimensions, setDraftDimensions] = useState(embeddingConfig.dimensions);
  const [draftBrowserModel, setDraftBrowserModel] = useState(embeddingConfig.browserModel ?? DEFAULT_BROWSER_MODEL_ID);
  const [draftOllamaEndpoint, setDraftOllamaEndpoint] = useState(embeddingConfig.ollamaConfig.endpoint);
  const [draftOllamaModel, setDraftOllamaModel] = useState(embeddingConfig.ollamaConfig.model);
  const [draftOpenAIApiKey, setDraftOpenAIApiKey] = useState(embeddingConfig.openaiConfig.apiKey);
  const [draftOpenAIModel, setDraftOpenAIModel] = useState(embeddingConfig.openaiConfig.model);
  const [draftOpenAIBaseUrl, setDraftOpenAIBaseUrl] = useState(embeddingConfig.openaiConfig.baseUrl ?? '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const embeddingsInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileAction, setPendingFileAction] = useState<'rebuild' | 'update' | null>(null);
  const [dismissedProgressAlert, setDismissedProgressAlert] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [pullingModel, setPullingModel] = useState(false);
  const [pullProgress, setPullProgress] = useState('');
  const [pullPercent, setPullPercent] = useState(0);
  const [downloadEmbeddingsDialogOpen, setDownloadEmbeddingsDialogOpen] = useState(false);

  const isGeneratingLocal = databaseProgress.active && databaseProgress.mode === 'generating-embeddings';
  const isGeneratingOllama = databaseProgress.active && databaseProgress.mode === 'generating-embeddings-ollama';
  const isGeneratingOpenAI = databaseProgress.active && databaseProgress.mode === 'generating-embeddings-openai';
  const shouldShowProgressAlert = (databaseProgress.active || databaseProgress.stage === 'error') && !dismissedProgressAlert;

  useEffect(() => {
    setDataUrl(dataSource.type === 'url' ? dataSource.dataUrl : '');
  }, [dataSource]);

  useEffect(() => {
    setDraftProvider(embeddingConfig.provider);
    setDraftDimensions(embeddingConfig.dimensions);
    setDraftBrowserModel(embeddingConfig.browserModel ?? DEFAULT_BROWSER_MODEL_ID);
    setDraftOllamaEndpoint(embeddingConfig.ollamaConfig.endpoint);
    setDraftOllamaModel(embeddingConfig.ollamaConfig.model);
    setDraftOpenAIApiKey(embeddingConfig.openaiConfig.apiKey);
    setDraftOpenAIModel(embeddingConfig.openaiConfig.model);
    setDraftOpenAIBaseUrl(embeddingConfig.openaiConfig.baseUrl ?? '');
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

  const handleSaveEmbeddingConfig = async () => {
    setSavingConfig(true);
    try {
      const next: EmbeddingConfig = {
        provider: draftProvider,
        dimensions: draftProvider === 'browser'
          ? (BROWSER_KNOWN_MODELS.find((m) => m.id === draftBrowserModel)?.dimensions ?? 384)
          : draftDimensions,
        browserModel: draftBrowserModel,
        ollamaConfig: { endpoint: draftOllamaEndpoint, model: draftOllamaModel },
        openaiConfig: { apiKey: draftOpenAIApiKey, model: draftOpenAIModel, baseUrl: draftOpenAIBaseUrl },
      };

      const dimensionsChanged = next.dimensions !== embeddingConfig.dimensions;
      const providerChanged = next.provider !== embeddingConfig.provider;
      const modelChanged =
        (next.provider === 'openai' && next.openaiConfig.model !== embeddingConfig.openaiConfig.model) ||
        (next.provider === 'ollama' && next.ollamaConfig.model !== embeddingConfig.ollamaConfig.model);
      const needsClear = dimensionsChanged || providerChanged || modelChanged;

      await setEmbeddingConfig(next);

      if (needsClear) {
        await clearEmbeddings();
        toast.success('Embedding configuration saved. Existing embeddings cleared — please regenerate.');
      } else {
        toast.success('Embedding configuration saved.');
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const handleGenerate = async () => {
    if (embeddingConfig.provider === 'ollama') {
      await generateSearchEmbeddingsWithOllama({
        endpoint: embeddingConfig.ollamaConfig.endpoint,
        model: embeddingConfig.ollamaConfig.model,
        dimensions: embeddingConfig.dimensions,
      });
    } else if (embeddingConfig.provider === 'openai') {
      await generateSearchEmbeddingsWithOpenAI({
        apiKey: embeddingConfig.openaiConfig.apiKey,
        model: embeddingConfig.openaiConfig.model,
        dimensions: embeddingConfig.dimensions,
        baseUrl: embeddingConfig.openaiConfig.baseUrl,
      });
    } else {
      await generateSearchEmbeddings();
    }
  };

  const handlePullModel = async (modelOverride?: string) => {
    const model = modelOverride ?? draftOllamaModel;
    setPullingModel(true);
    setPullProgress('Starting pull...');
    setPullPercent(0);
    try {
      await pullOllamaModel(draftOllamaEndpoint, model, (status, completed, total) => {
        setPullProgress(status);
        if (total > 0) setPullPercent(Math.round((completed / total) * 100));
      });
      toast.success(`${model} pulled successfully.`);
      setPullProgress('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Pull failed.');
      setPullProgress('');
    } finally {
      setPullingModel(false);
    }
  };

  const isGenerating = isGeneratingLocal || isGeneratingOllama || isGeneratingOpenAI;

  const generateLabel = () => {
    if (isGeneratingLocal) return 'Generating Search Data Locally...';
    if (isGeneratingOllama) return 'Generating Search Data with Ollama...';
    if (isGeneratingOpenAI) return 'Generating Search Data with OpenAI...';
    if (embeddingConfig.provider === 'ollama') return 'Generate Search Data with Ollama';
    if (embeddingConfig.provider === 'openai') return 'Generate Search Data with OpenAI';
    return 'Generate Search Data Locally';
  };

  const handleOpenAIModelChange = (model: string) => {
    setDraftOpenAIModel(model);
    const dims = OPENAI_MODEL_DIMENSIONS[model] ?? [1536];
    setDraftDimensions(dims[dims.length - 1]);
  };

  const handleOllamaModelChange = (id: string) => {
    setDraftOllamaModel(id);
    const info = OLLAMA_KNOWN_MODELS.find((m) => m.id === id);
    if (info) setDraftDimensions(info.dimensions);
    void handlePullModel(id);
  };

  const handleBrowserModelChange = (id: string) => {
    setDraftBrowserModel(id);
    const info = BROWSER_KNOWN_MODELS.find((m) => m.id === id);
    if (info) setDraftDimensions(info.dimensions);
  };

  const dimensionsOptions =
    draftProvider === 'openai'
      ? (OPENAI_MODEL_DIMENSIONS[draftOpenAIModel] ?? [1536])
      : draftProvider === 'ollama'
        ? [OLLAMA_KNOWN_MODELS.find((m) => m.id === draftOllamaModel)?.dimensions ?? draftDimensions]
        : [BROWSER_KNOWN_MODELS.find((m) => m.id === draftBrowserModel)?.dimensions ?? draftDimensions];



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen"
    >
      <TopNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage data import and search-generation configuration.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Data Store card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-primary" />
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
                <div className="rounded-xl border border-border/40 bg-muted/30 p-4 text-sm text-muted-foreground">
                  {databaseStatus.semanticSearchReason}
                </div>
              )}

              {shouldShowProgressAlert ? (
                <Alert className="border-border/40 bg-muted/30">
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

              <div className="rounded-xl border border-border/40 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p>
                  Last refreshed:{' '}
                  <span className="font-medium text-foreground">
                    {databaseStatus.refreshedAt ? new Date(databaseStatus.refreshedAt).toLocaleString() : 'Never'}
                  </span>
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-border/60 p-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Import Source</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                    <div className="flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-primary" />
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

                  <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
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

          {/* Embedding Configuration card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Embedding Configuration
              </CardTitle>
              <CardDescription>
                Choose how embeddings are generated for semantic search.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Provider selector */}
              <div className="space-y-2">
                <Label htmlFor="embedding-provider">Embedding Provider</Label>
                <Select value={draftProvider} onValueChange={(v) => setDraftProvider(v as EmbeddingProvider)}>
                  <SelectTrigger id="embedding-provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">Browser (local ONNX model)</SelectItem>
                    <SelectItem value="ollama">Ollama</SelectItem>
                    <SelectItem value="openai">OpenAI API</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {draftProvider === 'browser' && 'Runs a 300M-parameter ONNX model locally using WebGPU. No API key needed.'}
                  {draftProvider === 'ollama' && 'Uses a locally-running Ollama server. Start Ollama before generating.'}
                  {draftProvider === 'openai' && 'Uses the OpenAI Embeddings REST API. Requires an API key.'}
                </p>
              </div>

              {draftProvider !== 'browser' && (
                <div className="space-y-2">
                  <Label htmlFor="embedding-dimensions">Embedding Dimensions</Label>
                  <Select
                    value={String(draftDimensions)}
                    onValueChange={(v) => setDraftDimensions(Number(v))}
                    disabled={draftProvider === 'openai' && draftOpenAIModel === 'text-embedding-ada-002'}
                  >
                    <SelectTrigger id="embedding-dimensions">
                      <SelectValue placeholder="Select dimensions" />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensionsOptions.map((d) => (
                        <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {draftProvider === 'openai' && draftOpenAIModel === 'text-embedding-ada-002'
                      ? 'ada-002 outputs fixed 1536-dimensional embeddings.'
                      : 'MRL dimensions — higher is more accurate but slower and uses more storage.'}
                  </p>
                </div>
              )}

              {/* Browser model selector */}
              {draftProvider === 'browser' && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">Browser Model</p>
                  <div className="space-y-2">
                    <Label htmlFor="browser-model">ONNX Model</Label>
                    <Select value={draftBrowserModel} onValueChange={handleBrowserModelChange}>
                      <SelectTrigger id="browser-model">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {BROWSER_KNOWN_MODELS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(() => {
                      const info = BROWSER_KNOWN_MODELS.find((m) => m.id === draftBrowserModel);
                      return info ? (
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}

              {/* Ollama fields */}
              {draftProvider === 'ollama' && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">Ollama Settings</p>
                  <div className="rounded-lg border border-border/50 bg-background/50 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">CORS Configuration Required</p>
                    <p className="mb-2">To connect from the browser, set the <code className="rounded bg-muted px-1 py-0.5">OLLAMA_ORIGINS=&quot;*&quot;</code> environment variable and restart Ollama.</p>
                    <ul className="list-disc space-y-1 pl-4">
                      <li><strong>Mac:</strong> <code className="rounded bg-muted px-1 py-0.5">launchctl setenv OLLAMA_ORIGINS &quot;*&quot;</code> then restart the app.</li>
                      <li><strong>Windows:</strong> Add to System Environment Variables and restart the app.</li>
                      <li><strong>Linux:</strong> Add <code className="rounded bg-muted px-1 py-0.5">Environment=&quot;OLLAMA_ORIGINS=*&quot;</code> via <code className="rounded bg-muted px-1 py-0.5">systemctl edit ollama.service</code>.</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ollama-endpoint">Endpoint</Label>
                    <Input
                      id="ollama-endpoint"
                      value={draftOllamaEndpoint}
                      onChange={(e) => setDraftOllamaEndpoint(e.target.value)}
                      placeholder="http://127.0.0.1:11434"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ollama-model">Model</Label>
                    <Select value={draftOllamaModel} onValueChange={handleOllamaModelChange}>
                      <SelectTrigger id="ollama-model">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {(['fast', 'balanced', 'quality'] as const).map((cat) => {
                          const models = OLLAMA_KNOWN_MODELS.filter((m) => m.category === cat);
                          const catLabel =
                            cat === 'fast' ? 'Fast / Tiny' : cat === 'balanced' ? 'Balanced' : 'Quality / Long context';
                          return (
                            <SelectGroup key={cat}>
                              <SelectLabel>{catLabel}</SelectLabel>
                              {models.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {(() => {
                      const info = OLLAMA_KNOWN_MODELS.find((m) => m.id === draftOllamaModel);
                      return info ? (
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                      ) : null;
                    })()}
                  </div>
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pullingModel}
                      onClick={() => void handlePullModel()}
                    >
                      {pullingModel ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                      {pullingModel ? 'Pulling model...' : `Pull ${draftOllamaModel}`}
                    </Button>
                    {pullProgress && (
                      <div className="space-y-1 pt-1">
                        <p className="text-xs text-muted-foreground">{pullProgress}</p>
                        {pullPercent > 0 && <Progress value={pullPercent} className="h-1.5" />}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OpenAI fields */}
              {draftProvider === 'openai' && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">OpenAI Settings</p>
                  <div className="space-y-2">
                    <Label htmlFor="openai-base-url">Base URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input
                      id="openai-base-url"
                      value={draftOpenAIBaseUrl}
                      onChange={(e) => setDraftOpenAIBaseUrl(e.target.value)}
                      placeholder="https://openrouter.ai/api/v1"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <p className="text-xs text-muted-foreground">Leave blank for OpenAI. Set to <code className="text-xs">https://openrouter.ai/api/v1</code> for OpenRouter.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openai-api-key">API Key</Label>
                    <Input
                      id="openai-api-key"
                      type="password"
                      value={draftOpenAIApiKey}
                      onChange={(e) => setDraftOpenAIApiKey(e.target.value)}
                      placeholder="sk-..."
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openai-model">Model</Label>
                    <Select value={draftOpenAIModel} onValueChange={handleOpenAIModelChange}>
                      <SelectTrigger id="openai-model">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENAI_MODELS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

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

        {/* Embeddings card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Embeddings
            </CardTitle>
            <CardDescription>
              Export embeddings to reuse them later, import existing vectors, or generate them using the saved configuration.
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
                onClick={() => void handleGenerate()}
                disabled={refreshing || !databaseStatus.loaded || databaseProgress.active}
              >
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {generateLabel()}
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
