import { useDashboard } from '@/contexts/DashboardContext';
import { getImagesForAccident } from '@/lib/db';
import type { AccidentImage } from '@/lib/types';
import { getSeverity } from '@/lib/types';
import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

function getSeverityBadgeClass(severity: ReturnType<typeof getSeverity>) {
  switch (severity) {
    case 'fatal':
      return 'border-accent bg-accent text-accent-foreground';
    case 'serious':
      return 'border-muted bg-muted text-muted-foreground';
    case 'incident':
    default:
      return 'border-border bg-background text-muted-foreground';
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
      <SheetContent side="right" className="flex w-full flex-col border-l border-border p-0 sm:max-w-2xl">
        {selectedAccident && (
          (() => {
            const a = selectedAccident;
            const sev = getSeverity(a);
            const overviewText = a.accident_description || a.index_summary || 'No description available.';
            const shouldTruncateOverview = overviewText.length > 800;
            const visibleOverview = !showFullOverview && shouldTruncateOverview
              ? `${overviewText.slice(0, 800).trimEnd()}...`
              : overviewText;

            const detailRows = [
              { label: 'Date', value: a.date || String(a.year) },
              { label: 'Time', value: a.date ? 'See Wikipedia' : '—' },
              { label: 'Location', value: a.site || '—' },
              { label: 'Route', value: a.flight_origin && a.destination ? `${a.flight_origin} → ${a.destination}` : '—' },
              { label: 'First Flight', value: '—' },
              { label: 'Engines', value: '—' },
            ].filter((r) => r.value && r.value !== '—');

            return (
              <>
                {/* Header */}
                <SheetHeader className="shrink-0 border-b-2 border-accent bg-card px-6 py-5 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{a.date || a.year}</span>
                    <span className="h-2 w-2 bg-accent" />
                    <Badge variant="outline" className={getSeverityBadgeClass(sev)}>
                      {sev}
                    </Badge>
                    {a.searchMatchPercent !== undefined && a.searchMatchPercent !== null && (
                      <Badge variant="secondary">{a.searchMatchPercent}% match</Badge>
                    )}
                  </div>
                  <SheetTitle className="pt-2 font-heading text-2xl font-extrabold leading-tight">{a.page_title}</SheetTitle>
                  <SheetDescription className="text-base text-muted-foreground">
                    {a.operator || 'Unknown operator'} • {a.aircraft_type || 'Unknown aircraft'}
                  </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1">
                  <div className="px-6 py-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 border border-border sm:grid-cols-4" style={{ gap: '1px', background: 'var(--color-border)' }}>
                      {[
                        { label: 'Fatalities', value: a.total_fatalities || 0 },
                        { label: 'Injuries', value: a.total_injuries || 0 },
                        { label: 'Survivors', value: a.total_survivors || 0 },
                        { label: 'Aboard', value: (a.total_fatalities || 0) + (a.total_survivors || 0) },
                      ].map((s) => (
                        <div key={s.label} className="bg-background p-4 text-center">
                          <p className="font-heading text-xl font-bold text-foreground">{s.value}</p>
                          <p className="mt-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {(a.total_ground_fatalities > 0 || a.total_ground_injuries > 0) && (
                      <div className="mt-4 grid grid-cols-2 border border-border" style={{ gap: '1px', background: 'var(--color-border)' }}>
                        {[
                          { label: 'Ground Fatalities', value: a.total_ground_fatalities },
                          { label: 'Ground Injuries', value: a.total_ground_injuries },
                        ].map((s) => (
                          <div key={s.label} className="bg-background p-4 text-center">
                            <p className="font-heading text-xl font-bold text-foreground">{s.value || 0}</p>
                            <p className="mt-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
                      {/* Main Content */}
                      <div className="flex flex-col gap-6">
                        {/* Summary */}
                        <section>
                          <h2 className="mb-3 border-b border-border pb-2 font-heading text-base font-bold text-foreground">Accident Summary</h2>
                          <div className="space-y-3 text-sm leading-relaxed text-foreground">
                            <p>{visibleOverview}</p>
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
                          </div>
                        </section>

                        {/* Aircraft & Operator */}
                        <section className="grid gap-4 sm:grid-cols-2">
                          <div className="border border-border p-4">
                            <p className="mb-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Aircraft</p>
                            <p className="font-medium text-foreground">{a.aircraft_type || 'Unknown'}</p>
                            {a.registration && <p className="mt-1 text-sm text-muted-foreground">Registration: {a.registration}</p>}
                          </div>
                          <div className="border border-border p-4">
                            <p className="mb-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Operator</p>
                            <p className="font-medium text-foreground">{a.operator || 'Unknown'}</p>
                          </div>
                        </section>

                        {images.length > 0 && (
                          <section>
                            <h2 className="mb-3 border-b border-border pb-2 font-heading text-base font-bold text-foreground">Photos</h2>
                            <div className="grid grid-cols-2 gap-2">
                              {images.slice(0, 4).map((img) => (
                                <img
                                  key={`${img.full_src}-${img.image_index}`}
                                  src={img.src}
                                  alt={img.alt || img.caption}
                                  className="aspect-[4/3] w-full border border-border object-cover"
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
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4 hover:text-accent"
                          >
                            View on Wikipedia <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Sidebar */}
                      <aside className="flex flex-col gap-4">
                        {detailRows.length > 0 && (
                          <div className="border border-border p-4">
                            <p className="mb-3 border-b border-border pb-2 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                              Accident Details
                            </p>
                            <div className="flex flex-col gap-2">
                              {detailRows.map((d) => (
                                <div key={d.label} className="flex justify-between border-b border-border pb-1 last:border-b-0">
                                  <span className="text-xs text-muted-foreground">{d.label}</span>
                                  <span className="text-xs font-medium text-right">{d.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {a.wikipedia_url && (
                          <div className="border border-border p-4">
                            <p className="mb-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                              External Links
                            </p>
                            <div className="flex flex-col gap-1">
                              <a href={a.wikipedia_url} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4 hover:text-accent">
                                Wikipedia Article
                              </a>
                            </div>
                          </div>
                        )}
                      </aside>
                    </div>
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
