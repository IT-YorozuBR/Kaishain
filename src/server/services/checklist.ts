import { asc, eq, max } from 'drizzle-orm';

import type { CurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { checklistItems } from '@/lib/db/schema';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';
import type {
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
} from '@/lib/validators/checklist';

export type ChecklistItem = typeof checklistItems.$inferSelect;

function requireRhOrAdmin(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError('Apenas RH e administradores podem gerenciar o checklist.');
  }
}

export async function listChecklistItems(activeOnly = false): Promise<ChecklistItem[]> {
  const db = getDb();
  return db.query.checklistItems.findMany({
    where: activeOnly ? eq(checklistItems.active, true) : undefined,
    orderBy: [asc(checklistItems.order), asc(checklistItems.label)],
  });
}

export async function getChecklistItem(id: string): Promise<ChecklistItem> {
  const db = getDb();
  const item = await db.query.checklistItems.findFirst({
    where: eq(checklistItems.id, id),
  });
  if (!item) {
    throw new NotFoundError('Item de checklist não encontrado.');
  }
  return item;
}

export async function createChecklistItem(
  user: CurrentUser,
  input: CreateChecklistItemInput,
): Promise<ChecklistItem> {
  requireRhOrAdmin(user);
  const db = getDb();

  const [maxRow] = await db.select({ value: max(checklistItems.order) }).from(checklistItems);
  const nextOrder = (maxRow?.value ?? 0) + 1;

  const [item] = await db
    .insert(checklistItems)
    .values({ ...input, order: nextOrder })
    .returning();

  if (!item) throw new Error('Falha ao criar item de checklist.');
  return item;
}

export async function updateChecklistItem(
  user: CurrentUser,
  id: string,
  input: UpdateChecklistItemInput,
): Promise<ChecklistItem> {
  requireRhOrAdmin(user);
  const db = getDb();

  await getChecklistItem(id);

  const [item] = await db
    .update(checklistItems)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(checklistItems.id, id))
    .returning();

  if (!item) throw new NotFoundError('Item de checklist não encontrado.');
  return item;
}

export async function toggleChecklistItemActive(
  user: CurrentUser,
  id: string,
): Promise<ChecklistItem> {
  requireRhOrAdmin(user);
  const db = getDb();

  const item = await getChecklistItem(id);

  const [updated] = await db
    .update(checklistItems)
    .set({ active: !item.active, updatedAt: new Date() })
    .where(eq(checklistItems.id, id))
    .returning();

  if (!updated) throw new NotFoundError('Item de checklist não encontrado.');
  return updated;
}

export async function reorderChecklistItems(
  user: CurrentUser,
  orderedIds: string[],
): Promise<void> {
  requireRhOrAdmin(user);
  const db = getDb();

  await db.transaction(async (tx) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        tx
          .update(checklistItems)
          .set({ order: index + 1, updatedAt: new Date() })
          .where(eq(checklistItems.id, id)),
      ),
    );
  });
}
