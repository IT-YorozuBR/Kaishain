import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { z } from 'zod';

import { users } from './schema';

const seedEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL e obrigatoria'),
  SEED_ADMIN_NAME: z.string().min(1, 'SEED_ADMIN_NAME e obrigatoria'),
  SEED_ADMIN_EMAIL: z.email('SEED_ADMIN_EMAIL deve ser um email valido').trim().toLowerCase(),
  SEED_ADMIN_PASSWORD: z.string().min(8, 'SEED_ADMIN_PASSWORD deve ter pelo menos 8 caracteres'),
});

async function main() {
  const parsedEnv = seedEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME,
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
  });

  if (!parsedEnv.success) {
    const errors = parsedEnv.error.flatten().fieldErrors;
    throw new Error(`Variaveis de seed invalidas: ${JSON.stringify(errors)}`);
  }

  const pool = new Pool({ connectionString: parsedEnv.data.DATABASE_URL });
  const db = drizzle(pool);

  try {
    const [result] = await db.select({ value: count() }).from(users);

    if ((result?.value ?? 0) > 0) {
      console.log('Seed ignorado: ja existe pelo menos um usuario cadastrado.');
      return;
    }

    const passwordHash = await bcrypt.hash(parsedEnv.data.SEED_ADMIN_PASSWORD, 12);

    await db.insert(users).values({
      name: parsedEnv.data.SEED_ADMIN_NAME,
      email: parsedEnv.data.SEED_ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      active: true,
    });

    console.log(`Usuario ADMIN inicial criado: ${parsedEnv.data.SEED_ADMIN_EMAIL}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
