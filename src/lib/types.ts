export interface Accident {
  id: number;
  searchMatchPercent?: number | null;
  searchMatchSource?: 'origin' | 'destination' | 'site' | null;
  page_title: string;
  wikipedia_url: string;
  decade: string;
  year: number;
  date: string;
  summary_infobox: string;
  site: string;
  aircraft_type: string;
  aircraft_name: string;
  operator: string;
  iata_flight: string;
  icao_flight: string;
  call_sign: string;
  registration: string;
  flight_origin: string;
  destination: string;
  stopover: string;
  occupants: string;
  passengers: string;
  crew: string;
  fatalities: string;
  total_fatalities: number;
  ground_fatalities: string;
  total_ground_fatalities: number;
  injuries: string;
  total_injuries: number;
  ground_injuries: string;
  total_ground_injuries: number;
  survivors: string;
  total_survivors: number;
  latitude: number;
  longitude: number;
  coordinates_raw: string;
  investigation_text: string;
  cause_text: string;
  aircraft_specs_text: string;
  technical_details_text: string;
  accident_description: string;
  sections_json: string;
  infobox_extra_json: string;
  aircraft_list_json: string;
  scrape_error: string;
  index_summary: string;
  image_count: number;
}

export interface AccidentImage {
  wikipedia_url: string;
  page_title: string;
  year: number;
  image_index: number;
  src: string;
  full_src: string;
  alt: string;
  caption: string;
}

export interface AircraftEntry {
  aircraft_type?: string | null;
  aircraft_name?: string | null;
  operator?: string | null;
  iata_flight?: string | null;
  icao_flight?: string | null;
  call_sign?: string | null;
  registration?: string | null;
  flight_origin?: string | null;
  destination?: string | null;
  stopover?: string | null;
  occupants?: string | null;
  passengers?: string | null;
  crew?: string | null;
  fatalities?: string | null;
  injuries?: string | null;
  survivors?: string | null;
  extra?: Record<string, string>;
}

export type AccidentSourceScalar = string | number | null;

export interface AccidentSourceImage {
  wikipedia_url?: AccidentSourceScalar;
  page_title?: AccidentSourceScalar;
  year?: AccidentSourceScalar;
  image_index?: AccidentSourceScalar;
  src?: AccidentSourceScalar;
  full_src?: AccidentSourceScalar;
  alt?: AccidentSourceScalar;
  caption?: AccidentSourceScalar;
}

export interface AccidentSourceRecord {
  page_title?: AccidentSourceScalar;
  wikipedia_url?: AccidentSourceScalar;
  decade?: AccidentSourceScalar;
  year?: AccidentSourceScalar;
  date?: AccidentSourceScalar;
  summary_infobox?: AccidentSourceScalar;
  site?: AccidentSourceScalar;
  aircraft_type?: AccidentSourceScalar;
  aircraft_name?: AccidentSourceScalar;
  operator?: AccidentSourceScalar;
  iata_flight?: AccidentSourceScalar;
  icao_flight?: AccidentSourceScalar;
  call_sign?: AccidentSourceScalar;
  registration?: AccidentSourceScalar;
  flight_origin?: AccidentSourceScalar;
  destination?: AccidentSourceScalar;
  stopover?: AccidentSourceScalar;
  occupants?: AccidentSourceScalar;
  passengers?: AccidentSourceScalar;
  crew?: AccidentSourceScalar;
  fatalities?: AccidentSourceScalar;
  ground_fatalities?: AccidentSourceScalar;
  injuries?: AccidentSourceScalar;
  ground_injuries?: AccidentSourceScalar;
  survivors?: AccidentSourceScalar;
  latitude?: AccidentSourceScalar;
  longitude?: AccidentSourceScalar;
  coordinates_raw?: AccidentSourceScalar;
  investigation_text?: AccidentSourceScalar;
  cause_text?: AccidentSourceScalar;
  aircraft_specs_text?: AccidentSourceScalar;
  technical_details_text?: AccidentSourceScalar;
  accident_description?: AccidentSourceScalar;
  sections?: unknown;
  infobox_extra?: unknown;
  aircraft_list?: unknown;
  scrape_error?: AccidentSourceScalar;
  index_summary?: AccidentSourceScalar;
  image_count?: AccidentSourceScalar;
  images?: AccidentSourceImage[] | null;
}

