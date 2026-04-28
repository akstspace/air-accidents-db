import { useDashboard } from '@/contexts/DashboardContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSeverity } from '@/lib/types';
import { useTheme } from 'next-themes';
import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const SEVERITY_COLORS: Record<string, string> = {
  fatal: '#dc2626',
  serious: '#d97706',
  incident: '#6366F1',
};

type AccidentMapProps = {
  variant?: 'search' | 'dashboard';
};

export default function AccidentMap({ variant = 'dashboard' }: Readonly<AccidentMapProps>) {
  const { filteredAccidents, setSelectedAccident } = useDashboard();
  const { theme, resolvedTheme } = useTheme();
  const effectiveTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const title = variant === 'search' ? 'Search Result Map' : 'Global Accident Map';
  const description = variant === 'search'
    ? 'Geographic clustering for the currently matched semantic search results.'
    : 'Geographic overview for the currently filtered accident dataset.';

  const markers = useMemo(
    () =>
      filteredAccidents
        .filter(
          (a) =>
            Number.isFinite(a.latitude) &&
            Number.isFinite(a.longitude) &&
            a.latitude !== 0 &&
            a.longitude !== 0,
        )
        .slice(0, 1800)
        .map((a) => ({ accident: a, severity: getSeverity(a) })),
    [filteredAccidents],
  );

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary">{markers.length.toLocaleString()} markers</Badge>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-lg border border-border" style={{ minHeight: 420, height: '100%' }}>
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{
              width: '100%',
              height: '100%',
              minHeight: 420,
              background: effectiveTheme === 'light' ? '#F5F5FA' : '#0E0C2A',
            }}
            zoomControl
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={effectiveTheme === 'light'
                ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'}
            />
            {markers.map(({ accident, severity }) => (
              <CircleMarker
                key={accident.id}
                center={[accident.latitude, accident.longitude]}
                radius={Math.min(4 + (accident.total_fatalities || 0) / 100, 10)}
                pathOptions={{
                  color: SEVERITY_COLORS[severity],
                  fillColor: SEVERITY_COLORS[severity],
                  fillOpacity: 0.85,
                  weight: 1,
                }}
                eventHandlers={{
                  click: () => setSelectedAccident(accident),
                }}
              >
                <Popup>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <strong>{accident.page_title}</strong>
                    <br />
                    {accident.date} &middot; {accident.total_fatalities} fatalities
                    {accident.searchMatchPercent !== undefined && accident.searchMatchPercent !== null && (
                      <>
                        <br />
                        Match {accident.searchMatchPercent}%
                      </>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <p className="text-xs font-medium text-foreground">Severity</p>
          {(['fatal', 'serious', 'incident'] as const).map((key) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[key] }} />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
