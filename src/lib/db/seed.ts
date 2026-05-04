import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { z } from 'zod';

import {
  checklistItems,
  employees,
  evaluationChecklistResults,
  evaluations,
  users,
  type Turno,
  type UserRole,
} from './schema';
import * as schema from './schema';

const seedEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL e obrigatoria'),
  SEED_ADMIN_NAME: z.string().min(1).optional(),
  SEED_ADMIN_EMAIL: z.email().trim().toLowerCase().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
});

const DEFAULT_PASSWORD = 'Teste@12345';
const EXPECTED_EMPLOYEES_TOTAL = 365;

type DepartmentSeed = {
  name: string;
  count: number;
  registrationPrefix: string;
  position: string;
};

const departmentSeeds = [
  {
    name: 'Administrativo',
    count: 3,
    registrationPrefix: 'ADM',
    position: 'Assistente Administrativo',
  },
  { name: 'RH/DP', count: 4, registrationPrefix: 'RHDP', position: 'Assistente de RH/DP' },
  {
    name: 'Financeiro/Fiscal/Contabilidade',
    count: 6,
    registrationPrefix: 'FIN',
    position: 'Analista Financeiro',
  },
  {
    name: 'Tecnologia da Informação',
    count: 3,
    registrationPrefix: 'TI',
    position: 'Analista de TI',
  },
  { name: 'SST/MA', count: 5, registrationPrefix: 'SSTMA', position: 'Tecnico de SST/MA' },
  {
    name: 'Logística',
    count: 14,
    registrationPrefix: 'LOG',
    position: 'Operador de Logistica',
  },
  { name: 'Compras', count: 3, registrationPrefix: 'COMP', position: 'Assistente de Compras' },
  { name: 'Comercial', count: 2, registrationPrefix: 'COM', position: 'Assistente Comercial' },
  {
    name: 'Engenharia',
    count: 5,
    registrationPrefix: 'ENG',
    position: 'Analista de Engenharia',
  },
  {
    name: 'Pintura Interna',
    count: 7,
    registrationPrefix: 'PINTI',
    position: 'Operador de Pintura Interna',
  },
  {
    name: 'Manutenção',
    count: 14,
    registrationPrefix: 'MAN',
    position: 'Tecnico de Manutencao',
  },
  {
    name: 'Qualidade',
    count: 19,
    registrationPrefix: 'QUAL',
    position: 'Inspetor de Qualidade',
  },
  { name: 'Prensa', count: 53, registrationPrefix: 'PRE', position: 'Operador de Prensa' },
  {
    name: 'Caldeiraria',
    count: 4,
    registrationPrefix: 'CALD',
    position: 'Caldeireiro',
  },
  {
    name: 'Ferramentaria',
    count: 8,
    registrationPrefix: 'FERR',
    position: 'Ferramenteiro',
  },
  {
    name: 'Montagem/Solda',
    count: 167,
    registrationPrefix: 'MS',
    position: 'Operador de Montagem/Solda',
  },
  { name: 'Pintura', count: 21, registrationPrefix: 'PINT', position: 'Operador de Pintura' },
  { name: 'Picking', count: 27, registrationPrefix: 'PICK', position: 'Operador de Picking' },
] as const satisfies readonly DepartmentSeed[];

const firstNames = [
  'Ana',
  'Bruno',
  'Carla',
  'Daniel',
  'Eduarda',
  'Felipe',
  'Gabriela',
  'Henrique',
  'Isabela',
  'Joao',
  'Karen',
  'Leonardo',
  'Mariana',
  'Nicolas',
  'Olivia',
  'Paulo',
  'Renata',
  'Sergio',
  'Tatiane',
  'Victor',
  'Amanda',
  'Caio',
  'Debora',
  'Everton',
  'Fernanda',
  'Gustavo',
  'Helena',
  'Igor',
  'Juliana',
  'Lucas',
] as const;

const lastNames = [
  'Almeida',
  'Barbosa',
  'Cardoso',
  'Dias',
  'Esteves',
  'Ferreira',
  'Gomes',
  'Lima',
  'Martins',
  'Nogueira',
  'Oliveira',
  'Pereira',
  'Ramos',
  'Silva',
  'Teixeira',
  'Vieira',
  'Andrade',
  'Batista',
  'Campos',
  'Correia',
  'Freitas',
  'Mendes',
  'Moreira',
  'Rocha',
  'Santos',
  'Souza',
  'Torres',
  'Ribeiro',
  'Nascimento',
  'Carvalho',
] as const;

function normalizeToSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getManagerEmail(department: string) {
  return `gestor.${normalizeToSlug(department)}@empresa.com`;
}

