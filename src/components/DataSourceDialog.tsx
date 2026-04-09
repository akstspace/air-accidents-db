import { useEffect, useRef, useState } from 'react';
import { FileUp, Globe, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DataSourceDialogProps {
  open: boolean;
  required?: boolean;
  busy: boolean;
  statusMessage?: string;
  initialUrl?: string;
  onOpenChange: (open: boolean) => void;
  onImportFromUrl: (url: string) => Promise<void>;
  onImportFromFile: (file: File) => Promise<void>;
}

export default function DataSourceDialog({
  open,
  required = false,
  busy,
  statusMessage,
  initialUrl = '',
  onOpenChange,
  onImportFromUrl,
  onImportFromFile,
}: Readonly<DataSourceDialogProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlValue, setUrlValue] = useState(initialUrl);

  useEffect(() => {
    setUrlValue(initialUrl);
  }, [initialUrl]);

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await onImportFromFile(file);
    event.target.value = '';
    onOpenChange(false);
  };

  const handleImportFromUrl = async () => {
    await onImportFromUrl(urlValue);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (required && !nextOpen) {
        return;
      }

      onOpenChange(nextOpen);
    }}>
      <DialogContent showCloseButton={false} className="max-w-xl p-0" onPointerDownOutside={(event) => {
        if (required) {
          event.preventDefault();
        }
      }}>
        <div className="border-b border-border px-6 py-5">
          <DialogHeader>
            <DialogTitle>Import accident data</DialogTitle>
            <DialogDescription>
              Choose a local JSONL file or enter a remote URL. The selected source will be imported into the app for search and analysis.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          <Tabs defaultValue={initialUrl ? 'url' : 'file'} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">Local JSONL File</TabsTrigger>
              <TabsTrigger value="url">Remote URL</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4 rounded-lg border border-border bg-card p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Browser file picker</p>
                <p className="text-sm text-muted-foreground">
                  Pick a `.jsonl` file from your machine. The file is read in the browser and imported for local use in this app.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jsonl,application/x-ndjson,text/plain"
                className="hidden"
                onChange={(event) => {
                  void handleFileSelection(event);
                }}
              />

              <Button type="button" className="w-full" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                Choose JSONL File
              </Button>
            </TabsContent>

            <TabsContent value="url" className="space-y-4 rounded-lg border border-border bg-card p-4">
              <div className="space-y-2">
                <Label htmlFor="jsonl-url">JSONL URL</Label>
                <Input
                  id="jsonl-url"
                  value={urlValue}
                  onChange={(event) => setUrlValue(event.target.value)}
                  placeholder="https://example.com/accidents.jsonl"
                />
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={busy || urlValue.trim().length === 0}
                onClick={() => {
                  void handleImportFromUrl();
                }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                Import From URL
              </Button>
            </TabsContent>
          </Tabs>

          {statusMessage && (
            <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
              {statusMessage}
            </div>
          )}
        </div>

        {!required && (
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
