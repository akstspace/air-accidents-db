import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

import { useDashboard } from '@/contexts/DashboardContext';
import { getSeverity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

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

function getSortableTime(dateText: string, fallbackYear: number) {
  const parsed = new Date(dateText);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  return new Date(fallbackYear, 0, 1).getTime();
}

export default function RecentIncidents() {
  const { accidents } = useDashboard();
  const navigate = useNavigate();

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
      <div className="mb-3 border-b border-border pb-2">
        <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Recent Incidents</p>
      </div>

      <div className="flex flex-col gap-2">
        {recent.map((accident) => {
          const severity = getSeverity(accident);

          return (
            <button
              key={accident.id}
              type="button"
              onClick={() => navigate(`/accident/${accident.id}`)}
              className="group border border-border bg-background p-3 text-left transition-colors hover:border-accent"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[0.65rem] text-muted-foreground">{accident.date || accident.year}</span>
                <Badge variant="outline" className={`text-[0.6rem] px-1.5 py-0 ${getSeverityBadgeClass(severity)}`}>
                  {severity}
                </Badge>
              </div>
              <h3 className="text-sm font-semibold leading-tight text-foreground group-hover:text-accent">
                {accident.page_title}
              </h3>
              {accident.site && (
                <p className="mt-0.5 text-xs text-muted-foreground">{accident.site}</p>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
