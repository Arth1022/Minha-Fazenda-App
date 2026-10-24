import { defineConfig } from 'drizzle-kit';

// Gera as migrations com: npx drizzle-kit generate
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/database/schema.ts',
  out: './src/database/migrations',
});
