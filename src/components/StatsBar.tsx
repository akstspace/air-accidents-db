import { useDashboard } from '@/contexts/DashboardContext';
import { useMemo } from 'react';
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
    { label: 'Matched Incidents', value: stats.totalIncidents.toLocaleString() },
    { label: 'Total Fatalities', value: stats.totalFatalities.toLocaleString() },
    { label: 'Fatal Crashes', value: stats.fatalCount.toLocaleString() },
    { label: 'Aircraft Types', value: stats.uniqueAircraft.toLocaleString() },
  ];

  return (
    <div className="grid border border-border sm:grid-cols-2 xl:grid-cols-4" style={{ gap: '1px', background: 'var(--color-border)' }}>
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.06 }}
          className="bg-background p-4"
        >
          <p className="font-heading text-[1.75rem] font-bold leading-none text-foreground">{item.value}</p>
          <p className="mt-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
