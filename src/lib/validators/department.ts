import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter ao menos 2 caracteres.')
    .max(100, 'Nome deve ter no máximo 100 caracteres.'),
});

export const updateDepartmentSchema = createDepartmentSchema;

export type CreateDepartmentInput = z.output<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.output<typeof updateDepartmentSchema>;
