'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changeUserPasswordFormSchema } from '@/lib/validators/user';
import type { ChangePasswordActionState } from '@/server/actions/users';

type FormValues = z.input<typeof changeUserPasswordFormSchema>;

type UserPasswordFormProps = {
  action: (data: unknown) => Promise<ChangePasswordActionState>;
};

export function UserPasswordForm({ action }: UserPasswordFormProps) {
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitSuccessful },
  } = useForm<FormValues>({
    resolver: zodResolver(changeUserPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await action({ password: data.password });

      if (result.fieldErrors?.password) {
        setError('password', { message: result.fieldErrors.password[0] });
        return;
      }

      if (result.error) {
        setError('root', { message: result.error });
        return;
      }

      reset();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      {errors.root ? (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      ) : null}

      {isSubmitSuccessful && !errors.root ? (
        <p className="text-sm text-green-600 font-medium">Senha alterada com sucesso.</p>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Alterando...' : 'Alterar senha'}
        </Button>
      </div>
    </form>
  );
}
