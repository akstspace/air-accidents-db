import { useState } from 'react';
import { Download, Loader2, Sparkles } from 'lucide-react';

import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

interface DownloadEmbeddingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type ModelChoice = 'minilm' | 'gemma';

export default function DownloadEmbeddingsDialog({
    open,
    onOpenChange,
}: Readonly<DownloadEmbeddingsDialogProps>) {
    const { autoSetupSearchEmbeddings, databaseProgress } = useDashboard();
    const [modelChoice, setModelChoice] = useState<ModelChoice>('minilm');
    const [downloading, setDownloading] = useState(false);

    const isRunning = databaseProgress.active;

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await autoSetupSearchEmbeddings({ modelChoice });
            toast.success('Precomputed embeddings downloaded successfully.');
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to download embeddings.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => {
            // Don't allow closing while active download
            if (downloading || isRunning) return;
            onOpenChange(nextOpen);
        }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Download Embeddings
                    </DialogTitle>
                    <DialogDescription>
                        Select the browser-based precomputed embeddings you want to download. This will replace any existing embeddings.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <RadioGroup
                        value={modelChoice}
                        onValueChange={(value) => setModelChoice(value as ModelChoice)}
                        className="space-y-3"
                        disabled={downloading || isRunning}
                    >
                        <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                            <RadioGroupItem value="minilm" id="minilm" />
                            <div className="flex-1 space-y-1">
                                <Label htmlFor="minilm" className="font-medium cursor-pointer">
                                    Browser - MiniLM (Default)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Lightweight and fast. Runs locally in your browser. Best for low-memory environments.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                            <RadioGroupItem value="gemma" id="gemma" />
                            <div className="flex-1 space-y-1">
                                <Label htmlFor="gemma" className="font-medium cursor-pointer">
                                    Browser - Gemma 300M
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Higher accuracy, larger download. Best if you have a dedicated GPU or WebGPU enabled.
                                </p>
                            </div>
                        </div>

                    </RadioGroup>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={downloading || isRunning}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => void handleDownload()}
                        disabled={downloading || isRunning}
                    >
                        {downloading || isRunning ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        {downloading || isRunning ? 'Downloading...' : 'Download'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
