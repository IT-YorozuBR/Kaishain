import { z } from 'zod';

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.string().uuid().optional());

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida.').optional());

const optionalPositiveInt = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : Number(value)))
  .pipe(z.number().int().positive().optional());

export const evaluationHistoryFiltersSchema = z.object({
  employeeId: optionalUuid.optional(),
  evaluatorId: optionalUuid.optional(),
  dateFrom: optionalDate.optional(),
  dateTo: optionalDate.optional(),
  page: optionalPositiveInt.default(1),
  pageSize: optionalPositiveInt.default(20),
});

export type EvaluationHistoryFiltersInput = z.input<typeof evaluationHistoryFiltersSchema>;
export type EvaluationHistoryFilters = z.output<typeof evaluationHistoryFiltersSchema>;
