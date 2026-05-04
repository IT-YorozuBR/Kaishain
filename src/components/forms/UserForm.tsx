'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createUserSchema,
  updateUserSchema,
  USER_ROLES,
  type UserRoleValue,
} from '@/lib/validators/user';
import type { UserActionState } from '@/server/actions/users';

type UserFormValues = z.input<typeof createUserSchema> & { active?: boolean };
type UserFormOutput = z.output<typeof createUserSchema> & { active?: boolean };

type UserFormProps = {
  allowedRoles: UserRoleValue[];
  defaultValues?: Partial<UserFormValues>;
  showActive?: boolean;
  action: (data: unknown) => Promise<UserActionState>;
};

function valueOrEmpty(value: string | null | undefined) {
  return value ?? '';
}

export function UserForm({
  allowedRoles,
  defaultValues,
  showActive = false,
  action,
}: UserFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UserFormValues, unknown, UserFormOutput>({
    resolver: zodResolver(showActive ? updateUserSchema : createUserSchema),
    defaultValues: {
      name: valueOrEmpty(defaultValues?.name),
      email: valueOrEmpty(defaultValues?.email),
      role: defaultValues?.role ?? allowedRoles[0] ?? 'GESTOR',
      department: valueOrEmpty(defaultValues?.department),
      active: defaultValues?.active ?? true,
    },
  });

  function onSubmit(data: UserFormOutput) {
    startTransition(async () => {
      const result = await action(showActive ? data : { ...data, active: undefined });

      if (result.success) {
        router.push('/rh/usuarios');
        router.refresh();
        return;
      }

      if (result.error) {
        setError('root', { message: result.error });
      }

      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof UserFormValues, { message: messages[0] });
          }
        }
      }
    });
  }

  const roleOptions = USER_ROLES.filter((role) => allowedRoles.includes(role));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      {errors.root ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.root.message}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" {...register('name')} aria-invalid={Boolean(errors.name)} />
        {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email ? <p className="text-destructive text-sm">{errors.email.message}</p> : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            {...register('role')}
            className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {errors.role ? <p className="text-destructive text-sm">{errors.role.message}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="department">Departamento</Label>
          <Input id="department" {...register('department')} />
          {errors.department ? (
            <p className="text-destructive text-sm">{errors.department.message}</p>
          ) : null}
        </div>
      </div>

      {showActive ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary h-4 w-4" {...register('active')} />
          Usuario ativo
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/rh/usuarios')}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
