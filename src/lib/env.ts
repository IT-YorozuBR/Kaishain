import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET é obrigatória'),
  AUTH_URL: z.url('AUTH_URL deve ser uma URL válida'),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_URL: process.env.AUTH_URL,
});

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  console.error('❌ Variáveis de ambiente inválidas:', errors);
  throw new Error(`Variáveis de ambiente inválidas: ${JSON.stringify(errors)}`);
}

export const env = parsed.data;
