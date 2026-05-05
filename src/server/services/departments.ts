import { and, asc, eq, ne, type SQL } from 'drizzle-orm';

import type { CurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { departments } from '@/lib/db/schema';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import type { CreateDepartmentInput, UpdateDepartmentInput } from '@/lib/validators/department';

export type Department = typeof departments.$inferSelect;

function requireRhOrAdmin(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError('Apenas RH e administradores podem gerenciar departamentos.');
  }
}

export async function listDepartments(activeOnly = false): Promise<Department[]> {
  const db = getDb();
  const where = activeOnly ? eq(departments.active, true) : undefined;

  return db.select().from(departments).where(where).orderBy(asc(departments.name));
}

export async function getDepartment(id: string): Promise<Department> {
  const db = getDb();
  const [department] = await db.select().from(departments).where(eq(departments.id, id));

  if (!department) {
    throw new NotFoundError('Departamento não encontrado.');
  }

  return department;
}

async function assertNameUnique(name: string, excludeId?: string) {
  const db = getDb();
  const conditions: SQL[] = [eq(departments.name, name)];

  if (excludeId) {
    conditions.push(ne(departments.id, excludeId));
  }

  const [existing] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(and(...conditions));

  if (existing) {
    throw new ConflictError('Já existe um departamento com este nome.');
  }
}

export async function createDepartment(
  user: CurrentUser,
  data: CreateDepartmentInput,
): Promise<Department> {
  requireRhOrAdmin(user);
  await assertNameUnique(data.name);

  const db = getDb();
  const [department] = await db.insert(departments).values(data).returning();

  if (!department) {
    throw new Error('Não foi possível criar o departamento.');
  }

  return department;
}

export async function updateDepartment(
  user: CurrentUser,
  id: string,
  data: UpdateDepartmentInput,
): Promise<Department> {
  requireRhOrAdmin(user);
  await getDepartment(id);
  await assertNameUnique(data.name, id);

  const db = getDb();
  const [department] = await db
    .update(departments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(departments.id, id))
    .returning();

  if (!department) {
    throw new Error('Não foi possível atualizar o departamento.');
  }

  return department;
}

export async function toggleDepartmentActive(user: CurrentUser, id: string): Promise<Department> {
  requireRhOrAdmin(user);
  const department = await getDepartment(id);

  const db = getDb();
  const [updated] = await db
    .update(departments)
    .set({ active: !department.active, updatedAt: new Date() })
    .where(eq(departments.id, id))
    .returning();

  if (!updated) {
    throw new Error('Não foi possível atualizar o departamento.');
  }

  return updated;
}
