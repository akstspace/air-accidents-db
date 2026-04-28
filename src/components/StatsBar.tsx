import { useDashboard } from '@/contexts/DashboardContext';
import { useMemo } from 'react';
import { Plane, Skull, AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'motion/react';

export default function StatsBar() {
  const { filteredAccidents } = useDashboard();

  const stats = useMemo(() => {
    const totalIncidents = filteredAccidents.length;
    const totalFatalities = filteredAccidents.reduce((s, a) => s + (a.total_fatalities || 0), 0);
    const fatalCount = filteredAccidents.filter(a => a.total_fatalities > 0).length;
    const uniqueAircraft = new Set(filteredAccidents.map(a => a.aircraft_type).filter(Boolean)).size;
    return { totalIncidents, totalFatalities, fatalCount, uniqueAircraft };
  }, [filteredAccidents]);

  const items = [
    { icon: AlertTriangle, label: 'Matched Incidents', value: stats.totalIncidents.toLocaleString(), color: 'text-severity-incident', surface: 'bg-[hsl(var(--severity-incident)/0.12)]' },
    { icon: Skull, label: 'Total Fatalities', value: stats.totalFatalities.toLocaleString(), color: 'text-severity-fatal', surface: 'bg-[hsl(var(--severity-fatal)/0.12)]' },
    { icon: Plane, label: 'Fatal Crashes', value: stats.fatalCount.toLocaleString(), color: 'text-severity-serious', surface: 'bg-[hsl(var(--severity-serious)/0.12)]' },
    { icon: Users, label: 'Aircraft Types', value: stats.uniqueAircraft.toLocaleString(), color: 'text-foreground', surface: 'bg-secondary' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.06 }}
        >
          <Card className="bg-background">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`rounded-md border border-border p-2.5 ${item.surface} ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-foreground">{item.value}</p>
                <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
