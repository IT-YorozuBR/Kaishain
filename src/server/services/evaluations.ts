import { and, asc, eq, inArray } from 'drizzle-orm';

import type { CurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import {
  checklistItems,
  employees,
  evaluationChecklistResults,
  evaluations,
} from '@/lib/db/schema';
import { NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { canEvaluate } from '@/lib/permissions/evaluation';
import type { CreateEvaluationInput } from '@/lib/validators/evaluation';

export type TeamEmployee = typeof employees.$inferSelect;

export async function getMyTeam(userId: string) {
  const db = getDb();

  return db.query.employees.findMany({
    where: and(eq(employees.managerId, userId), eq(employees.active, true)),
    orderBy: [asc(employees.name)],
  });
}

export async function getEmployeesForEvaluation(user: CurrentUser) {
  if (user.role === 'ADMIN') {
    const db = getDb();
    return db.query.employees.findMany({
      where: eq(employees.active, true),
      orderBy: [asc(employees.name)],
    });
  }

  // GESTOR vê apenas seus liderados diretos; RH não avalia
  return getMyTeam(user.id);
}

export async function getActiveChecklistItems() {
  const db = getDb();

  return db.query.checklistItems.findMany({
    where: eq(checklistItems.active, true),
    orderBy: [asc(checklistItems.order), asc(checklistItems.label)],
  });
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
    throw new NotFoundError('Funcionario nao encontrado.');
  }

  if (!canEvaluate(user, employee)) {
    throw new UnauthorizedError();
  }

  const [activeChecklistItems, todayEvaluation] = await Promise.all([
    getActiveChecklistItems(),
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

  const employee = await db.query.employees.findFirst({
    where: and(eq(employees.id, input.employeeId), eq(employees.active, true)),
  });

  if (!employee) {
    throw new NotFoundError('Funcionario nao encontrado.');
  }

  if (!canEvaluate(user, employee)) {
    throw new UnauthorizedError();
  }

  const activeChecklistItems = await getActiveChecklistItems();
  const activeChecklistItemIds = new Set(activeChecklistItems.map((item) => item.id));
  const submittedChecklistItemIds = new Set(
    input.checklistResults.map((result) => result.checklistItemId),
  );

  const hasInactiveItem = input.checklistResults.some(
    (result) => !activeChecklistItemIds.has(result.checklistItemId),
  );

  if (hasInactiveItem || submittedChecklistItemIds.size !== activeChecklistItems.length) {
    throw new ValidationError('Checklist incompleto ou com item invalido.');
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
      throw new Error('Nao foi possivel salvar a avaliacao.');
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
