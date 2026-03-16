import { useDashboard } from '@/contexts/DashboardContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { SeverityType } from '@/lib/types';
import { cn } from '@/lib/utils';

function getSeverityDotClass(severity: SeverityType) {
  switch (severity) {
    case 'fatal':
      return 'bg-severity-fatal';
    case 'serious':
      return 'bg-severity-serious';
    case 'incident':
    default:
      return 'bg-severity-incident';
  }
}

function FilterSection({ title, children, defaultOpen = true }: Readonly<{ title: string; children: React.ReactNode; defaultOpen?: boolean }>) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-foreground"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="space-y-3 pt-2">{children}</div>}
    </div>
  );
}

export default function FilterSidebar({ className }: Readonly<{ className?: string }>) {
  const { filters, setFilters, allAircraftTypes, yearBounds } = useDashboard();

  const toggleSeverity = (s: SeverityType) => {
    setFilters((f) => ({
      ...f,
      severities: f.severities.includes(s)
        ? f.severities.filter((x) => x !== s)
        : [...f.severities, s],
    }));
  };

  const toggleAircraftType = (t: string) => {
    setFilters((f) => ({
      ...f,
      aircraftTypes: f.aircraftTypes.includes(t)
        ? f.aircraftTypes.filter((x) => x !== t)
        : [...f.aircraftTypes, t],
    }));
  };

  const clearFilters = () => {
    setFilters({
      yearRange: yearBounds,
      aircraftTypes: [],
      severities: ['fatal', 'serious', 'incident'],
    });
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Filters</CardTitle>
            <p className="text-sm text-muted-foreground">Map-driven exploration with quick aircraft filtering.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{filters.aircraftTypes.length} aircraft</Badge>
          <Badge variant="secondary">{filters.severities.length} severities</Badge>
          <Badge variant="outline">{filters.yearRange[0]} - {filters.yearRange[1]}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <FilterSection title="Aircraft Type">
            <ScrollArea className="h-64 rounded-xl border border-border/60 bg-background/50 p-3">
              <div className="space-y-3 pr-4">
                {allAircraftTypes.map((t) => (
                  <label key={t} className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
                    <Checkbox checked={filters.aircraftTypes.includes(t)} onCheckedChange={() => toggleAircraftType(t)} />
                    <span className="line-clamp-2">{t}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </FilterSection>

          <FilterSection title="Year Range">
            <Slider
              min={yearBounds[0]}
              max={yearBounds[1]}
              step={1}
              value={filters.yearRange}
              onValueChange={(value) => {
                if (value.length === 2) {
                  setFilters((f) => ({ ...f, yearRange: [value[0], value[1]] as [number, number] }));
                }
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="year-min">From</Label>
                <Input
                  id="year-min"
                  type="number"
                  min={yearBounds[0]}
                  max={filters.yearRange[1]}
                  value={filters.yearRange[0]}
                  onChange={(e) => setFilters((f) => ({ ...f, yearRange: [Number(e.target.value), f.yearRange[1]] }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year-max">To</Label>
                <Input
                  id="year-max"
                  type="number"
                  min={filters.yearRange[0]}
                  max={yearBounds[1]}
                  value={filters.yearRange[1]}
                  onChange={(e) => setFilters((f) => ({ ...f, yearRange: [f.yearRange[0], Number(e.target.value)] }))}
                />
              </div>
            </div>
          </FilterSection>

          <FilterSection title="Severity">
            <div className="space-y-3">
              {(['fatal', 'serious', 'incident'] as SeverityType[]).map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
                  <Checkbox checked={filters.severities.includes(s)} onCheckedChange={() => toggleSeverity(s)} />
                  <span
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      getSeverityDotClass(s),
                    )}
                  />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>
          </FilterSection>
        </div>
      </CardContent>
    </Card>
  );
}
