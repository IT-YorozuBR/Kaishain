import { z } from 'zod';

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.string().uuid('Gestor inválido.').optional());

export const dailyEvaluationStatusFiltersSchema = z.object({
  gestorId: optionalUuid.optional(),
});

export type DailyEvaluationStatusFiltersInput = z.input<typeof dailyEvaluationStatusFiltersSchema>;
export type DailyEvaluationStatusFilters = z.output<typeof dailyEvaluationStatusFiltersSchema>;
