import bcrypt from 'bcryptjs';
import { and, asc, count, eq, ilike, ne, or, type SQL } from 'drizzle-orm';

import type { CurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { users, type UserRole } from '@/lib/db/schema';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import type { ChangeUserPasswordInput, CreateUserInput, UpdateUserInput } from '@/lib/validators/user';

const TEMP_PASSWORD = 'Kaishain@2025';

export type SystemUser = Omit<typeof users.$inferSelect, 'passwordHash'>;

export type ListUsersFilters = {
  search?: string;
  role?: UserRole;
  active?: boolean;
  limit?: number;
  offset?: number;
};

export type ListUsersResult = {
  rows: SystemUser[];
  total: number;
};

function requireRhOrAdmin(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError('Apenas RH e administradores podem gerenciar usuários.');
  }
}

function canManageRole(actor: CurrentUser, targetRole: UserRole) {
  if (actor.role === 'ADMIN') {
    return true;
  }

  return actor.role === 'RH' && targetRole === 'GESTOR';
}

function assertCanManageRole(actor: CurrentUser, targetRole: UserRole) {
  requireRhOrAdmin(actor);

  if (!canManageRole(actor, targetRole)) {
    throw new UnauthorizedError('Você não pode gerenciar usuários com esta permissão.');
  }
}

function buildUserConditions(actor: CurrentUser, filters: ListUsersFilters): SQL[] {
  const conditions: SQL[] = [];

  if (actor.role === 'RH') {
    conditions.push(eq(users.role, 'GESTOR'));
  } else if (filters.role) {
    conditions.push(eq(users.role, filters.role));
  }

  if (filters.active !== undefined) {
    conditions.push(eq(users.active, filters.active));
  }

  const search = filters.search?.trim();
  if (search) {
    const term = `%${search}%`;
    const searchCondition = or(ilike(users.name, term), ilike(users.email, term));
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return conditions;
}

export async function listUsers(
  actor: CurrentUser,
  filters: ListUsersFilters = {},
): Promise<ListUsersResult> {
  requireRhOrAdmin(actor);

  const db = getDb();
  const conditions = buildUserConditions(actor, filters);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ total: count() }).from(users).where(where);

  const query = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      department: users.department,
      active: users.active,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(where)
    .orderBy(asc(users.name));

  const rows = await (filters.limit !== undefined
    ? query.limit(filters.limit).offset(filters.offset ?? 0)
    : query);

  return {
    rows,
    total: countResult?.total ?? 0,
  };
}

export async function getUser(id: string): Promise<SystemUser> {
  const db = getDb();

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      department: users.department,
      active: users.active,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    throw new NotFoundError('Usuário não encontrado.');
  }

  return user;
}

async function assertEmailUnique(email: string, excludeId?: string) {
  const db = getDb();
  const conditions: SQL[] = [eq(users.email, email)];

  if (excludeId) {
    conditions.push(ne(users.id, excludeId));
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions));

  if (existing) {
    throw new ConflictError('Já existe um usuário com este e-mail.');
  }
}

export async function createUser(actor: CurrentUser, input: CreateUserInput) {
  assertCanManageRole(actor, input.role);
  await assertEmailUnique(input.email);

  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 12);
  const db = getDb();
  const [created] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      department: input.department,
      active: true,
    })
    .returning();

  if (!created) {
    throw new Error('Não foi possível criar o usuário.');
  }

  return created;
}

export async function updateUser(actor: CurrentUser, id: string, input: UpdateUserInput) {
  const current = await getUser(id);
  assertCanManageRole(actor, current.role);
  assertCanManageRole(actor, input.role);

  if (actor.id === id && input.active === false) {
    throw new ValidationError('Você não pode desativar seu próprio usuário.');
  }

  if (actor.role === 'RH' && current.role !== input.role) {
    throw new UnauthorizedError('RH não pode alterar role de usuários.');
  }

  await assertEmailUnique(input.email, id);

  const db = getDb();
  const [updated] = await db
    .update(users)
    .set({
      name: input.name,
      email: input.email,
      role: input.role,
      department: input.department,
      active: input.active ?? current.active,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  if (!updated) {
    throw new Error('Não foi possível atualizar o usuário.');
  }

  return updated;
}

export async function changeUserPassword(
  actor: CurrentUser,
  id: string,
  input: ChangeUserPasswordInput,
) {
  const target = await getUser(id);
  assertCanManageRole(actor, target.role);

  const passwordHash = await bcrypt.hash(input.password, 12);
  const db = getDb();

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, id));
}

export async function deactivateUser(actor: CurrentUser, id: string) {
  if (actor.id === id) {
    throw new ValidationError('Você não pode desativar seu próprio usuário.');
  }

  const current = await getUser(id);
  assertCanManageRole(actor, current.role);

  const db = getDb();
  await db.update(users).set({ active: false, updatedAt: new Date() }).where(eq(users.id, id));
}
