import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

import { useDashboard } from '@/contexts/DashboardContext';
import { getSeverity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

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
      return 'border-accent bg-accent text-accent-foreground';
    case 'serious':
      return 'border-muted bg-muted text-muted-foreground';
    case 'incident':
    default:
      return 'border-border bg-background text-muted-foreground';
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
  const { accidents } = useDashboard();
  const navigate = useNavigate();

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
      <div className="mb-3 border-b border-border pb-2">
        <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Today in History</p>
        <p className="mt-1 font-heading text-xl font-bold text-foreground">{todayLabel}</p>
      </div>

      {featured.length === 0 ? (
        <div className="border border-dashed border-border bg-secondary/40 px-4 py-6 text-center">
          <p className="text-sm font-medium text-foreground">Nothing surfaced for {todayLabel}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {featured.map((accident) => {
            const severity = getSeverity(accident);

            return (
              <button
                key={accident.id}
                type="button"
                onClick={() => navigate(`/accident/${accident.id}`)}
                className="group border-l-2 border-accent bg-background pl-3 py-2 text-left transition-colors hover:bg-secondary/30"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[0.65rem] text-muted-foreground">{accident.date || accident.year}</span>
                  <Badge variant="outline" className={`text-[0.6rem] px-1.5 py-0 ${getSeverityBadgeClass(severity)}`}>
                    {severity}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold leading-tight text-foreground group-hover:text-accent">
                  {accident.page_title}
                </h3>
                {accident.operator && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{accident.operator} · {accident.total_fatalities} fatalities</p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
