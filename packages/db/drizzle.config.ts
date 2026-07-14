import { config } from 'dotenv';
import { resolve } from 'path';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit does not load monorepo root env by itself
config({ path: resolve(__dirname, '../../.env.local') });
config({ path: resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Host port 5433 maps to Compose Postgres (see docker-compose.yml)
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/accessshield',
  },
});
