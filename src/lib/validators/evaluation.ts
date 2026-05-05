import { z } from 'zod';

export const createEvaluationSchema = z.object({
  employeeId: z.uuid('Funcionário inválido.'),
  score: z.coerce.number().int().min(0, 'A nota mínima é 0.').max(10, 'A nota máxima é 10.'),
  note: z
    .string()
    .trim()
    .max(2000, 'A observação deve ter no máximo 2000 caracteres.')
    .optional()
    .transform((value) => (value ? value : null)),
  checklistResults: z
    .array(
      z.object({
        checklistItemId: z.uuid('Item de checklist inválido.'),
        checked: z.coerce.boolean(),
      }),
    )
    .min(1, 'Responda ao menos um item do checklist.'),
});

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;
