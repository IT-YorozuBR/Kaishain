import { z } from 'zod';

export const createEvaluationSchema = z.object({
  employeeId: z.uuid('Funcionario invalido.'),
  score: z.coerce.number().int().min(0, 'A nota minima e 0.').max(10, 'A nota maxima e 10.'),
  note: z
    .string()
    .trim()
    .max(2000, 'A observacao deve ter no maximo 2000 caracteres.')
    .optional()
    .transform((value) => (value ? value : null)),
  checklistResults: z
    .array(
      z.object({
        checklistItemId: z.uuid('Item de checklist invalido.'),
        checked: z.coerce.boolean(),
      }),
    )
    .min(1, 'Responda ao menos um item do checklist.'),
});

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;
