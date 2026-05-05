import { z } from 'zod';

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
      .optional(),
  );

const optionalPositiveInt = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : Number(value)))
  .pipe(z.number().int().positive().optional());

export const employeeEvaluationDashboardParamsSchema = z.object({
  employeeId: z.uuid('Funcionário inválido.'),
});

export const employeeEvaluationDashboardFiltersSchema = z.object({
  dateFrom: optionalDate.optional(),
  dateTo: optionalDate.optional(),
  page: optionalPositiveInt.default(1),
  pageSize: optionalPositiveInt.default(20).pipe(z.number().max(100)),
});

export type EmployeeEvaluationDashboardFiltersInput = z.input<
  typeof employeeEvaluationDashboardFiltersSchema
>;
export type EmployeeEvaluationDashboardFilters = z.output<
  typeof employeeEvaluationDashboardFiltersSchema
>;
