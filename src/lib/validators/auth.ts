import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Informe um email valido.').trim().toLowerCase(),
  password: z.string().min(1, 'Informe sua senha.'),
  redirectTo: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
