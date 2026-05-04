'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth';
import { NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import {
  createChecklistItemSchema,
  reorderChecklistItemsSchema,
  updateChecklistItemSchema,
} from '@/lib/validators/checklist';
import {
  createChecklistItem,
  reorderChecklistItems,
  toggleChecklistItemActive,
  updateChecklistItem,
} from '@/server/services/checklist';

export type ChecklistActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    label?: string[];
    description?: string[];
  };
};

export async function createChecklistItemAction(data: unknown): Promise<ChecklistActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  const parsed = createChecklistItemSchema.safeParse(data);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await createChecklistItem(user, parsed.data);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath('/rh/checklist');
  return { success: true };
}

export async function updateChecklistItemAction(
  id: string,
  data: unknown,
): Promise<ChecklistActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  const parsed = updateChecklistItemSchema.safeParse(data);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await updateChecklistItem(user, id, parsed.data);
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof NotFoundError ||
      error instanceof ValidationError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath('/rh/checklist');
  return { success: true };
}

export async function toggleChecklistItemActiveAction(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  try {
    await toggleChecklistItemActive(user, id);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath('/rh/checklist');
  return {};
}

export async function reorderChecklistItemsAction(
  orderedIds: unknown,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  const parsed = reorderChecklistItemsSchema.safeParse(orderedIds);
  if (!parsed.success) return { error: 'Lista de IDs inválida.' };

  try {
    await reorderChecklistItems(user, parsed.data);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath('/rh/checklist');
  return {};
}
