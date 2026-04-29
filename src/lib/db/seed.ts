import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { z } from 'zod';

import { checklistItems, employees, users, type UserRole } from './schema';
import * as schema from './schema';

const seedEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL e obrigatoria'),
  SEED_ADMIN_NAME: z.string().min(1, 'SEED_ADMIN_NAME e obrigatoria').optional(),
  SEED_ADMIN_EMAIL: z
    .email('SEED_ADMIN_EMAIL deve ser um email valido')
    .trim()
    .toLowerCase()
    .optional(),
  SEED_ADMIN_PASSWORD: z
    .string()
    .min(8, 'SEED_ADMIN_PASSWORD deve ter pelo menos 8 caracteres')
    .optional(),
});

const defaultPassword = 'Teste@12345';

const testUsers = [
  {
    name: 'Mariana Costa',
    email: 'rh@empresa.com',
    role: 'RH',
  },
  {
    name: 'Carlos Almeida',
    email: 'gestor.producao@empresa.com',
    role: 'GESTOR',
  },
  {
    name: 'Fernanda Lima',
    email: 'gestor.qualidade@empresa.com',
    role: 'GESTOR',
  },
] satisfies Array<{
  name: string;
  email: string;
  role: UserRole;
}>;

const initialChecklistItems = [
  {
    label: 'Pontualidade',
    description: 'Chegou e cumpriu horarios combinados.',
    order: 1,
  },
  {
    label: 'Cumpriu metas do dia',
    description: 'Entregou as atividades previstas para o turno.',
    order: 2,
  },
  {
    label: 'Colaboracao com a equipe',
    description: 'Apoiou colegas e manteve boa comunicacao.',
    order: 3,
  },
  {
    label: 'Qualidade da entrega',
    description: 'Executou as atividades com qualidade e atencao.',
    order: 4,
  },
  {
    label: 'Iniciativa',
    description: 'Antecipou necessidades e sugeriu melhorias.',
    order: 5,
  },
] as const;

const testEmployees = [
  {
    name: 'Joao Pereira',
    email: 'joao.pereira@empresa.com',
    registration: 'PROD-001',
    position: 'Operador de Producao',
    department: 'Producao',
    managerEmail: 'gestor.producao@empresa.com',
  },
  {
    name: 'Ana Souza',
    email: 'ana.souza@empresa.com',
    registration: 'PROD-002',
    position: 'Auxiliar de Producao',
    department: 'Producao',
    managerEmail: 'gestor.producao@empresa.com',
  },
  {
    name: 'Bruno Santos',
    email: 'bruno.santos@empresa.com',
    registration: 'PROD-003',
    position: 'Preparador de Linha',
    department: 'Producao',
    managerEmail: 'gestor.producao@empresa.com',
  },
  {
    name: 'Camila Rocha',
    email: 'camila.rocha@empresa.com',
    registration: 'QUAL-001',
    position: 'Inspetora de Qualidade',
    department: 'Qualidade',
    managerEmail: 'gestor.qualidade@empresa.com',
  },
  {
    name: 'Diego Nunes',
    email: 'diego.nunes@empresa.com',
    registration: 'QUAL-002',
    position: 'Analista de Qualidade',
    department: 'Qualidade',
    managerEmail: 'gestor.qualidade@empresa.com',
  },
  {
    name: 'Elisa Martins',
    email: 'elisa.martins@empresa.com',
    registration: 'RH-001',
    position: 'Assistente de RH',
    department: 'Recursos Humanos',
    managerEmail: 'rh@empresa.com',
  },
] as const;

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
  const db = drizzle(pool, { schema });

  try {
    const adminPasswordHash = await bcrypt.hash(
      parsedEnv.data.SEED_ADMIN_PASSWORD ?? defaultPassword,
      12,
    );
    const testPasswordHash = await bcrypt.hash(defaultPassword, 12);
    const usersToSeed = [
      ...(parsedEnv.data.SEED_ADMIN_NAME && parsedEnv.data.SEED_ADMIN_EMAIL
        ? [
            {
              name: parsedEnv.data.SEED_ADMIN_NAME,
              email: parsedEnv.data.SEED_ADMIN_EMAIL,
              role: 'ADMIN' as const,
              passwordHash: adminPasswordHash,
            },
          ]
        : []),
      ...testUsers.map((user) => ({
        ...user,
        passwordHash: testPasswordHash,
      })),
    ];

    for (const user of usersToSeed) {
      await db
        .insert(users)
        .values({
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
          active: true,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            name: user.name,
            passwordHash: user.passwordHash,
            role: user.role,
            active: true,
            updatedAt: new Date(),
          },
        });

      console.log(`Usuario garantido: ${user.email} (${user.role})`);
    }

    for (const item of initialChecklistItems) {
      const existingItem = await db.query.checklistItems.findFirst({
        where: eq(checklistItems.label, item.label),
        columns: {
          id: true,
        },
      });

      if (existingItem) {
        continue;
      }

      await db.insert(checklistItems).values(item);
      console.log(`Item de checklist criado: ${item.label}`);
    }

    const seededUsers = await db.query.users.findMany({
      columns: {
        id: true,
        email: true,
      },
    });
    const userIdsByEmail = new Map(seededUsers.map((user) => [user.email, user.id]));

    for (const employee of testEmployees) {
      const managerId = userIdsByEmail.get(employee.managerEmail);

      if (!managerId) {
        throw new Error(`Gestor nao encontrado para funcionario: ${employee.managerEmail}`);
      }

      await db
        .insert(employees)
        .values({
          name: employee.name,
          email: employee.email,
          registration: employee.registration,
          position: employee.position,
          department: employee.department,
          managerId,
          active: true,
        })
        .onConflictDoUpdate({
          target: employees.registration,
          set: {
            name: employee.name,
            email: employee.email,
            position: employee.position,
            department: employee.department,
            managerId,
            active: true,
            updatedAt: new Date(),
          },
        });

      console.log(`Funcionario garantido: ${employee.name} (${employee.department})`);
    }

    console.log(`Senha padrao dos usuarios de teste: ${defaultPassword}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
