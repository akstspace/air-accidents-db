# Global Air Accident Database & Analysis

An interactive dashboard for exploring global aviation accident data, built with React 19, Vite, shadcn/ui, and OpenStreetMap.

## Features

- Interactive world map using OpenStreetMap (CartoDB dark theme) via react-leaflet
- Shadcn/ui components and charts (recharts via ChartContainer)
- Filter by year range, severity, region, aircraft type
- Accident detail panel with photos
- Offline-capable with IndexedDB cache

## Getting Started

```bash
bun install
bun run dev
```

## Tech Stack

- React 19 + TypeScript
- Vite
- shadcn/ui (Radix UI primitives)
- react-leaflet + OpenStreetMap (CartoDB dark tiles)
- recharts via shadcn chart primitives
- TanStack Query
- IndexedDB (idb)
