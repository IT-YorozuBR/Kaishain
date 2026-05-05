import { and, asc, count, eq, ilike, ne, or, type SQL } from 'drizzle-orm';

import type { CurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { departments, employees, users } from '@/lib/db/schema';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/validators/employee';

function requireRhOrAdmin(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError('Apenas RH e administradores podem gerenciar funcionários.');
  }
}

export type EmployeeWithManager = typeof employees.$inferSelect & {
  department: string | null;
  manager: Pick<typeof users.$inferSelect, 'id' | 'name'> | null;
};

export type Manager = Pick<typeof users.$inferSelect, 'id' | 'name' | 'email' | 'department'>;

export type ListEmployeesFilters = {
  search?: string;
  managerId?: string;
  departmentId?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
};

export type ListEmployeesResult = {
  rows: EmployeeWithManager[];
  total: number;
};

function buildEmployeeConditions(filters: ListEmployeesFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.active !== undefined) {
    conditions.push(eq(employees.active, filters.active));
  }

  if (filters.managerId) {
    conditions.push(eq(employees.managerId, filters.managerId));
  }

  if (filters.departmentId) {
    conditions.push(eq(employees.departmentId, filters.departmentId));
  }

  const search = filters.search?.trim();
  if (search) {
    const term = `%${search}%`;
    const searchCondition = or(ilike(employees.name, term), ilike(employees.email, term));
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return conditions;
}

export async function listEmployees(
  filters: ListEmployeesFilters = {},
): Promise<ListEmployeesResult> {
  const db = getDb();
  const conditions = buildEmployeeConditions(filters);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ total: count() })
    .from(employees)
    .where(whereClause);

  const total = countResult?.total ?? 0;

  const baseQuery = db
    .select({
      employee: employees,
      manager: {
        id: users.id,
        name: users.name,
      },
      department: {
        name: departments.name,
      },
    })
    .from(employees)
    .leftJoin(users, eq(employees.managerId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(whereClause)
    .orderBy(asc(employees.name));

  const rawRows = await (filters.limit !== undefined
    ? baseQuery.limit(filters.limit).offset(filters.offset ?? 0)
    : baseQuery);

  const rows = rawRows.map(({ employee, manager, department }) => ({
    ...employee,
    department: department?.name ?? null,
    manager: manager?.id ? { id: manager.id, name: manager.name } : null,
  }));

  return { rows, total };
}

export async function getEmployee(id: string): Promise<EmployeeWithManager> {
  const db = getDb();

  const [row] = await db
    .select({
      employee: employees,
      manager: {
        id: users.id,
        name: users.name,
      },
      department: {
        name: departments.name,
      },
    })
    .from(employees)
    .leftJoin(users, eq(employees.managerId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(employees.id, id));

  if (!row) {
    throw new NotFoundError('Funcionário não encontrado.');
  }

  return {
    ...row.employee,
    department: row.department?.name ?? null,
    manager: row.manager?.id ? { id: row.manager.id, name: row.manager.name } : null,
  };
}

export async function listManagers(): Promise<Manager[]> {
  const db = getDb();

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      department: users.department,
    })
    .from(users)
    .where(and(eq(users.role, 'GESTOR'), eq(users.active, true)))
    .orderBy(asc(users.name));
}

export async function listEvaluationEmployeesForUser(user: CurrentUser) {
  if (user.role === 'GESTOR') {
    return getDb()
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(eq(employees.managerId, user.id))
      .orderBy(asc(employees.name));
  }

  if (user.role === 'RH' || user.role === 'ADMIN') {
    return getDb()
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .orderBy(asc(employees.name));
  }

  throw new UnauthorizedError();
}

export async function listEvaluationManagersForUser(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError();
  }

  return listManagers();
}

async function assertDepartmentExists(departmentId: string | null) {
  if (!departmentId) {
    return;
  }

  const db = getDb();
  const [department] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(and(eq(departments.id, departmentId), eq(departments.active, true)));

  if (!department) {
    throw new ValidationError('Departamento inválido ou inativo.');
  }
}

async function assertManagerCanBeAssigned(managerId: string | null) {
  if (!managerId) {
    return;
  }

  const db = getDb();
  const [manager] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, managerId), eq(users.role, 'GESTOR'), eq(users.active, true)));

  if (!manager) {
    throw new ValidationError('Gestor inválido ou inativo.');
  }
}

async function assertEmailUnique(email: string, excludeId?: string) {
  const db = getDb();
  const conditions: SQL[] = [eq(employees.email, email)];

  if (excludeId) {
    conditions.push(ne(employees.id, excludeId));
  }

  const [existing] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(...conditions));

  if (existing) {
    throw new ConflictError('Já existe um funcionário com este e-mail.');
  }
}

async function assertRegistrationUnique(registration: string, excludeId?: string) {
  const db = getDb();
  const conditions: SQL[] = [eq(employees.registration, registration)];

  if (excludeId) {
    conditions.push(ne(employees.id, excludeId));
  }

  const [existing] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(...conditions));

  if (existing) {
    throw new ConflictError('Já existe um funcionário com esta matrícula.');
  }
}

export async function createEmployee(user: CurrentUser, data: CreateEmployeeInput) {
  requireRhOrAdmin(user);
  await assertDepartmentExists(data.departmentId);
  await assertManagerCanBeAssigned(data.managerId);

  if (data.email) {
    await assertEmailUnique(data.email);
  }

  if (data.registration) {
    await assertRegistrationUnique(data.registration);
  }

  const db = getDb();
  const [employee] = await db.insert(employees).values(data).returning();

  if (!employee) {
    throw new Error('Não foi possível criar o funcionário.');
  }

  return employee;
}

export async function updateEmployee(user: CurrentUser, id: string, data: UpdateEmployeeInput) {
  requireRhOrAdmin(user);
  await getEmployee(id);
  await assertDepartmentExists(data.departmentId);
  await assertManagerCanBeAssigned(data.managerId);

  if (data.email) {
    await assertEmailUnique(data.email, id);
  }

  if (data.registration) {
    await assertRegistrationUnique(data.registration, id);
  }

  const db = getDb();
  const [updated] = await db
    .update(employees)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(employees.id, id))
    .returning();

  if (!updated) {
    throw new Error('Não foi possível atualizar o funcionário.');
  }

  return updated;
}

export async function deactivateEmployee(user: CurrentUser, id: string) {
  requireRhOrAdmin(user);
  await getEmployee(id);

  const db = getDb();
  await db
    .update(employees)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(employees.id, id));
}
