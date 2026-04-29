import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

import { env } from '@/lib/env';
import * as schema from './schema';

type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let pool: Pool | null = null;
let db: DbClient | null = null;

export function getDb() {
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
  }

  if (!db) {
    db = drizzle(pool, { schema });
  }

  return db;
}
