import { z } from 'zod';

// Transforma string vazia em null para inputs opcionais de formulário HTML.
const emptyToNull = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v));

export const TURNOS = ['PRIMEIRO', 'SEGUNDO', 'TERCEIRO'] as const;
export type TurnoValue = (typeof TURNOS)[number];

export const TURNO_LABELS: Record<TurnoValue, string> = {
  PRIMEIRO: 'Primeiro',
  SEGUNDO: 'Segundo',
  TERCEIRO: 'Terceiro',
};

export const EQUIPAMENTOS = ['Notebook', 'Monitor', 'EPI'] as const;
export type EquipamentoValue = (typeof EQUIPAMENTOS)[number];

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres.').max(255),
  email: emptyToNull.pipe(z.string().email('E-mail inválido.').max(255).nullable()),
  registration: emptyToNull.pipe(z.string().max(50).nullable()),
  position: emptyToNull.pipe(z.string().max(255).nullable()),
  departmentId: emptyToNull.pipe(z.string().uuid('Departamento inválido.').nullable()),
  turno: emptyToNull.pipe(z.enum(TURNOS).nullable()),
  managerId: emptyToNull.pipe(z.string().uuid('Gestor inválido.').nullable()),
  equipamentos: z.array(z.enum(EQUIPAMENTOS)).default([]),
});

export const updateEmployeeSchema = createEmployeeSchema;

export type CreateEmployeeInput = z.output<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.output<typeof updateEmployeeSchema>;
