import { useDashboard } from '@/contexts/DashboardContext';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'motion/react';

const barConfig: ChartConfig = {
  count: { label: 'Crashes', color: 'hsl(var(--chart-1))' },
};

const lineConfig: ChartConfig = {
  count: { label: 'Crashes', color: 'hsl(var(--chart-2))' },
};

const causesConfig: ChartConfig = {
  'Human Error': { label: 'Human Error', color: 'hsl(var(--chart-1))' },
  Mechanical: { label: 'Mechanical', color: 'hsl(var(--chart-2))' },
  Weather: { label: 'Weather', color: 'hsl(var(--chart-3))' },
  Other: { label: 'Other', color: 'hsl(var(--chart-4))' },
};

const PIE_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(280 60% 50%)',
];

export function AircraftTypeChart() {
  const { filteredAccidents } = useDashboard();

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAccidents.forEach(a => {
      const type = a.aircraft_type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, count }));
  }, [filteredAccidents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Crashes by Aircraft Type</CardTitle>
          <CardDescription className="text-xs">Top 6 aircraft types</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ChartContainer config={barConfig} className="h-[180px] w-full">
            <BarChart accessibilityLayer data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function CausesChart() {
  const { filteredAccidents } = useDashboard();

  const data = useMemo(() => {
    const causes: Record<string, number> = { 'Human Error': 0, 'Mechanical': 0, 'Weather': 0, 'Other': 0 };
    filteredAccidents.forEach(a => {
      const ct = (a.cause_text || '').toLowerCase();
      if (ct.includes('pilot') || ct.includes('human') || ct.includes('crew') || ct.includes('error')) causes['Human Error']++;
      else if (ct.includes('engine') || ct.includes('mechanical') || ct.includes('structural') || ct.includes('failure')) causes['Mechanical']++;
      else if (ct.includes('weather') || ct.includes('storm') || ct.includes('ice') || ct.includes('fog') || ct.includes('wind')) causes['Weather']++;
      else causes['Other']++;
    });
    return Object.entries(causes).map(([name, value]) => ({ name, value, fill: `var(--color-${name.replace(' ', '-')})` }));
  }, [filteredAccidents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Primary Causes</CardTitle>
          <CardDescription className="text-xs">Categorised from investigation text</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ChartContainer config={causesConfig} className="h-[180px] w-full">
            <PieChart accessibilityLayer>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={60}
                innerRadius={30}
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AnnualCrashesChart() {
  const { filteredAccidents } = useDashboard();

  const data = useMemo(() => {
    const counts: Record<number, number> = {};
    filteredAccidents.forEach(a => {
      if (a.year > 0) counts[a.year] = (counts[a.year] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([year, count]) => ({ year: +year, count }))
      .sort((a, b) => a.year - b.year);
  }, [filteredAccidents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Annual Air Crashes</CardTitle>
          <CardDescription className="text-xs">Timeline of incidents per year</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ChartContainer config={lineConfig} className="h-[200px] w-full">
            <LineChart accessibilityLayer data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
