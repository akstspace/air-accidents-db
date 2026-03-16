import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/database/schema.ts',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
});