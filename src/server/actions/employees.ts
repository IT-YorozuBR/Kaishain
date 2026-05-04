'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { createEmployeeSchema, updateEmployeeSchema } from '@/lib/validators/employee';
import {
  createEmployee,
  deactivateEmployee,
  updateEmployee,
} from '@/server/services/employees';

export type EmployeeActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    registration?: string[];
    position?: string[];
    department?: string[];
    managerId?: string[];
    equipamentos?: string[];
  };
};

export async function createEmployeeAction(data: unknown): Promise<EmployeeActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Sessao expirada. Entre novamente.' };
  }

  const parsed = createEmployeeSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createEmployee(user, parsed.data);
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ConflictError ||
      error instanceof ValidationError
    ) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath('/funcionarios');
  return { success: true };
}

export async function updateEmployeeAction(
  id: string,
  data: unknown,
): Promise<EmployeeActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Sessao expirada. Entre novamente.' };
  }

  const parsed = updateEmployeeSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateEmployee(user, id, parsed.data);
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ConflictError ||
      error instanceof NotFoundError ||
      error instanceof ValidationError
    ) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath('/funcionarios');
  revalidatePath(`/funcionarios/${id}/editar`);
  return { success: true };
}

export async function deactivateEmployeeAction(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Sessao expirada. Entre novamente.' };
  }

  try {
    await deactivateEmployee(user, id);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath('/funcionarios');
  revalidatePath(`/funcionarios/${id}/editar`);
  return {};
}