function getTurno(index: number): Turno {
  const turnos = ['PRIMEIRO', 'SEGUNDO', 'TERCEIRO'] as const satisfies readonly Turno[];
  return turnos[index % turnos.length];
}

function getEmployeeName(globalIndex: number) {
  const firstName = firstNames[globalIndex % firstNames.length];
  const lastName = lastNames[Math.floor(globalIndex / firstNames.length) % lastNames.length];
  return `${firstName} ${lastName}`;
}

type EmployeeSeed = {
  name: string;
  email: string;
  registration: string;
  position: string;
  department: string;
  turno: Turno;
  managerEmail: string;
};

const departmentEmployeesTotal = departmentSeeds.reduce((total, department) => {
  return total + department.count;
}, 0);

if (departmentEmployeesTotal !== EXPECTED_EMPLOYEES_TOTAL) {
  throw new Error(
    `Total de funcionarios invalido no seed: esperado ${EXPECTED_EMPLOYEES_TOTAL}, recebido ${departmentEmployeesTotal}.`,
  );
}

const testUsers: Array<{ name: string; email: string; role: UserRole; department?: string }> = [
  { name: 'Mariana Costa', email: 'rh@empresa.com', role: 'RH', department: 'RH/DP' },
  ...departmentSeeds.map((department) => ({
    name: `Gestor ${department.name}`,
    email: getManagerEmail(department.name),
    role: 'GESTOR' as const,
    department: department.name,
  })),
];

const testEmployees: EmployeeSeed[] = departmentSeeds.flatMap((department, departmentIndex) => {
  const previousCount = departmentSeeds
    .slice(0, departmentIndex)
    .reduce((total, item) => total + item.count, 0);

  return Array.from({ length: department.count }, (_, localIndex) => {
    const globalIndex = previousCount + localIndex;
    const name = getEmployeeName(globalIndex);
    const nameSlug = normalizeToSlug(name).replace(/-/g, '.');
    const sequence = String(localIndex + 1).padStart(3, '0');

    return {
      name,
      email: `${nameSlug}.${String(globalIndex + 1).padStart(3, '0')}@empresa.com`,
      registration: `${department.registrationPrefix}-${sequence}`,
      position: department.position,
      department: department.name,
      turno: getTurno(globalIndex),
      managerEmail: getManagerEmail(department.name),
    };
  });
});

const initialChecklistItems = [
  { label: 'Pontualidade', description: 'Chegou e cumpriu horarios combinados.', order: 1 },
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
  { label: 'Iniciativa', description: 'Antecipou necessidades e sugeriu melhorias.', order: 5 },
] as const;

const evaluationDates = [
  '2026-04-20',
  '2026-04-21',
  '2026-04-22',
  '2026-04-23',
  '2026-04-24',
  '2026-04-27',
  '2026-04-28',
  '2026-04-29',
] as const;

const evaluationNotes = [
  'Manteve boa consistencia na rotina e colaborou com a equipe.',
  'Cumpriu as prioridades do dia com atencao aos detalhes.',
  'Teve boa produtividade e comunicou impedimentos com antecedencia.',
  'Executou as atividades previstas e manteve organizacao no posto.',
  'Apresentou evolucao nas entregas e boa postura durante o turno.',
] as const;

function getSeedScore(employeeIndex: number, dateIndex: number) {
  return 6 + ((employeeIndex + dateIndex) % 5);
}

