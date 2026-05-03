import { useDashboard } from '@/contexts/DashboardContext';
import { getSeverity, getRegion } from '@/lib/types';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'motion/react';

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

export default function IncidentTable() {
  const { filteredAccidents } = useDashboard();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const hasMatchSignals = filteredAccidents.some((accident) =>
    (accident.searchMatchPercent !== undefined && accident.searchMatchPercent !== null)
    || (accident.searchMatchSource !== undefined && accident.searchMatchSource !== null),
  );

  const sorted = useMemo(() =>
    [...filteredAccidents].sort((left, right) => {
      const leftSource = left.searchMatchSource ?? null;
      const rightSource = right.searchMatchSource ?? null;

      if (leftSource && !rightSource) {
        return -1;
      }

      if (!leftSource && rightSource) {
        return 1;
      }

      const leftScore = left.searchMatchPercent ?? -1;
      const rightScore = right.searchMatchPercent ?? -1;

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return right.year - left.year;
    }),
    [filteredAccidents]
  );

  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
        <div>
          <p className="font-heading text-base font-bold text-foreground">Matched Incidents</p>
          <p className="text-xs text-muted-foreground">{filteredAccidents.length.toLocaleString()} total matches</p>
        </div>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-secondary/45 hover:bg-secondary/45">
              <TableHead className="font-mono text-[0.65rem] uppercase tracking-wider">Date</TableHead>
              <TableHead className="font-mono text-[0.65rem] uppercase tracking-wider">Aircraft</TableHead>
              <TableHead className="hidden font-mono text-[0.65rem] uppercase tracking-wider lg:table-cell">Operator</TableHead>
              <TableHead className="font-mono text-[0.65rem] uppercase tracking-wider">Location</TableHead>
              <TableHead className="font-mono text-[0.65rem] uppercase tracking-wider">Type</TableHead>
              {hasMatchSignals && <TableHead className="font-mono text-right text-[0.65rem] uppercase tracking-wider">Match</TableHead>}
              <TableHead className="font-mono text-right text-[0.65rem] uppercase tracking-wider">Fatalities</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((a) => {
              const sev = getSeverity(a);
              const matchSourceLabel = a.searchMatchSource
                ? a.searchMatchSource.charAt(0).toUpperCase() + a.searchMatchSource.slice(1)
                : null;
              return (
                <TableRow
                  key={a.id}
                  onClick={() => navigate(`/accident/${a.id}`)}
                  className="cursor-pointer border-b border-border transition-colors hover:bg-muted/60"
                >
                  <TableCell className="whitespace-nowrap text-muted-foreground">{a.date || a.year}</TableCell>
                  <TableCell className="max-w-[220px] truncate font-medium">{a.aircraft_type || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{a.operator || '—'}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground">{getRegion(a.site)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[0.6rem] px-1.5 py-0 ${getSeverityBadgeClass(sev)}`}
                    >
                      {sev}
                    </Badge>
                  </TableCell>
                  {hasMatchSignals && (
                    <TableCell className="text-right font-medium text-foreground">
                      {matchSourceLabel ? (
                        <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                          {matchSourceLabel}
                        </Badge>
                      ) : (
                        `${a.searchMatchPercent ?? 0}%`
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono tabular-nums">{a.total_fatalities}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >Prev</Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >Next</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
