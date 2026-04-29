'use server';

import { AuthError } from 'next-auth';

import { signIn } from '@/auth';
import { loginSchema } from '@/lib/validators/auth';

export type LoginFormState = {
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

function getSafeRedirect(value: string | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    redirectTo: formData.get('redirectTo'),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      fieldErrors: {
        email: fieldErrors.email,
        password: fieldErrors.password,
      },
    };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: getSafeRedirect(parsed.data.redirectTo),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: 'Credenciais invalidas ou usuario inativo.',
      };
    }

    throw error;
  }

  return {};
}
