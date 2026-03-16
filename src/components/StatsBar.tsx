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
    { icon: AlertTriangle, label: 'Matched Incidents', value: stats.totalIncidents.toLocaleString(), color: 'text-severity-incident' },
    { icon: Skull, label: 'Total Fatalities', value: stats.totalFatalities.toLocaleString(), color: 'text-severity-fatal' },
    { icon: Plane, label: 'Fatal Crashes', value: stats.fatalCount.toLocaleString(), color: 'text-severity-serious' },
    { icon: Users, label: 'Aircraft Types', value: stats.uniqueAircraft.toLocaleString(), color: 'text-primary' },
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
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`rounded-xl bg-muted p-2.5 ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