function getChecklistChecked(employeeIndex: number, dateIndex: number, itemIndex: number) {
  return (employeeIndex + dateIndex + itemIndex) % 6 !== 0;
}

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
    const testPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const adminPasswordHash = await bcrypt.hash(
      parsedEnv.data.SEED_ADMIN_PASSWORD ?? DEFAULT_PASSWORD,
      12,
    );

    const usersToSeed = [
      ...(parsedEnv.data.SEED_ADMIN_NAME && parsedEnv.data.SEED_ADMIN_EMAIL
        ? [
            {
              name: parsedEnv.data.SEED_ADMIN_NAME,
              email: parsedEnv.data.SEED_ADMIN_EMAIL,
              role: 'ADMIN' as const,
              passwordHash: adminPasswordHash,
              department: null,
            },
          ]
        : []),
      ...testUsers.map((user) => ({ ...user, passwordHash: testPasswordHash })),
    ];

    console.log('\nUsuarios');
    for (const user of usersToSeed) {
      await db
        .insert(users)
        .values({
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
          department: user.department ?? null,
          active: true,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            name: user.name,
            passwordHash: user.passwordHash,
            role: user.role,
            department: user.department ?? null,
            active: true,
            updatedAt: new Date(),
          },
        });

      console.log(`  [${user.role.padEnd(6)}] ${user.name} <${user.email}>`);
    }

    console.log('\nChecklist');
    for (const item of initialChecklistItems) {
      const existing = await db.query.checklistItems.findFirst({
        where: eq(checklistItems.label, item.label),
        columns: { id: true },
      });

      if (existing) {
        console.log(`  [skip ] ${item.label}`);
        continue;
      }

      await db.insert(checklistItems).values(item);
      console.log(`  [criou] ${item.label}`);
    }

    const seededUsers = await db.query.users.findMany({ columns: { id: true, email: true } });
    const userIdsByEmail = new Map(seededUsers.map((user) => [user.email, user.id]));

    console.log('\nFuncionarios');
    for (const department of departmentSeeds) {
      const departmentEmployees = testEmployees.filter(
        (employee) => employee.department === department.name,
      );

      console.log(`\n  ${department.name} (${departmentEmployees.length} funcionarios)`);

      for (const employee of departmentEmployees) {
        const managerId = userIdsByEmail.get(employee.managerEmail);

        if (!managerId) {
          throw new Error(`Gestor nao encontrado: ${employee.managerEmail}`);
        }

        await db
          .insert(employees)
          .values({
            name: employee.name,
            email: employee.email,
            registration: employee.registration,
            position: employee.position,
            department: employee.department,
            turno: employee.turno,
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
              turno: employee.turno,
              managerId,
              active: true,
              updatedAt: new Date(),
            },
          });

        console.log(
          `    [${employee.turno.padEnd(8)}] ${employee.registration} - ${employee.name}`,
        );
      }
    }

    console.log('\nAvaliacoes');
    const seededEmployees = await db.query.employees.findMany({
      columns: { id: true, registration: true },
    });
    const employeeIdsByRegistration = new Map(
      seededEmployees
        .filter((employee) => employee.registration !== null)
        .map((employee) => [employee.registration as string, employee.id]),
    );

    const seededChecklistItems = await db.query.checklistItems.findMany({
      columns: { id: true, label: true },
    });
    const checklistItemIdsByLabel = new Map(
      seededChecklistItems.map((item) => [item.label, item.id]),
    );
    const checklistItemIds = initialChecklistItems.map((item) => {
      const checklistItemId = checklistItemIdsByLabel.get(item.label);

      if (!checklistItemId) {
        throw new Error(`Item de checklist nao encontrado: ${item.label}`);
      }

      return checklistItemId;
    });

    let evaluationsCount = 0;

    for (const [dateIndex, evaluationDate] of evaluationDates.entries()) {
      for (const [employeeIndex, employee] of testEmployees.entries()) {
        const employeeId = employeeIdsByRegistration.get(employee.registration);
        const evaluatorId = userIdsByEmail.get(employee.managerEmail);

        if (!employeeId) {
          throw new Error(`Funcionario nao encontrado: ${employee.registration}`);
        }

        if (!evaluatorId) {
          throw new Error(`Gestor nao encontrado: ${employee.managerEmail}`);
        }

        const score = getSeedScore(employeeIndex, dateIndex);
        const note = evaluationNotes[(employeeIndex + dateIndex) % evaluationNotes.length];
        const [evaluation] = await db
          .insert(evaluations)
          .values({
            employeeId,
            evaluatorId,
            evaluationDate,
            score,
            note,
          })
          .onConflictDoUpdate({
            target: [evaluations.employeeId, evaluations.evaluationDate],
            set: {
              evaluatorId,
              score,
              note,
              updatedAt: new Date(),
            },
          })
          .returning({ id: evaluations.id });

        if (!evaluation) {
          throw new Error(
            `Nao foi possivel criar avaliacao: ${employee.registration} em ${evaluationDate}`,
          );
        }

        await db
          .delete(evaluationChecklistResults)
          .where(eq(evaluationChecklistResults.evaluationId, evaluation.id));

        await db.insert(evaluationChecklistResults).values(
          checklistItemIds.map((checklistItemId, itemIndex) => ({
            evaluationId: evaluation.id,
            checklistItemId,
            checked: getChecklistChecked(employeeIndex, dateIndex, itemIndex),
          })),
        );

        evaluationsCount += 1;
      }
    }

    const seededDepartments = new Set(testEmployees.map((employee) => employee.department));

    console.log(`  ${evaluationsCount} avaliacoes em ${evaluationDates.length} datas`);

    console.log('\nConcluido');
    console.log(`   Usuarios do sistema: ${usersToSeed.length}`);
    console.log(
      `   Funcionarios:        ${testEmployees.length} em ${seededDepartments.size} setores`,
    );
    console.log(`   Avaliacoes:          ${evaluationsCount} em ${evaluationDates.length} datas`);
    console.log(`   Senha padrao:        ${DEFAULT_PASSWORD}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
