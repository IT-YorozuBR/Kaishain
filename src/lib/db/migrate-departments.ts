import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Pool } from '@neondatabase/serverless';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { z } from 'zod';

import { departments, employees } from '@/lib/db/schema';
import * as schema from '@/lib/db/schema';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória.'),
});

const DEPARTMENT_NAMES = [
  'Administrativo',
  'RH/DP',
  'Financeiro/Fiscal/Contabilidade',
  'Tecnologia da Informação',
  'SST/MA',
  'Logística',
  'Compras',
  'Comercial',
  'Engenharia',
  'Pintura Interna',
  'Manutenção',
  'Qualidade',
  'Prensa',
  'Caldeiraria',
  'Ferramentaria',
  'Montagem/Solda',
  'Pintura',
  'Picking',
];

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadEnv() {
  loadEnvFile(resolve(process.cwd(), '.env.local'));
  loadEnvFile(resolve(process.cwd(), '.env'));

  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente inválidas: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
    );
  }

  return parsed.data;
}

async function main() {
  const env = loadEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    console.log('Inserindo departamentos...');
    const inserted = await db
      .insert(departments)
      .values(DEPARTMENT_NAMES.map((name) => ({ name })))
      .onConflictDoNothing()
      .returning();
    console.log(`  ${inserted.length} departamentos inseridos.`);

    const allDepartments = await db
      .select({ id: departments.id, name: departments.name })
      .from(departments);
    const nameToId = new Map(allDepartments.map((department) => [department.name, department.id]));
    const aliases = new Map([
      ['Tecnologia da informacao', 'Tecnologia da Informação'],
      ['Tecnologia da informação', 'Tecnologia da Informação'],
      ['Tecnologia da Informacao', 'Tecnologia da Informação'],
      ['Logistica', 'Logística'],
      ['Manutencao', 'Manutenção'],
      ['Manutenção', 'Manutenção'],
    ]);

    console.log('Atualizando funcionários...');
    const legacyEmployees = await db.execute<{
      id: string;
      department: string | null;
    }>(sql`SELECT "id", "department" FROM "employees"`);

    let updated = 0;
    let skipped = 0;

    for (const employee of legacyEmployees.rows) {
      if (!employee.department) {
        skipped++;
        continue;
      }

      const departmentId = nameToId.get(aliases.get(employee.department) ?? employee.department);
      if (!departmentId) {
        console.warn(
          `  Departamento não encontrado para funcionário ${employee.id}: "${employee.department}"`,
        );
        skipped++;
        continue;
      }

      await db.update(employees).set({ departmentId }).where(eq(employees.id, employee.id));
      updated++;
    }

    console.log(`  ${updated} funcionários atualizados, ${skipped} ignorados.`);
    console.log('Migração concluída.');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
