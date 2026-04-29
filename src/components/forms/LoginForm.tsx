'use client';

import { useActionState } from 'react';
import { LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction, type LoginFormState } from '@/server/actions/auth';

type LoginFormProps = {
  redirectTo?: string;
};

const initialState: LoginFormState = {};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo ?? '/'} />

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="gestor@empresa.com"
          aria-invalid={Boolean(state.fieldErrors?.email)}
          required
        />
        {state.fieldErrors?.email ? (
          <p className="text-destructive text-sm">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(state.fieldErrors?.password)}
          required
        />
        {state.fieldErrors?.password ? (
          <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
        ) : null}
      </div>

      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        <LogIn data-icon="inline-start" />
        {pending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
}
