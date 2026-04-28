import { useMemo } from 'react';
import { ChevronRight, Clock3 } from 'lucide-react';
import { motion } from 'motion/react';

import { useDashboard } from '@/contexts/DashboardContext';
import { getSeverity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

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

function getSortableTime(dateText: string, fallbackYear: number) {
  const parsed = new Date(dateText);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  return new Date(fallbackYear, 0, 1).getTime();
}

export default function RecentIncidents() {
  const { accidents, setSelectedAccident } = useDashboard();

  const recent = useMemo(
    () =>
      [...accidents]
        .sort((left, right) => getSortableTime(right.date, right.year) - getSortableTime(left.date, left.year))
        .slice(0, 4),
    [accidents],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
    >
      <Card className="overflow-hidden bg-card">
        <CardHeader className="border-b border-border bg-secondary/55">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-foreground">
                <Clock3 className="h-4 w-4 text-accent" />
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Recent Incidents</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                A quick look at the most recent aviation accidents available in the current dataset.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
          {recent.map((accident) => {
            const severity = getSeverity(accident);
            const overview = accident.accident_description || accident.index_summary || accident.summary_infobox || 'No summary available.';
            const blurb = overview.length > 180 ? `${overview.slice(0, 180).trimEnd()}...` : overview;

            return (
              <button
                key={accident.id}
                type="button"
                onClick={() => setSelectedAccident(accident)}
                className="group rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-accent hover:bg-[hsl(var(--background))]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{accident.date || accident.year}</p>
                    <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-tight text-foreground">
                      {accident.page_title}
                    </h3>
                  </div>
                  <Badge variant="outline" className={getSeverityBadgeClass(severity)}>
                    {severity}
                  </Badge>
                </div>

                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{blurb}</p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {accident.operator && <span>{accident.operator}</span>}
                    {accident.operator && accident.site && <span>•</span>}
                    {accident.site && <span className="line-clamp-1">{accident.site}</span>}
                  </div>
                  <span className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-foreground transition-colors group-hover:bg-muted group-hover:text-accent">
                    View
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
