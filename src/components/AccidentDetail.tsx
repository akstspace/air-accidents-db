import { useDashboard } from '@/contexts/DashboardContext';
import { getImagesForAccident } from '@/lib/db';
import type { AccidentImage } from '@/lib/types';
import { getSeverity } from '@/lib/types';
import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

function getSeverityBadgeClass(severity: ReturnType<typeof getSeverity>) {
  switch (severity) {
    case 'fatal':
      return 'border-severity-fatal/30 bg-severity-fatal/10 text-severity-fatal';
    case 'serious':
      return 'border-severity-serious/30 bg-severity-serious/10 text-severity-serious';
    case 'incident':
    default:
      return 'border-severity-incident/30 bg-severity-incident/10 text-severity-incident';
  }
}

export default function AccidentDetail() {
  const { selectedAccident, setSelectedAccident } = useDashboard();
  const [images, setImages] = useState<AccidentImage[]>([]);
  const [showFullOverview, setShowFullOverview] = useState(false);

  useEffect(() => {
    if (selectedAccident?.wikipedia_url) {
      getImagesForAccident(selectedAccident.wikipedia_url).then(setImages);
    } else {
      setImages([]);
    }

    setShowFullOverview(false);
  }, [selectedAccident]);

  return (
    <Sheet open={Boolean(selectedAccident)} onOpenChange={(open) => !open && setSelectedAccident(null)}>
      <SheetContent side="right" className="flex w-full flex-col border-l border-border p-0 sm:max-w-xl">
        {selectedAccident && (
          (() => {
            const a = selectedAccident;
            const sev = getSeverity(a);
            const overviewText = a.accident_description || a.index_summary || 'No description available.';
            const shouldTruncateOverview = overviewText.length > 800;
            const visibleOverview = !showFullOverview && shouldTruncateOverview
              ? `${overviewText.slice(0, 800).trimEnd()}...`
              : overviewText;

            return (
              <>
                <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getSeverityBadgeClass(sev)}
                    >
                      {sev}
                    </Badge>
                    <Badge variant="secondary">{a.date || a.year}</Badge>
                    {a.searchMatchPercent !== undefined && a.searchMatchPercent !== null && (
                      <Badge variant="secondary">{a.searchMatchPercent}% match</Badge>
                    )}
                  </div>
                  <SheetTitle className="pt-2 text-lg leading-tight">{a.page_title}</SheetTitle>
                  <SheetDescription>{a.operator || 'Unknown operator'} • {a.aircraft_type || 'Unknown aircraft'}</SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1">
                  <div className="space-y-5 px-6 py-5">
                    <div className="rounded-lg border border-border bg-secondary/45 p-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          ['Fatalities', a.total_fatalities],
                          ['Injuries', a.total_injuries],
                          ['Survivors', a.total_survivors],
                        ].map(([label, value]) => (
                          <div key={String(label)}>
                            <p className="text-xl font-semibold tabular-nums tracking-tight">{value || 0}</p>
                            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {(a.total_ground_fatalities > 0 || a.total_ground_injuries > 0) && (
<div className="rounded-lg border border-border bg-secondary/35 p-3">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        {[
                          ['Ground Fatalities', a.total_ground_fatalities],
                          ['Ground Injuries', a.total_ground_injuries],
                        ].map(([label, value]) => (
                          <div key={String(label)}>
                            <p className="text-xl font-semibold tabular-nums tracking-tight">{value || 0}</p>
                            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    )}

                    <section className="space-y-2">
                      <h3 className="text-sm font-medium">Overview</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {visibleOverview}
                      </p>
                      {shouldTruncateOverview && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto px-0 text-sm"
                          onClick={() => setShowFullOverview((value) => !value)}
                        >
                          {showFullOverview ? 'Show less' : 'Show more'}
                        </Button>
                      )}
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-sm font-medium">Flight Details</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          ['Aircraft', a.aircraft_type],
                          ['Operator', a.operator],
                          ['Registration', a.registration],
                          ['Origin', a.flight_origin],
                          ['Destination', a.destination],
                          ['Site', a.site],
                        ]
                          .filter(([, value]) => value)
                          .map(([label, value]) => (
                            <div key={String(label)} className="rounded-md border border-b border-border bg-secondary/35 px-3 py-2">
                              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                              <p className="mt-1 text-sm">{value}</p>
                            </div>
                          ))}
                      </div>
                    </section>

                    {images.length > 0 && (
                      <section className="space-y-3">
                        <h3 className="text-sm font-medium">Photos</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {images.slice(0, 4).map((img) => (
                            <img
                              key={`${img.full_src}-${img.image_index}`}
                              src={img.src}
                              alt={img.alt || img.caption}
                              className="aspect-[4/3] w-full rounded-md border border-border object-cover"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {a.wikipedia_url && (
                      <a
                        href={a.wikipedia_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-accent hover:underline"
                      >
                        View on Wikipedia <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </ScrollArea>
              </>
            );
          })()
        )}
      </SheetContent>
    </Sheet>
  );
}
