'use server';

import { getCurrentUser } from '@/lib/auth';
import { UnauthorizedError, ValidationError } from '@/lib/errors';
import {
  evaluationHistoryFiltersSchema,
  type EvaluationHistoryFiltersInput,
} from '@/lib/validators/evaluation-history';
import { listEvaluations } from '@/server/services/evaluations';

export async function listEvaluationHistoryAction(input: EvaluationHistoryFiltersInput) {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError('Sessao expirada. Entre novamente.');
  }

  const parsed = evaluationHistoryFiltersSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError('Filtros invalidos.');
  }

  const filters = parsed.data;

  if (user.role === 'GESTOR') {
    // Permissao nao vem do client: gestor sempre consulta apenas avaliacoes feitas por ele.
    return listEvaluations({ ...filters, evaluatorId: user.id });
  }

  if (user.role === 'RH' || user.role === 'ADMIN') {
    return listEvaluations(filters);
  }

  throw new UnauthorizedError();
}
