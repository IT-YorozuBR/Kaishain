import { z } from 'zod';

export const USER_ROLES = ['RH', 'GESTOR', 'ADMIN'] as const;
export type UserRoleValue = (typeof USER_ROLES)[number];

const emptyToNull = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value));

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres.').max(255),
  email: z.email('E-mail invalido.').trim().toLowerCase().max(255),
  role: z.enum(USER_ROLES),
  department: emptyToNull.pipe(z.string().max(255).nullable()),
});

export const updateUserSchema = createUserSchema.extend({
  active: z.boolean().optional(),
});

const optionalRole = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.enum(USER_ROLES).optional());

const optionalStatus = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.enum(['active', 'inactive', 'all']).optional());

const optionalSearch = z
  .string()
  .trim()
  .max(255)
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const optionalPositiveInt = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : Number(value)))
  .pipe(z.number().int().positive().optional());

export const listUsersFiltersSchema = z.object({
  search: optionalSearch,
  role: optionalRole,
  status: optionalStatus.default('active'),
  page: optionalPositiveInt.default(1),
});

export type CreateUserInput = z.output<typeof createUserSchema>;
export type UpdateUserInput = z.output<typeof updateUserSchema>;
export type ListUsersFiltersInput = z.input<typeof listUsersFiltersSchema>;
export type ListUsersFilters = z.output<typeof listUsersFiltersSchema>;
