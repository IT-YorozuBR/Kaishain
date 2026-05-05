import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import type { CurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { listChecklistItems } from '@/server/services/checklist';
import {
  checklistItems,
  departments,
  employees,
  evaluationChecklistResults,
  evaluations,
  users,
} from '@/lib/db/schema';
import { NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { canEvaluate } from '@/lib/permissions/evaluation';
import type { CreateEvaluationInput } from '@/lib/validators/evaluation';
import type { EmployeeEvaluationDashboardFilters } from '@/lib/validators/employee-evaluation-dashboard';
import type { EvaluationHistoryFilters } from '@/lib/validators/evaluation-history';

export type TeamEmployee = typeof employees.$inferSelect & { department: string | null };

export async function getMyTeam(userId: string) {
  const db = getDb();

  const rows = await db
    .select({
      employee: employees,
      department: {
        name: departments.name,
      },
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(eq(employees.managerId, userId), eq(employees.active, true)))
    .orderBy(asc(employees.name));

  return rows.map(({ employee, department }) => ({
    ...employee,
    department: department?.name ?? null,
  }));
}

export async function getEmployeesForEvaluation(user: CurrentUser) {
  if (user.role === 'ADMIN') {
    const db = getDb();
    const rows = await db
      .select({
        employee: employees,
        department: {
          name: departments.name,
        },
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(employees.active, true))
      .orderBy(asc(employees.name));

    return rows.map(({ employee, department }) => ({
      ...employee,
      department: department?.name ?? null,
    }));
  }

  // GESTOR vê apenas seus liderados diretos; RH não avalia
  return getMyTeam(user.id);
}

export async function getTodayEvaluation(employeeId: string, date: string) {
  const db = getDb();

  const evaluation = await db.query.evaluations.findFirst({
    where: and(eq(evaluations.employeeId, employeeId), eq(evaluations.evaluationDate, date)),
  });

  if (!evaluation) {
    return null;
  }

  const checklistResults = await db.query.evaluationChecklistResults.findMany({
    where: eq(evaluationChecklistResults.evaluationId, evaluation.id),
  });

  return {
    ...evaluation,
    checklistResults,
  };
}

export async function getEvaluationDashboard(user: CurrentUser, date: string) {
  const team = await getEmployeesForEvaluation(user);

  const todayEvaluations = await Promise.all(
    team.map(async (employee) => ({
      employee,
      evaluation: await getTodayEvaluation(employee.id, date),
    })),
  );

  return todayEvaluations;
}

export async function getEvaluationFormData(user: CurrentUser, employeeId: string, date: string) {
  const db = getDb();

  const employee = await db.query.employees.findFirst({
    where: and(eq(employees.id, employeeId), eq(employees.active, true)),
  });

  if (!employee) {
    throw new NotFoundError('Funcionário não encontrado.');
  }

  if (!canEvaluate(user, employee)) {
    throw new UnauthorizedError();
  }

  const [activeChecklistItems, todayEvaluation] = await Promise.all([
    listChecklistItems(true),
    getTodayEvaluation(employeeId, date),
  ]);

  return {
    employee,
    checklistItems: activeChecklistItems,
    evaluation: todayEvaluation,
  };
}

export async function upsertEvaluation(
  user: CurrentUser,
  input: CreateEvaluationInput,
  evaluationDate: string,
) {
  const db = getDb();

  const [employeeRow] = await db
    .select({
      employee: employees,
      department: {
        name: departments.name,
      },
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(eq(employees.id, input.employeeId), eq(employees.active, true)));

  if (!employeeRow) {
    throw new NotFoundError('Funcionário não encontrado.');
  }

  if (!canEvaluate(user, employeeRow.employee)) {
    throw new UnauthorizedError();
  }

  const activeChecklistItems = await listChecklistItems(true);
  const activeChecklistItemIds = new Set(activeChecklistItems.map((item) => item.id));
  const submittedChecklistItemIds = new Set(
    input.checklistResults.map((result) => result.checklistItemId),
  );

  const hasInactiveItem = input.checklistResults.some(
    (result) => !activeChecklistItemIds.has(result.checklistItemId),
  );

  if (hasInactiveItem || submittedChecklistItemIds.size !== activeChecklistItems.length) {
    throw new ValidationError('Checklist incompleto ou com item inválido.');
  }

  return db.transaction(async (tx) => {
    const [evaluation] = await tx
      .insert(evaluations)
      .values({
        employeeId: input.employeeId,
        evaluatorId: user.id,
        evaluationDate,
        score: input.score,
        note: input.note,
        employeeDepartment: employeeRow.department?.name ?? null,
      })
      .onConflictDoUpdate({
        target: [evaluations.employeeId, evaluations.evaluationDate],
        set: {
          evaluatorId: user.id,
          score: input.score,
          note: input.note,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!evaluation) {
      throw new Error('Não foi possível salvar a avaliação.');
    }

    await tx
      .delete(evaluationChecklistResults)
      .where(eq(evaluationChecklistResults.evaluationId, evaluation.id));

    if (input.checklistResults.length > 0) {
      await tx.insert(evaluationChecklistResults).values(
        input.checklistResults.map((result) => ({
          evaluationId: evaluation.id,
          checklistItemId: result.checklistItemId,
          checked: result.checked,
        })),
      );
    }

    return evaluation;
  });
}

export async function getEvaluationSummariesByEmployeeIds(employeeIds: string[], date: string) {
  const db = getDb();

  if (employeeIds.length === 0) {
    return [];
  }

  return db.query.evaluations.findMany({
    where: and(inArray(evaluations.employeeId, employeeIds), eq(evaluations.evaluationDate, date)),
  });
}

export type EvaluationHistoryItem = {
  id: string;
  evaluationDate: string;
  score: number;
  note: string | null;
  employee: {
    id: string;
    name: string;
    position: string | null;
    department: string | null;
  };
  evaluator: {
    id: string;
    name: string;
    email: string;
  };
};

export type EvaluationDetail = EvaluationHistoryItem & {
  checklistResults: {
    checklistItemId: string;
    label: string;
    description: string | null;
    order: number;
    checked: boolean;
  }[];
};

export async function listEvaluations(filters: EvaluationHistoryFilters) {
  const db = getDb();
  const page = Math.max(filters.page, 1);
  const pageSize = Math.min(Math.max(filters.pageSize, 1), 100);
  const offset = (page - 1) * pageSize;
  const conditions: SQL[] = [];

  if (filters.employeeId) {
    conditions.push(eq(evaluations.employeeId, filters.employeeId));
  }

  const employeeSearch = filters.employeeSearch?.trim();
  if (employeeSearch) {
    const term = `%${employeeSearch}%`;
    const searchCondition = or(
      ilike(employees.name, term),
      ilike(employees.email, term),
      ilike(employees.registration, term),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (filters.evaluatorId) {
    conditions.push(eq(evaluations.evaluatorId, filters.evaluatorId));
  }

  if (filters.dateFrom) {
    conditions.push(gte(evaluations.evaluationDate, filters.dateFrom));
  }

  if (filters.dateTo) {
    conditions.push(lte(evaluations.evaluationDate, filters.dateTo));
  }

  if (filters.departmentId) {
    conditions.push(
      sql`${evaluations.employeeDepartment} = (select "name" from "departments" where "id" = ${filters.departmentId})`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ value: count() })
    .from(evaluations)
    .innerJoin(employees, eq(evaluations.employeeId, employees.id))
    .where(where);

  const rows = await db
    .select({
      id: evaluations.id,
      evaluationDate: evaluations.evaluationDate,
      score: evaluations.score,
      note: evaluations.note,
      employee: {
        id: employees.id,
        name: employees.name,
        position: employees.position,
        department: evaluations.employeeDepartment,
      },
      evaluator: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(evaluations)
    .innerJoin(employees, eq(evaluations.employeeId, employees.id))
    .innerJoin(users, eq(evaluations.evaluatorId, users.id))
    .where(where)
    .orderBy(desc(evaluations.evaluationDate), asc(employees.name))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows,
    page,
    pageSize,
    total: totalRow?.value ?? 0,
    totalPages: Math.max(Math.ceil((totalRow?.value ?? 0) / pageSize), 1),
  };
}

export type ManagerDailyStatus = {
  manager: { id: string; name: string };
  total: number;
  done: number;
  pending: number;
  pct: number;
};

export type DailyEvaluationStatus = {
  date: string;
  totalEmployees: number;
  totalDone: number;
  totalPending: number;
  pct: number;
  managers: ManagerDailyStatus[];
};

export type ManagerDailyEvaluationDetails = {
  manager: { id: string; name: string; email: string };
  date: string;
  total: number;
  done: number;
  pending: number;
  pct: number;
  evaluated: {
    employee: {
      id: string;
      name: string;
      position: string | null;
      department: string | null;
    };
    evaluation: {
      id: string;
      score: number;
      note: string | null;
      createdAt: Date;
    };
  }[];
  pendingEmployees: {
    id: string;
    name: string;
    position: string | null;
    department: string | null;
  }[];
};

export async function getDailyEvaluationStatus(date: string): Promise<DailyEvaluationStatus> {
  const db = getDb();

  const rows = await db
    .select({ id: employees.id, managerId: employees.managerId, managerName: users.name })
    .from(employees)
    .leftJoin(users, eq(employees.managerId, users.id))
    .where(eq(employees.active, true));

  const withManager = rows.filter(
    (r): r is typeof r & { managerId: string; managerName: string } =>
      r.managerId !== null && r.managerName !== null,
  );

  const employeeIds = withManager.map((r) => r.id);

  const doneToday =
    employeeIds.length > 0
      ? await db
          .select({ employeeId: evaluations.employeeId })
          .from(evaluations)
          .where(
            and(inArray(evaluations.employeeId, employeeIds), eq(evaluations.evaluationDate, date)),
          )
      : [];

  const evaluatedSet = new Set(doneToday.map((e) => e.employeeId));

  const managerMap = new Map<string, ManagerDailyStatus>();
  for (const row of withManager) {
    if (!managerMap.has(row.managerId)) {
      managerMap.set(row.managerId, {
        manager: { id: row.managerId, name: row.managerName },
        total: 0,
        done: 0,
        pending: 0,
        pct: 0,
      });
    }
    const entry = managerMap.get(row.managerId)!;
    entry.total++;
    if (evaluatedSet.has(row.id)) {
      entry.done++;
    } else {
      entry.pending++;
    }
  }

  for (const entry of managerMap.values()) {
    entry.pct = entry.total > 0 ? Math.round((entry.done / entry.total) * 100) : 0;
  }

  const managers = [...managerMap.values()].sort((a, b) => {
    if (b.pct !== a.pct) return b.pct - a.pct;
    return a.manager.name.localeCompare(b.manager.name);
  });

  const totalDone = doneToday.length;
  const totalEmployees = withManager.length;

  return {
    date,
    totalEmployees,
    totalDone,
    totalPending: totalEmployees - totalDone,
    pct: totalEmployees > 0 ? Math.round((totalDone / totalEmployees) * 100) : 0,
    managers,
  };
}

export async function getManagerDailyEvaluationDetails(
  user: CurrentUser,
  managerId: string,
  date: string,
): Promise<ManagerDailyEvaluationDetails> {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError();
  }

  const db = getDb();

  const manager = await db.query.users.findFirst({
    where: and(eq(users.id, managerId), eq(users.role, 'GESTOR'), eq(users.active, true)),
    columns: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!manager) {
    throw new NotFoundError('Gestor não encontrado.');
  }

  const team = await db
    .select({
      id: employees.id,
      name: employees.name,
      position: employees.position,
      department: departments.name,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(eq(employees.managerId, managerId), eq(employees.active, true)))
    .orderBy(asc(employees.name));

  const employeeIds = team.map((employee) => employee.id);

  const evaluationRows =
    employeeIds.length > 0
      ? await db
          .select({
            id: evaluations.id,
            employeeId: evaluations.employeeId,
            score: evaluations.score,
            note: evaluations.note,
            createdAt: evaluations.createdAt,
          })
          .from(evaluations)
          .where(
            and(inArray(evaluations.employeeId, employeeIds), eq(evaluations.evaluationDate, date)),
          )
      : [];

  const evaluationsByEmployeeId = new Map(
    evaluationRows.map((evaluation) => [evaluation.employeeId, evaluation]),
  );

  const evaluated: ManagerDailyEvaluationDetails['evaluated'] = [];
  const pendingEmployees: ManagerDailyEvaluationDetails['pendingEmployees'] = [];

  for (const employee of team) {
    const evaluation = evaluationsByEmployeeId.get(employee.id);

    if (evaluation) {
      evaluated.push({
        employee,
        evaluation: {
          id: evaluation.id,
          score: evaluation.score,
          note: evaluation.note,
          createdAt: evaluation.createdAt,
        },
      });
    } else {
      pendingEmployees.push(employee);
    }
  }

  const total = team.length;
  const done = evaluated.length;

  return {
    manager,
    date,
    total,
    done,
    pending: pendingEmployees.length,
    pct: total > 0 ? Math.round((done / total) * 100) : 0,
    evaluated,
    pendingEmployees,
  };
}

export type EmployeeEvaluationDashboard = {
  employee: {
    id: string;
    name: string;
    email: string | null;
    registration: string | null;
    position: string | null;
    department: string | null;
    active: boolean;
    manager: { id: string; name: string; email: string } | null;
  };
  metrics: {
    totalEvaluations: number;
    averageScore: number | null;
    highestScore: number | null;
    lowestScore: number | null;
    lastEvaluation: {
      id: string;
      evaluationDate: string;
      score: number;
      evaluatorName: string;
    } | null;
    scoreBuckets: {
      critical: number;
      attention: number;
      good: number;
      excellent: number;
    };
  };
  checklistStats: {
    checklistItemId: string;
    label: string;
    total: number;
    checked: number;
    unchecked: number;
    pct: number;
  }[];
  history: {
    items: {
      id: string;
      evaluationDate: string;
      score: number;
      note: string | null;
      evaluator: {
        id: string;
        name: string;
        email: string;
      };
    }[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function requireRhOrAdmin(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError();
  }
}

function getScoreBucket(
  score: number,
): keyof EmployeeEvaluationDashboard['metrics']['scoreBuckets'] {
  if (score <= 4) return 'critical';
  if (score <= 6) return 'attention';
  if (score <= 8) return 'good';
  return 'excellent';
}

export async function getEmployeeEvaluationDashboard(
  user: CurrentUser,
  employeeId: string,
  filters: EmployeeEvaluationDashboardFilters,
): Promise<EmployeeEvaluationDashboard> {
  requireRhOrAdmin(user);

  const db = getDb();
  const pageSize = Math.min(Math.max(filters.pageSize, 1), 100);

  const [employeeRow] = await db
    .select({
      employee: employees,
      department: {
        name: departments.name,
      },
      manager: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(employees)
    .leftJoin(users, eq(employees.managerId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(employees.id, employeeId));

  if (!employeeRow) {
    throw new NotFoundError('Funcionário não encontrado.');
  }

  const conditions: SQL[] = [eq(evaluations.employeeId, employeeId)];

  if (filters.dateFrom) {
    conditions.push(gte(evaluations.evaluationDate, filters.dateFrom));
  }

  if (filters.dateTo) {
    conditions.push(lte(evaluations.evaluationDate, filters.dateTo));
  }

  const where = and(...conditions);

  const allRows = await db
    .select({
      id: evaluations.id,
      evaluationDate: evaluations.evaluationDate,
      score: evaluations.score,
      note: evaluations.note,
      evaluator: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(evaluations)
    .innerJoin(users, eq(evaluations.evaluatorId, users.id))
    .where(where)
    .orderBy(desc(evaluations.evaluationDate));

  const totalEvaluations = allRows.length;
  const totalPages = Math.max(Math.ceil(totalEvaluations / pageSize), 1);
  const page = Math.min(Math.max(filters.page, 1), totalPages);
  const offset = (page - 1) * pageSize;
  const totalScore = allRows.reduce((sum, row) => sum + row.score, 0);
  const averageScore =
    totalEvaluations > 0 ? Math.round((totalScore / totalEvaluations) * 10) / 10 : null;
  const highestScore = totalEvaluations > 0 ? Math.max(...allRows.map((row) => row.score)) : null;
  const lowestScore = totalEvaluations > 0 ? Math.min(...allRows.map((row) => row.score)) : null;
  const lastEvaluation = allRows[0]
    ? {
        id: allRows[0].id,
        evaluationDate: allRows[0].evaluationDate,
        score: allRows[0].score,
        evaluatorName: allRows[0].evaluator.name,
      }
    : null;
  const scoreBuckets = {
    critical: 0,
    attention: 0,
    good: 0,
    excellent: 0,
  };

  for (const row of allRows) {
    scoreBuckets[getScoreBucket(row.score)] += 1;
  }

  const evaluationIds = allRows.map((row) => row.id);
  const checklistStatsMap = new Map<
    string,
    {
      checklistItemId: string;
      label: string;
      order: number;
      total: number;
      checked: number;
      unchecked: number;
      pct: number;
    }
  >();

  if (evaluationIds.length > 0) {
    const checklistRows = await db
      .select({
        checklistItemId: checklistItems.id,
        label: checklistItems.label,
        order: checklistItems.order,
        checked: evaluationChecklistResults.checked,
      })
      .from(evaluationChecklistResults)
      .innerJoin(checklistItems, eq(evaluationChecklistResults.checklistItemId, checklistItems.id))
      .where(inArray(evaluationChecklistResults.evaluationId, evaluationIds));

    for (const row of checklistRows) {
      if (!checklistStatsMap.has(row.checklistItemId)) {
        checklistStatsMap.set(row.checklistItemId, {
          checklistItemId: row.checklistItemId,
          label: row.label,
          order: row.order,
          total: 0,
          checked: 0,
          unchecked: 0,
          pct: 0,
        });
      }

      const stat = checklistStatsMap.get(row.checklistItemId)!;
      stat.total += 1;
      if (row.checked) {
        stat.checked += 1;
      } else {
        stat.unchecked += 1;
      }
    }
  }

  const checklistStats = [...checklistStatsMap.values()]
    .map((stat) => ({
      checklistItemId: stat.checklistItemId,
      label: stat.label,
      total: stat.total,
      checked: stat.checked,
      unchecked: stat.unchecked,
      pct: stat.total > 0 ? Math.round((stat.checked / stat.total) * 100) : 0,
      order: stat.order,
    }))
    .sort((a, b) => {
      if (a.pct !== b.pct) return a.pct - b.pct;
      return a.order - b.order;
    })
    .map((stat) => ({
      checklistItemId: stat.checklistItemId,
      label: stat.label,
      total: stat.total,
      checked: stat.checked,
      unchecked: stat.unchecked,
      pct: stat.pct,
    }));

  const historyItems = allRows.slice(offset, offset + pageSize).map((row) => ({
    id: row.id,
    evaluationDate: row.evaluationDate,
    score: row.score,
    note: row.note,
    evaluator: row.evaluator,
  }));

  return {
    employee: {
      ...employeeRow.employee,
      department: employeeRow.department?.name ?? null,
      manager: employeeRow.manager?.id
        ? {
            id: employeeRow.manager.id,
            name: employeeRow.manager.name,
            email: employeeRow.manager.email,
          }
        : null,
    },
    metrics: {
      totalEvaluations,
      averageScore,
      highestScore,
      lowestScore,
      lastEvaluation,
      scoreBuckets,
    },
    checklistStats,
    history: {
      items: historyItems,
      page,
      pageSize,
      total: totalEvaluations,
      totalPages,
    },
  };
}

export type ExportFilters = {
  evaluatorId?: string;
  employeeSearch?: string;
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
};

export async function listEvaluationsForExport(filters: ExportFilters) {
  const db = getDb();
  const conditions: SQL[] = [];

  if (filters.evaluatorId) conditions.push(eq(evaluations.evaluatorId, filters.evaluatorId));
  const employeeSearch = filters.employeeSearch?.trim();
  if (employeeSearch) {
    const term = `%${employeeSearch}%`;
    const searchCondition = or(
      ilike(employees.name, term),
      ilike(employees.email, term),
      ilike(employees.registration, term),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (filters.dateFrom) conditions.push(gte(evaluations.evaluationDate, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(evaluations.evaluationDate, filters.dateTo));
  if (filters.departmentId) {
    conditions.push(
      sql`${evaluations.employeeDepartment} = (select "name" from "departments" where "id" = ${filters.departmentId})`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      evaluationDate: evaluations.evaluationDate,
      score: evaluations.score,
      note: evaluations.note,
      employee: {
        name: employees.name,
        position: employees.position,
        department: evaluations.employeeDepartment,
      },
      evaluator: { name: users.name },
    })
    .from(evaluations)
    .innerJoin(employees, eq(evaluations.employeeId, employees.id))
    .innerJoin(users, eq(evaluations.evaluatorId, users.id))
    .where(where)
    .orderBy(asc(evaluations.evaluationDate), asc(employees.name));
}

export async function getEvaluationDetail(user: CurrentUser, evaluationId: string) {
  const db = getDb();

  const [row] = await db
    .select({
      id: evaluations.id,
      evaluationDate: evaluations.evaluationDate,
      score: evaluations.score,
      note: evaluations.note,
      evaluatorId: evaluations.evaluatorId,
      employee: {
        id: employees.id,
        name: employees.name,
        position: employees.position,
        department: evaluations.employeeDepartment,
      },
      evaluator: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(evaluations)
    .innerJoin(employees, eq(evaluations.employeeId, employees.id))
    .innerJoin(users, eq(evaluations.evaluatorId, users.id))
    .where(eq(evaluations.id, evaluationId));

  if (!row) {
    throw new NotFoundError('Avaliação não encontrada.');
  }

  if (user.role === 'GESTOR' && row.evaluatorId !== user.id) {
    throw new UnauthorizedError('Você não pode acessar avaliações de outro gestor.');
  }

  if (user.role !== 'GESTOR' && user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError();
  }

  const checklistResults = await db
    .select({
      checklistItemId: checklistItems.id,
      label: checklistItems.label,
      description: checklistItems.description,
      order: checklistItems.order,
      checked: evaluationChecklistResults.checked,
    })
    .from(evaluationChecklistResults)
    .innerJoin(checklistItems, eq(evaluationChecklistResults.checklistItemId, checklistItems.id))
    .where(eq(evaluationChecklistResults.evaluationId, evaluationId))
    .orderBy(asc(checklistItems.order), asc(checklistItems.label));

  return {
    id: row.id,
    evaluationDate: row.evaluationDate,
    score: row.score,
    note: row.note,
    employee: row.employee,
    evaluator: row.evaluator,
    checklistResults,
  };
}
