import { index, integer, pgTable, primaryKey, text, doublePrecision, vector } from 'drizzle-orm/pg-core';

import { EMBEDDING_DIMENSIONS } from './embeddings';

export const accidents = pgTable(
  'accidents',
  {
    id: integer('id').primaryKey(),
    page_title: text('page_title').notNull(),
    wikipedia_url: text('wikipedia_url').notNull(),
    decade: text('decade').notNull(),
    year: integer('year').notNull(),
    date: text('date').notNull(),
    summary_infobox: text('summary_infobox').notNull(),
    site: text('site').notNull(),
    aircraft_type: text('aircraft_type').notNull(),
    aircraft_name: text('aircraft_name').notNull(),
    operator: text('operator').notNull(),
    iata_flight: text('iata_flight').notNull(),
    icao_flight: text('icao_flight').notNull(),
    call_sign: text('call_sign').notNull(),
    registration: text('registration').notNull(),
    flight_origin: text('flight_origin').notNull(),
    destination: text('destination').notNull(),
    stopover: text('stopover').notNull(),
    occupants: text('occupants').notNull(),
    passengers: text('passengers').notNull(),
    crew: text('crew').notNull(),
    fatalities: text('fatalities').notNull(),
    total_fatalities: integer('total_fatalities').notNull(),
    ground_fatalities: text('ground_fatalities').notNull(),
    total_ground_fatalities: integer('total_ground_fatalities').notNull(),
    injuries: text('injuries').notNull(),
    total_injuries: integer('total_injuries').notNull(),
    ground_injuries: text('ground_injuries').notNull(),
    total_ground_injuries: integer('total_ground_injuries').notNull(),
    survivors: text('survivors').notNull(),
    total_survivors: integer('total_survivors').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    coordinates_raw: text('coordinates_raw').notNull(),
    investigation_text: text('investigation_text').notNull(),
    cause_text: text('cause_text').notNull(),
    aircraft_specs_text: text('aircraft_specs_text').notNull(),
    technical_details_text: text('technical_details_text').notNull(),
    accident_description: text('accident_description').notNull(),
    sections_json: text('sections_json').notNull(),
    infobox_extra_json: text('infobox_extra_json').notNull(),
    aircraft_list_json: text('aircraft_list_json').notNull(),
    scrape_error: text('scrape_error').notNull(),
    index_summary: text('index_summary').notNull(),
    image_count: integer('image_count').notNull(),
  },
  (table) => [
    index('accidents_year_idx').on(table.year),
    index('accidents_aircraft_type_idx').on(table.aircraft_type),
    index('accidents_coordinates_idx').on(table.latitude, table.longitude),
  ],
);

export const accident_embeddings = pgTable(
  'accident_embeddings',
  {
    accident_id: integer('accident_id')
      .notNull()
      .references(() => accidents.id, { onDelete: 'cascade' }),
    search_document: text('search_document').notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.accident_id] }),
    index('accident_embeddings_accident_id_idx').on(table.accident_id),
  ],
);

export const images = pgTable(
  'images',
  {
    id: integer('id').primaryKey(),
    wikipedia_url: text('wikipedia_url').notNull(),
    page_title: text('page_title').notNull(),
    year: integer('year').notNull(),
    image_index: integer('image_index').notNull(),
    src: text('src').notNull(),
    full_src: text('full_src').notNull(),
    alt: text('alt').notNull(),
    caption: text('caption').notNull(),
  },
  (table) => [index('images_wikipedia_url_idx').on(table.wikipedia_url)],
);

export const meta = pgTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const schema = {
  accidents,
  accident_embeddings,
  images,
  meta,
};