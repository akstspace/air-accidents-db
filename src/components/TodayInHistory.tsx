import { useMemo } from 'react';
import { CalendarDays, ChevronRight, Plane } from 'lucide-react';
import { motion } from 'motion/react';

import { useDashboard } from '@/contexts/DashboardContext';
import { getSeverity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MONTH_LOOKUP = new Map([
  ['jan', 1],
  ['january', 1],
  ['feb', 2],
  ['february', 2],
  ['mar', 3],
  ['march', 3],
  ['apr', 4],
  ['april', 4],
  ['may', 5],
  ['jun', 6],
  ['june', 6],
  ['jul', 7],
  ['july', 7],
  ['aug', 8],
  ['august', 8],
  ['sep', 9],
  ['sept', 9],
  ['september', 9],
  ['oct', 10],
  ['october', 10],
  ['nov', 11],
  ['november', 11],
  ['dec', 12],
  ['december', 12],
]);

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

function normalizeMonthToken(token: string) {
  return token.replace('.', '').toLowerCase();
}

function extractMonthDay(dateText: string) {
  const normalized = dateText.trim();

  if (!normalized) {
    return null;
  }

  const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return {
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/\d{2,4}$/);
  if (slashMatch) {
    return {
      month: Number(slashMatch[1]),
      day: Number(slashMatch[2]),
    };
  }

  const monthFirstMatch = normalized.match(/^([A-Za-z.]+)\s+(\d{1,2})(?:,?\s+\d{4})?$/);
  if (monthFirstMatch) {
    const month = MONTH_LOOKUP.get(normalizeMonthToken(monthFirstMatch[1]));
    if (month) {
      return {
        month,
        day: Number(monthFirstMatch[2]),
      };
    }
  }

  const dayFirstMatch = normalized.match(/^(\d{1,2})\s+([A-Za-z.]+)(?:\s+\d{4})?$/);
  if (dayFirstMatch) {
    const month = MONTH_LOOKUP.get(normalizeMonthToken(dayFirstMatch[2]));
    if (month) {
      return {
        month,
        day: Number(dayFirstMatch[1]),
      };
    }
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      month: parsed.getMonth() + 1,
      day: parsed.getDate(),
    };
  }

  return null;
}

function formatTodayLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default function TodayInHistory() {
  const { accidents, setSelectedAccident } = useDashboard();

  const today = useMemo(() => new Date(), []);
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const todayLabel = useMemo(() => formatTodayLabel(today), [today]);

  const matches = useMemo(() => {
    return accidents
      .filter((accident) => {
        const monthDay = extractMonthDay(accident.date);
        return monthDay?.month === todayMonth && monthDay.day === todayDay;
      })
      .sort((left, right) => {
        if (right.total_fatalities !== left.total_fatalities) {
          return right.total_fatalities - left.total_fatalities;
        }

        return left.year - right.year;
      });
  }, [accidents, todayDay, todayMonth]);

  const featured = matches.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 }}
    >
      <Card className="overflow-hidden bg-card">
        <CardHeader className="border-b border-border bg-secondary/55">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-foreground">
                <CalendarDays className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Today in History</span>
              </div>
              <CardTitle className="mt-2 text-xl">{todayLabel}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {matches.length > 0
                  ? `${matches.length.toLocaleString()} aviation accident${matches.length === 1 ? '' : 's'} in the archive occurred on this date.`
                  : 'No archived accidents match today’s date in the current dataset.'}
              </p>
            </div>
            <div className="hidden rounded-lg border border-border bg-background p-3 sm:flex">
              <Plane className="h-5 w-5 text-accent" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {featured.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">Nothing surfaced for {todayLabel}.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try changing the dataset source if you want to compare against a different archive snapshot.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {featured.map((accident) => {
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
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
