import { z } from 'zod';

const optionalSearch = z
  .string()
  .trim()
  .max(120, 'Busca muito longa.')
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const optionalPositiveInt = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : Number(value)))
  .pipe(z.number().int().positive().optional());

export const evaluationDashboardFiltersSchema = z.object({
  search: optionalSearch,
  page: optionalPositiveInt.default(1),
  pageSize: optionalPositiveInt.default(20).pipe(z.number().max(100)),
});

export type EvaluationDashboardFiltersInput = z.input<typeof evaluationDashboardFiltersSchema>;
export type EvaluationDashboardFilters = z.output<typeof evaluationDashboardFiltersSchema>;
