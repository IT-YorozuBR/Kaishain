import { z } from 'zod';

// Transforma string vazia em null — necessário para inputs opcionais de formulário HTML
const emptyToNull = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v));

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres.').max(255),
  email: emptyToNull.pipe(z.string().email('E-mail inválido.').max(255).nullable()),
  registration: emptyToNull.pipe(z.string().max(50).nullable()),
  position: emptyToNull.pipe(z.string().max(255).nullable()),
  department: emptyToNull.pipe(z.string().max(255).nullable()),
  managerId: emptyToNull.pipe(z.string().uuid('Gestor inválido.').nullable()),
});

export const updateEmployeeSchema = createEmployeeSchema;

export type CreateEmployeeInput = z.output<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.output<typeof updateEmployeeSchema>;
