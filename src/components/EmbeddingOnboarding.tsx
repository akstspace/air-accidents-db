import { useState } from 'react';
import { CheckCircle2, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import {
  BROWSER_KNOWN_MODELS,
  DEFAULT_BROWSER_MODEL_ID,
  DEFAULT_OLLAMA_MODEL,
  OLLAMA_KNOWN_MODELS,
  OPENAI_MODEL_DIMENSIONS,
  OPENAI_MODELS,
  type EmbeddingConfig,
} from '@/lib/app-config';
import { pullOllamaModel } from '@/lib/db';
import { useDashboard } from '@/contexts/DashboardContext';
import type { EmbeddingProvider } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export const EMBEDDING_ONBOARDING_DISMISSED_KEY =
  'accident-visualizer:embedding-onboarding-dismissed';

interface EmbeddingOnboardingProps {
  open: boolean;
  onDismiss: () => void;
}

export default function EmbeddingOnboarding({
  open,
  onDismiss,
}: Readonly<EmbeddingOnboardingProps>) {
  const {
    embeddingConfig,
    setEmbeddingConfig,
    autoSetupSearchEmbeddings,
    databaseProgress,
  } = useDashboard();

  const [provider, setProvider] = useState<EmbeddingProvider>(embeddingConfig.provider);
  const [browserModel, setBrowserModel] = useState(
    embeddingConfig.browserModel ?? DEFAULT_BROWSER_MODEL_ID,
  );
  const [ollamaEndpoint, setOllamaEndpoint] = useState(embeddingConfig.ollamaConfig.endpoint);
  const [ollamaModel, setOllamaModel] = useState(
    embeddingConfig.ollamaConfig.model || DEFAULT_OLLAMA_MODEL,
  );
  const [openaiKey, setOpenaiKey] = useState(embeddingConfig.openaiConfig.apiKey);
  const [openaiModel, setOpenaiModel] = useState(embeddingConfig.openaiConfig.model);
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState(embeddingConfig.openaiConfig.baseUrl ?? '');
  const [dimensions, setDimensions] = useState(embeddingConfig.dimensions);

  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState('');
  const [pullPercent, setPullPercent] = useState(0);
  const [importing, setImporting] = useState(false);

  const selectedOllamaInfo = OLLAMA_KNOWN_MODELS.find((m) => m.id === ollamaModel);
  const isRunning = databaseProgress.active;

  const handleOllamaModelChange = (id: string) => {
    setOllamaModel(id);
    const info = OLLAMA_KNOWN_MODELS.find((m) => m.id === id);
    if (info) setDimensions(info.dimensions);
  };

  const handleOpenAIModelChange = (m: string) => {
    setOpenaiModel(m);
    const dims = OPENAI_MODEL_DIMENSIONS[m] ?? [1536];
    setDimensions(dims[dims.length - 1]);
  };

  const handleSetup = async () => {
    setImporting(true);
    try {
      // 1. Save embedding config
      const next: EmbeddingConfig = {
        provider,
        dimensions: provider === 'browser'
          ? (BROWSER_KNOWN_MODELS.find((m) => m.id === browserModel)?.dimensions ?? 384)
          : dimensions,
        browserModel,
        ollamaConfig: { endpoint: ollamaEndpoint, model: ollamaModel },
        openaiConfig: { apiKey: openaiKey, model: openaiModel, baseUrl: openaiBaseUrl },
      };
      await setEmbeddingConfig(next);

      // 2. If Ollama, auto-pull the model first
      if (provider === 'ollama') {
        setPulling(true);
        setPullProgress('Pulling model…');
        setPullPercent(0);
        try {
          await pullOllamaModel(ollamaEndpoint, ollamaModel, (status, completed, total) => {
            setPullProgress(status);
            if (total > 0) setPullPercent(Math.round((completed / total) * 100));
          });
          toast.success(`${ollamaModel} ready.`);
        } catch (pullErr) {
          toast.error(pullErr instanceof Error ? pullErr.message : 'Failed to pull model.');
          return;
        } finally {
          setPulling(false);
          setPullProgress('');
        }
      }

      // 3. Auto-import precomputed embeddings
      await autoSetupSearchEmbeddings();
      onDismiss();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Setup failed.');
    } finally {
      setImporting(false);
    }
  };

  const handleSkip = () => {
    globalThis.localStorage?.setItem(EMBEDDING_ONBOARDING_DISMISSED_KEY, '1');
    onDismiss();
  };

  // Active progress state (pulling or importing)
  const showProgress = importing || isRunning;

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="border-b border-border/40 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Set up semantic search
            </DialogTitle>
            <DialogDescription>
              Choose your embedding provider, then we'll automatically download precomputed
              embeddings to enable AI-powered search. Vectors are stored locally in your browser.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Progress view — shown while pulling or importing */}
        {showProgress && (
          <div className="px-6 py-8 space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              {databaseProgress.stage === 'finalizing' || (!databaseProgress.active && !importing) ? (
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              ) : (
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              )}
              <p className="text-sm font-medium text-foreground">
                {pulling
                  ? pullProgress || 'Pulling model…'
                  : databaseProgress.message || 'Downloading precomputed embeddings…'}
              </p>
            </div>
            {pulling && pullPercent > 0 ? (
              <Progress value={pullPercent} className="h-2" />
            ) : (
              <Progress value={databaseProgress.active ? databaseProgress.percent : (importing ? 0 : 100)} className="h-2" />
            )}
            {!pulling && databaseProgress.total > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                Step {databaseProgress.current} of {databaseProgress.total}
              </p>
            )}
            {databaseProgress.error && (
              <p className="text-center text-sm text-destructive">{databaseProgress.error}</p>
            )}
          </div>
        )}

        {/* Config form — hidden while running */}
        {!showProgress && (
          <div className="space-y-5 px-6 py-5">
            {/* Provider */}
            <div className="space-y-2">
              <Label htmlFor="onboarding-provider">Embedding Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as EmbeddingProvider)}
              >
                <SelectTrigger id="onboarding-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">Browser (local ONNX) — no setup needed</SelectItem>
                  <SelectItem value="ollama">Ollama — local server, full control</SelectItem>
                  <SelectItem value="openai">OpenAI API — best quality, requires key</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Provider-specific config */}
            {provider === 'browser' && (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-browser-model">ONNX Model</Label>
                  <Select value={browserModel} onValueChange={(id) => {
                    setBrowserModel(id);
                    const info = BROWSER_KNOWN_MODELS.find((m) => m.id === id);
                    if (info) setDimensions(info.dimensions);
                  }}>
                    <SelectTrigger id="onboarding-browser-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BROWSER_KNOWN_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const info = BROWSER_KNOWN_MODELS.find((m) => m.id === browserModel);
                    return info ? (
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            {provider === 'ollama' && (
              <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-4">
                <div className="rounded-md border border-border/40 bg-background/50 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">CORS Configuration Required</p>
                  <p className="mb-2">Set <code className="rounded bg-muted px-1 py-0.5">OLLAMA_ORIGINS=&quot;*&quot;</code> and restart Ollama.</p>
                  <ul className="list-disc space-y-1 pl-4">
                    <li><strong>Mac:</strong> <code className="rounded bg-muted px-1 py-0.5">launchctl setenv OLLAMA_ORIGINS &quot;*&quot;</code> then restart.</li>
                    <li><strong>Windows:</strong> Add to System Environment Variables and restart.</li>
                    <li><strong>Linux:</strong> <code className="rounded bg-muted px-1 py-0.5">systemctl edit ollama.service</code> → add <code className="rounded bg-muted px-1 py-0.5">Environment=&quot;OLLAMA_ORIGINS=*&quot;</code>.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-ollama-endpoint">Endpoint</Label>
                  <Input
                    id="onboarding-ollama-endpoint"
                    value={ollamaEndpoint}
                    onChange={(e) => setOllamaEndpoint(e.target.value)}
                    placeholder="http://127.0.0.1:11434"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-ollama-model">Model</Label>
                  <Select value={ollamaModel} onValueChange={handleOllamaModelChange}>
                    <SelectTrigger id="onboarding-ollama-model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['fast', 'balanced', 'quality'] as const).map((cat) => {
                        const models = OLLAMA_KNOWN_MODELS.filter((m) => m.category === cat);
                        const catLabel =
                          cat === 'fast'
                            ? 'Fast / Tiny'
                            : cat === 'balanced'
                              ? 'Balanced'
                              : 'Quality / Long context';
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
                  {selectedOllamaInfo && (
                    <p className="text-xs text-muted-foreground">{selectedOllamaInfo.description}</p>
                  )}
                </div>
              </div>
            )}

            {provider === 'openai' && (
              <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-4">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-openai-base-url">Base URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="onboarding-openai-base-url"
                    value={openaiBaseUrl}
                    onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                    placeholder="https://openrouter.ai/api/v1"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank for OpenAI. Use <code className="text-xs">https://openrouter.ai/api/v1</code> for OpenRouter.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-openai-key">API Key</Label>
                  <Input
                    id="onboarding-openai-key"
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-openai-model">Model</Label>
                  <Select value={openaiModel} onValueChange={handleOpenAIModelChange}>
                    <SelectTrigger id="onboarding-openai-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPENAI_MODELS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )} {/* end config form */}

        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
          <Button type="button" variant="ghost" size="sm" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button
            type="button"
            disabled={
              importing ||
              isRunning ||
              (provider === 'openai' && !openaiKey.trim())
            }
            onClick={() => void handleSetup()}
          >
            {importing || isRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="mr-2 h-4 w-4" />
            )}
            {importing || isRunning ? 'Setting up…' : 'Set up & import embeddings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
