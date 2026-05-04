'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { changeUserPasswordSchema, createUserSchema, updateUserSchema } from '@/lib/validators/user';
import { changeUserPassword, createUser, deactivateUser, updateUser } from '@/server/services/users';

export type UserActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    role?: string[];
    department?: string[];
    active?: string[];
  };
};

function handleUserError(error: unknown): UserActionState {
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

export async function createUserAction(data: unknown): Promise<UserActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Sessao expirada. Entre novamente.' };
  }

  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createUser(user, parsed.data);
  } catch (error) {
    return handleUserError(error);
  }

  revalidatePath('/rh/usuarios');
  return { success: true };
}

export async function updateUserAction(id: string, data: unknown): Promise<UserActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Sessao expirada. Entre novamente.' };
  }

  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateUser(user, id, parsed.data);
  } catch (error) {
    return handleUserError(error);
  }

  revalidatePath('/rh/usuarios');
  revalidatePath(`/rh/usuarios/${id}/editar`);
  return { success: true };
}

export type ChangePasswordActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: { password?: string[] };
};

export async function changeUserPasswordAction(
  id: string,
  data: unknown,
): Promise<ChangePasswordActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Sessao expirada. Entre novamente.' };
  }

  const parsed = changeUserPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await changeUserPassword(user, id, parsed.data);
  } catch (error) {
    const result = handleUserError(error);
    return { error: result.error };
  }

  revalidatePath('/rh/usuarios');
  revalidatePath(`/rh/usuarios/${id}/editar`);
  return { success: true };
}

export async function deactivateUserAction(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Sessao expirada. Entre novamente.' };
  }

  try {
    await deactivateUser(user, id);
  } catch (error) {
    const result = handleUserError(error);
    return { error: result.error };
  }

  revalidatePath('/rh/usuarios');
  revalidatePath(`/rh/usuarios/${id}/editar`);
  return {};
}
