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

// ─── Usuários do sistema (RH + gestores) ─────────────────────────────────────

const testUsers: Array<{ name: string; email: string; role: UserRole; department?: string }> = [
  { name: 'Mariana Costa', email: 'rh@empresa.com', role: 'RH' },

  // Gestores — um por departamento
  { name: 'Carlos Almeida', email: 'gestor.producao@empresa.com', role: 'GESTOR', department: 'Montagem/Solda' },
  { name: 'Fernanda Lima', email: 'gestor.qualidade@empresa.com', role: 'GESTOR', department: 'Qualidade' },
  { name: 'Roberto Souza', email: 'gestor.logistica@empresa.com', role: 'GESTOR', department: 'Logistica' },
  { name: 'Patricia Moreira', email: 'gestor.manutencao@empresa.com', role: 'GESTOR', department: 'Manutenção' },
  { name: 'Gustavo Ferreira', email: 'gestor.administrativo@empresa.com', role: 'GESTOR', department: 'Administrativo' },
];

// ─── Itens do checklist ───────────────────────────────────────────────────────

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

// ─── Funcionários ─────────────────────────────────────────────────────────────

type EmployeeSeed = {
  name: string;
  email: string;
  registration: string;
  position: string;
  department: string;
  turno: Turno;
  managerEmail: string;
};