export type SeverityType = 'fatal' | 'serious' | 'incident';

export interface FilterState {
  yearRange: [number, number];
  aircraftTypes: string[];
  severities: SeverityType[];
}

export interface AccidentQueryState extends FilterState {
  searchQuery: string;
}

export type DataSourceType = 'none' | 'url' | 'file';

export interface DataSourceConfig {
  type: DataSourceType;
  dataUrl: string;
  fileName: string;
}

export type DatabaseProgressMode =
  | 'initializing'
  | 'refreshing'
  | 'updating'
  | 'generating-embeddings'
  | 'exporting-embeddings'
  | 'importing-embeddings';

export type DatabaseProgressStage =
  | 'idle'
  | 'preparing'
  | 'fetching-data'
  | 'processing-records'
  | 'generating-embeddings'
  | 'exporting-embeddings'
  | 'importing-embeddings'
  | 'storing-accidents'
  | 'storing-embeddings'
  | 'storing-images'
  | 'finalizing'
  | 'complete'
  | 'error';

export interface DatabaseProgress {
  active: boolean;
  mode: DatabaseProgressMode | null;
  stage: DatabaseProgressStage;
  message: string;
  current: number;
  total: number;
  percent: number;
  error: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  source: DataSourceConfig;
}

export interface DatabaseStatus {
  loaded: boolean;
  accidentCount: number;
  imageCount: number;
  refreshedAt: string | null;
  semanticSearchAvailable: boolean;
  semanticSearchReason: string | null;
}

export function getSeverity(accident: Accident): SeverityType {
  if (accident.total_fatalities > 0) return 'fatal';
  if (accident.total_injuries > 0) return 'serious';
  return 'incident';
}

export function getRegion(site: string): string {
  if (!site) return 'Unknown';
  const s = site.toLowerCase();
  if (s.includes('united states') || s.includes('canada') || s.includes('mexico')) return 'North America';
  if (s.includes('brazil') || s.includes('argentina') || s.includes('colombia') || s.includes('peru') || s.includes('chile') || s.includes('venezuela')) return 'South America';
  if (s.includes('united kingdom') || s.includes('france') || s.includes('germany') || s.includes('italy') || s.includes('spain') || s.includes('russia') || s.includes('netherlands') || s.includes('belgium') || s.includes('switzerland') || s.includes('portugal') || s.includes('norway') || s.includes('sweden') || s.includes('denmark') || s.includes('poland') || s.includes('austria') || s.includes('greece') || s.includes('ireland') || s.includes('czech') || s.includes('romania') || s.includes('hungary') || s.includes('ukraine') || s.includes('turkey')) return 'Europe';
  if (s.includes('china') || s.includes('japan') || s.includes('india') || s.includes('indonesia') || s.includes('korea') || s.includes('thailand') || s.includes('vietnam') || s.includes('philippines') || s.includes('malaysia') || s.includes('taiwan') || s.includes('pakistan') || s.includes('bangladesh') || s.includes('nepal') || s.includes('sri lanka') || s.includes('myanmar') || s.includes('singapore') || s.includes('australia') || s.includes('new zealand')) return 'Asia-Pacific';
  if (s.includes('nigeria') || s.includes('south africa') || s.includes('kenya') || s.includes('egypt') || s.includes('ethiopia') || s.includes('congo') || s.includes('morocco') || s.includes('algeria') || s.includes('ghana') || s.includes('cameroon')) return 'Africa';
  if (s.includes('saudi') || s.includes('iran') || s.includes('iraq') || s.includes('israel') || s.includes('uae') || s.includes('qatar') || s.includes('kuwait') || s.includes('bahrain') || s.includes('oman') || s.includes('jordan') || s.includes('lebanon') || s.includes('syria')) return 'Middle East';
  return 'Other';
}
