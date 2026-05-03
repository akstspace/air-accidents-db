import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ExternalLink, ArrowLeft } from 'lucide-react';

import TopNav from '@/components/TopNav';
import { useDashboard } from '@/contexts/DashboardContext';
import { getImagesForAccident } from '@/lib/db';
import type { AccidentImage } from '@/lib/types';
import { getSeverity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

export default function AccidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accidents } = useDashboard();
  const [images, setImages] = useState<AccidentImage[]>([]);
  const [showFullOverview, setShowFullOverview] = useState(false);

  const accidentId = Number(id);
  const a = accidents.find((acc) => acc.id === accidentId);

  useEffect(() => {
    if (a?.wikipedia_url) {
      getImagesForAccident(a.wikipedia_url).then(setImages);
    } else {
      setImages([]);
    }
    setShowFullOverview(false);
  }, [a]);

  if (!a) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <TopNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Accident not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen flex flex-col bg-background"
    >
      <TopNav />

      {/* Header */}
      <section className="border-b-2 border-accent bg-card">
        <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="mb-3 px-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">{a.date || a.year}</span>
            <span className="h-2 w-2 bg-accent" />
            <Badge variant="outline" className={getSeverityBadgeClass(sev)}>
              {sev}
            </Badge>
            {a.searchMatchPercent !== undefined && a.searchMatchPercent !== null && (
              <Badge variant="secondary">{a.searchMatchPercent}% match</Badge>
            )}
          </div>
          <h1 className="mt-2 font-heading text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            {a.page_title}
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            {a.operator || 'Unknown operator'} • {a.aircraft_type || 'Unknown aircraft'}
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-screen-2xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
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
      </main>
    </motion.div>
  );
}
