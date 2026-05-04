import { z } from 'zod';

export const createChecklistItemSchema = z.object({
  label: z.string().trim().min(1, 'Label é obrigatório.').max(120, 'Máximo 120 caracteres.'),
  description: z
    .string()
    .trim()
    .max(500, 'Máximo 500 caracteres.')
    .optional()
    .transform((v) => (v === '' ? null : (v ?? null))),
});

export const updateChecklistItemSchema = createChecklistItemSchema.partial();

export const reorderChecklistItemsSchema = z
  .array(z.string().uuid())
  .min(1, 'Lista de ids não pode ser vazia.');

export type CreateChecklistItemInput = z.output<typeof createChecklistItemSchema>;
export type UpdateChecklistItemInput = z.output<typeof updateChecklistItemSchema>;
export type ReorderChecklistItemsInput = z.output<typeof reorderChecklistItemsSchema>;