const testEmployees: EmployeeSeed[] = [
  // ── Produção (gestor: Carlos Almeida) ──────────────────────────────────────
  {
    name: 'Joao Pereira',
    email: 'joao.pereira@empresa.com',
    registration: 'PROD-001',
    position: 'Operador de Producao',
    department: 'Montagem/Solda',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.producao@empresa.com',
  },
  {
    name: 'Ana Souza',
    email: 'ana.souza@empresa.com',
    registration: 'PROD-002',
    position: 'Auxiliar de Producao',
    department: 'Montagem/Solda',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.producao@empresa.com',
  },
  {
    name: 'Bruno Santos',
    email: 'bruno.santos@empresa.com',
    registration: 'PROD-003',
    position: 'Preparador de Linha',
    department: 'Montagem/Solda',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.producao@empresa.com',
  },
  {
    name: 'Leticia Andrade',
    email: 'leticia.andrade@empresa.com',
    registration: 'PROD-004',
    position: 'Auxiliar de Producao',
    department: 'Montagem/Solda',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.producao@empresa.com',
  },
  {
    name: 'Marcos Oliveira',
    email: 'marcos.oliveira@empresa.com',
    registration: 'PROD-005',
    position: 'Operador de Maquina',
    department: 'Montagem/Solda',
    turno: 'TERCEIRO',
    managerEmail: 'gestor.producao@empresa.com',
  },
  {
    name: 'Simone Barbosa',
    email: 'simone.barbosa@empresa.com',
    registration: 'PROD-006',
    position: 'Operadora de Maquina',
    department: 'Montagem/Solda',
    turno: 'TERCEIRO',
    managerEmail: 'gestor.producao@empresa.com',
  },

  // ── Qualidade (gestor: Fernanda Lima) ──────────────────────────────────────
  {
    name: 'Camila Rocha',
    email: 'camila.rocha@empresa.com',
    registration: 'QUAL-001',
    position: 'Inspetora de Qualidade',
    department: 'Qualidade',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.qualidade@empresa.com',
  },
  {
    name: 'Diego Nunes',
    email: 'diego.nunes@empresa.com',
    registration: 'QUAL-002',
    position: 'Analista de Qualidade',
    department: 'Qualidade',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.qualidade@empresa.com',
  },
  {
    name: 'Tatiane Correia',
    email: 'tatiane.correia@empresa.com',
    registration: 'QUAL-003',
    position: 'Tecnica de Qualidade',
    department: 'Qualidade',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.qualidade@empresa.com',
  },
  {
    name: 'Felipe Cardoso',
    email: 'felipe.cardoso@empresa.com',
    registration: 'QUAL-004',
    position: 'Inspetor de Qualidade',
    department: 'Qualidade',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.qualidade@empresa.com',
  },
  {
    name: 'Vanessa Ramos',
    email: 'vanessa.ramos@empresa.com',
    registration: 'QUAL-005',
    position: 'Analista de Qualidade Sr.',
    department: 'Qualidade',
    turno: 'TERCEIRO',
    managerEmail: 'gestor.qualidade@empresa.com',
  },

  // ── Logística (gestor: Roberto Souza) ──────────────────────────────────────
  {
    name: 'Ricardo Teixeira',
    email: 'ricardo.teixeira@empresa.com',
    registration: 'LOG-001',
    position: 'Operador de Logistica',
    department: 'Logistica',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.logistica@empresa.com',
  },
  {
    name: 'Claudia Pinto',
    email: 'claudia.pinto@empresa.com',
    registration: 'LOG-002',
    position: 'Auxiliar de Expedicao',
    department: 'Logistica',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.logistica@empresa.com',
  },
  {
    name: 'Eduardo Gomes',
    email: 'eduardo.gomes@empresa.com',
    registration: 'LOG-003',
    position: 'Motorista de Entrega',
    department: 'Logistica',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.logistica@empresa.com',
  },
  {
    name: 'Aline Mendes',
    email: 'aline.mendes@empresa.com',
    registration: 'LOG-004',
    position: 'Separadora de Pedidos',
    department: 'Logistica',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.logistica@empresa.com',
  },
  {
    name: 'Thiago Carvalho',
    email: 'thiago.carvalho@empresa.com',
    registration: 'LOG-005',
    position: 'Conferente de Estoque',
    department: 'Logistica',
    turno: 'TERCEIRO',
    managerEmail: 'gestor.logistica@empresa.com',
  },
  {
    name: 'Renata Dias',
    email: 'renata.dias@empresa.com',
    registration: 'LOG-006',
    position: 'Auxiliar de Logistica',
    department: 'Logistica',
    turno: 'TERCEIRO',
    managerEmail: 'gestor.logistica@empresa.com',
  },

  // ── Manutenção (gestor: Patricia Moreira) ──────────────────────────────────
  {
    name: 'Sergio Lopes',
    email: 'sergio.lopes@empresa.com',
    registration: 'MAN-001',
    position: 'Tecnico de Manutencao',
    department: 'Manutenção',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.manutencao@empresa.com',
  },
  {
    name: 'Fabio Nascimento',
    email: 'fabio.nascimento@empresa.com',
    registration: 'MAN-002',
    position: 'Eletricista Industrial',
    department: 'Manutenção',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.manutencao@empresa.com',
  },
  {
    name: 'Juliana Melo',
    email: 'juliana.melo@empresa.com',
    registration: 'MAN-003',
    position: 'Tecnica de Instrumentacao',
    department: 'Manutenção',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.manutencao@empresa.com',
  },
  {
    name: 'Rafael Vieira',
    email: 'rafael.vieira@empresa.com',
    registration: 'MAN-004',
    position: 'Mecanico Industrial',
    department: 'Manutenção',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.manutencao@empresa.com',
  },
  {
    name: 'Anderson Freitas',
    email: 'anderson.freitas@empresa.com',
    registration: 'MAN-005',
    position: 'Tecnico de Manutencao',
    department: 'Manutenção',
    turno: 'TERCEIRO',
    managerEmail: 'gestor.manutencao@empresa.com',
  },

  // ── Administrativo (gestor: Gustavo Ferreira) ──────────────────────────────
  {
    name: 'Elisa Martins',
    email: 'elisa.martins@empresa.com',
    registration: 'ADM-001',
    position: 'Assistente de RH',
    department: 'Administrativo',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.administrativo@empresa.com',
  },
  {
    name: 'Priscila Araújo',
    email: 'priscila.araujo@empresa.com',
    registration: 'ADM-002',
    position: 'Assistente Financeiro',
    department: 'Administrativo',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.administrativo@empresa.com',
  },
  {
    name: 'Leonardo Batista',
    email: 'leonardo.batista@empresa.com',
    registration: 'ADM-003',
    position: 'Analista de TI',
    department: 'Administrativo',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.administrativo@empresa.com',
  },
  {
    name: 'Natalia Cunha',
    email: 'natalia.cunha@empresa.com',
    registration: 'ADM-004',
    position: 'Recepcionista',
    department: 'Administrativo',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.administrativo@empresa.com',
  },
  {
    name: 'Alexandre Torres',
    email: 'alexandre.torres@empresa.com',
    registration: 'ADM-005',
    position: 'Assistente Administrativo',
    department: 'Administrativo',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.administrativo@empresa.com',
  },
  {
    name: 'Helena Barros',
    email: 'helena.barros@empresa.com',
    registration: 'PROD-007',
    position: 'Operadora de Embalagem',
    department: 'Montagem/Solda',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.producao@empresa.com',
  },
  {
    name: 'Paulo Henrique',
    email: 'paulo.henrique@empresa.com',
    registration: 'PROD-008',
    position: 'Abastecedor de Linha',
    department: 'Montagem/Solda',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.producao@empresa.com',
  },
  {
    name: 'Monica Farias',
    email: 'monica.farias@empresa.com',
    registration: 'PROD-009',
    position: 'Operadora de Maquina',
    department: 'Montagem/Solda',
    turno: 'TERCEIRO',
    managerEmail: 'gestor.producao@empresa.com',
  },
  {
    name: 'Igor Martins',
    email: 'igor.martins@empresa.com',
    registration: 'QUAL-006',
    position: 'Assistente de Qualidade',
    department: 'Qualidade',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.qualidade@empresa.com',
  },
  {
    name: 'Larissa Prado',
    email: 'larissa.prado@empresa.com',
    registration: 'QUAL-007',
    position: 'Analista de Laboratorio',
    department: 'Qualidade',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.qualidade@empresa.com',
  },
  {
    name: 'Renan Castro',
    email: 'renan.castro@empresa.com',
    registration: 'QUAL-008',
    position: 'Inspetor de Qualidade',
    department: 'Qualidade',
    turno: 'TERCEIRO',
    managerEmail: 'gestor.qualidade@empresa.com',
  },
  {
    name: 'Beatriz Lopes',
    email: 'beatriz.lopes@empresa.com',
    registration: 'LOG-007',
    position: 'Conferente de Carga',
    department: 'Logistica',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.logistica@empresa.com',
  },
  {
    name: 'Marcelo Alves',
    email: 'marcelo.alves@empresa.com',
    registration: 'LOG-008',
    position: 'Operador de Empilhadeira',
    department: 'Logistica',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.logistica@empresa.com',
  },
  {
    name: 'Elaine Ribeiro',
    email: 'elaine.ribeiro@empresa.com',
    registration: 'LOG-009',
    position: 'Auxiliar de Armazem',
    department: 'Logistica',
    turno: 'TERCEIRO',
    managerEmail: 'gestor.logistica@empresa.com',
  },
  {
    name: 'Vitor Campos',
    email: 'vitor.campos@empresa.com',
    registration: 'MAN-006',
    position: 'Auxiliar de Manutencao',
    department: 'Manutenção',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.manutencao@empresa.com',
  },
  {
    name: 'Carolina Pires',
    email: 'carolina.pires@empresa.com',
    registration: 'MAN-007',
    position: 'Planejadora de Manutencao',
    department: 'Manutenção',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.manutencao@empresa.com',
  },
  {
    name: 'Daniel Moraes',
    email: 'daniel.moraes@empresa.com',
    registration: 'MAN-008',
    position: 'Mecanico Industrial',
    department: 'Manutenção',
    turno: 'TERCEIRO',
    managerEmail: 'gestor.manutencao@empresa.com',
  },
  {
    name: 'Marina Sales',
    email: 'marina.sales@empresa.com',
    registration: 'ADM-006',
    position: 'Analista Financeira',
    department: 'Administrativo',
    turno: 'PRIMEIRO',
    managerEmail: 'gestor.administrativo@empresa.com',
  },
  {
    name: 'Otavio Reis',
    email: 'otavio.reis@empresa.com',
    registration: 'ADM-007',
    position: 'Assistente de Compras',
    department: 'Administrativo',
    turno: 'SEGUNDO',
    managerEmail: 'gestor.administrativo@empresa.com',
  },
  {
    name: 'Sabrina Duarte',
    email: 'sabrina.duarte@empresa.com',
    registration: 'ADM-008',
    position: 'Analista de Suporte',
    department: 'Administrativo',
    turno: 'TERCEIRO',
    managerEmail: 'gestor.administrativo@empresa.com',
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

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
            },
          ]
        : []),
      ...testUsers.map((user) => ({ ...user, passwordHash: testPasswordHash })),
    ];

    console.log('\n── Usuarios ──────────────────────────────────────────');
    for (const user of usersToSeed) {
      await db
        .insert(users)
        .values({ name: user.name, email: user.email, passwordHash: user.passwordHash, role: user.role, department: user.department ?? null, active: true })
        .onConflictDoUpdate({
          target: users.email,
          set: { name: user.name, passwordHash: user.passwordHash, role: user.role, department: user.department ?? null, active: true, updatedAt: new Date() },
        });
      console.log(`  [${user.role.padEnd(6)}] ${user.name} <${user.email}>`);
    }

    console.log('\n── Checklist ─────────────────────────────────────────');
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
    const userIdsByEmail = new Map(seededUsers.map((u) => [u.email, u.id]));

    console.log('\n── Funcionarios ──────────────────────────────────────');
    const departments = new Set(testEmployees.map((e) => e.department));
    for (const dept of departments) {
      const deptEmployees = testEmployees.filter((e) => e.department === dept);
      console.log(`\n  ${dept} (${deptEmployees.length} funcionarios)`);

      for (const employee of deptEmployees) {
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

        console.log(`    [${employee.turno.padEnd(8)}] ${employee.registration} — ${employee.name}`);
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

    console.log(`  ${evaluationsCount} avaliacoes em ${evaluationDates.length} datas`);

    console.log('\nConcluido');
    console.log(`   Usuarios:     ${usersToSeed.length}`);
    console.log(`   Funcionarios: ${testEmployees.length} em ${departments.size} departamentos`);
    console.log(`   Avaliacoes:   ${evaluationsCount} em ${evaluationDates.length} datas`);
    console.log(`   Senha padrao: ${DEFAULT_PASSWORD}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
