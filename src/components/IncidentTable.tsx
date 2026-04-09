import { useDashboard } from '@/contexts/DashboardContext';
import { getSeverity, getRegion } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'motion/react';

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

export default function IncidentTable() {
  const { filteredAccidents, setSelectedAccident } = useDashboard();
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
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border bg-secondary/45 pb-3">
          <div>
            <CardTitle className="text-base">Matched Incidents</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{filteredAccidents.length.toLocaleString()} total matches</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Aircraft</TableHead>
                <TableHead className="hidden lg:table-cell">Operator</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                {hasMatchSignals && <TableHead className="text-right">Match</TableHead>}
                <TableHead className="text-right">Fatalities</TableHead>
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
                    onClick={() => setSelectedAccident(a)}
                    className="cursor-pointer transition-colors hover:bg-muted/60"
                  >
                    <TableCell className="whitespace-nowrap text-muted-foreground">{a.date || a.year}</TableCell>
                    <TableCell className="max-w-[220px] truncate font-medium">{a.aircraft_type || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{a.operator || '—'}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">{getRegion(a.site)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getSeverityBadgeClass(sev)}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
