import { and, asc, eq, ilike, ne, or, type SQL } from 'drizzle-orm';

import type { CurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { employees, users } from '@/lib/db/schema';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/validators/employee';

function requireRhOrAdmin(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError('Apenas RH e administradores podem gerenciar funcionarios.');
  }
}

export type EmployeeWithManager = typeof employees.$inferSelect & {
  manager: Pick<typeof users.$inferSelect, 'id' | 'name'> | null;
};

export type Manager = Pick<typeof users.$inferSelect, 'id' | 'name' | 'email'>;

export type ListEmployeesFilters = {
  search?: string;
  managerId?: string;
  active?: boolean;
};

export async function listEmployees(
  filters: ListEmployeesFilters = {},
): Promise<EmployeeWithManager[]> {
  const db = getDb();
  const conditions: SQL[] = [];

  if (filters.active !== undefined) {
    conditions.push(eq(employees.active, filters.active));
  }

  if (filters.managerId) {
    conditions.push(eq(employees.managerId, filters.managerId));
  }

  const search = filters.search?.trim();
  if (search) {
    const term = `%${search}%`;
    const searchCondition = or(ilike(employees.name, term), ilike(employees.email, term));

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const rows = await db
    .select({
      employee: employees,
      manager: {
        id: users.id,
        name: users.name,
      },
    })
    .from(employees)
    .leftJoin(users, eq(employees.managerId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(employees.name));

  return rows.map(({ employee, manager }) => ({
    ...employee,
    manager: manager?.id ? { id: manager.id, name: manager.name } : null,
  }));
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
    })
    .from(employees)
    .leftJoin(users, eq(employees.managerId, users.id))
    .where(eq(employees.id, id));

  if (!row) {
    throw new NotFoundError('Funcionario nao encontrado.');
  }

  return {
    ...row.employee,
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
    })
    .from(users)
    .where(and(eq(users.role, 'GESTOR'), eq(users.active, true)))
    .orderBy(asc(users.name));
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
    throw new ValidationError('Gestor invalido ou inativo.');
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
    throw new ConflictError('Ja existe um funcionario com este e-mail.');
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
    throw new ConflictError('Ja existe um funcionario com esta matricula.');
  }
}

export async function createEmployee(user: CurrentUser, data: CreateEmployeeInput) {
  requireRhOrAdmin(user);
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
    throw new Error('Nao foi possivel criar o funcionario.');
  }

  return employee;
}

export async function updateEmployee(user: CurrentUser, id: string, data: UpdateEmployeeInput) {
  requireRhOrAdmin(user);
  await getEmployee(id);
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
    throw new Error('Nao foi possivel atualizar o funcionario.');
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
