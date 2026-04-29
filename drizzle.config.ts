import type { Config } from 'drizzle-kit';

// DATABASE_URL injetada via dotenv-cli nos scripts db:*
export default {
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
