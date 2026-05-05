'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { createDepartmentSchema, updateDepartmentSchema } from '@/lib/validators/department';
import {
  createDepartment,
  toggleDepartmentActive,
  updateDepartment,
} from '@/server/services/departments';

export type DepartmentActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    name?: string[];
  };
};

export async function createDepartmentAction(data: unknown): Promise<DepartmentActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Sessão expirada. Entre novamente.' };
  }

  const parsed = createDepartmentSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createDepartment(user, parsed.data);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ConflictError) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath('/rh/departamentos');
  return { success: true };
}

export async function updateDepartmentAction(
  id: string,
  data: unknown,
): Promise<DepartmentActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Sessão expirada. Entre novamente.' };
  }

  const parsed = updateDepartmentSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateDepartment(user, id, parsed.data);
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ConflictError ||
      error instanceof NotFoundError
    ) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath('/rh/departamentos');
  revalidatePath(`/rh/departamentos/${id}/editar`);
  return { success: true };
}

export async function toggleDepartmentActiveAction(id: string): Promise<DepartmentActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Sessão expirada. Entre novamente.' };
  }

  try {
    await toggleDepartmentActive(user, id);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath('/rh/departamentos');
  return { success: true };
}
