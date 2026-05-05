'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth';
import { getSaoPauloTodayDateString } from '@/lib/date';
import { createEvaluationSchema } from '@/lib/validators/evaluation';
import { NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { upsertEvaluation } from '@/server/services/evaluations';

export type EvaluationFormState = {
  error?: string;
  success?: string;
  fieldErrors?: {
    score?: string[];
    note?: string[];
    checklistResults?: string[];
  };
};

export async function evaluateEmployee(
  _previousState: EvaluationFormState,
  formData: FormData,
): Promise<EvaluationFormState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Sessao expirada. Entre novamente.' };
  }

  if (user.role !== 'GESTOR' && user.role !== 'ADMIN') {
    return { error: 'Usuário sem permissão para avaliar funcionários.' };
  }

  const checklistItemIds = formData.getAll('checklistItemId').map(String);
  const checkedChecklistItemIds = new Set(formData.getAll('checkedChecklistItemId').map(String));

  const parsed = createEvaluationSchema.safeParse({
    employeeId: formData.get('employeeId'),
    score: formData.get('score'),
    note: formData.get('note'),
    checklistResults: checklistItemIds.map((checklistItemId) => ({
      checklistItemId,
      checked: checkedChecklistItemIds.has(checklistItemId),
    })),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      fieldErrors: {
        score: fieldErrors.score,
        note: fieldErrors.note,
        checklistResults: fieldErrors.checklistResults,
      },
      error: 'Revise os campos destacados.',
    };
  }

  try {
    await upsertEvaluation(user, parsed.data, getSaoPauloTodayDateString());
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

  revalidatePath('/avaliar');
  revalidatePath(`/avaliar/${parsed.data.employeeId}`);

  return { success: 'Avaliação salva com sucesso.' };
}
