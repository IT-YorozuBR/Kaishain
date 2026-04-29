'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createEmployeeSchema } from '@/lib/validators/employee';
import type { EmployeeActionState } from '@/server/actions/employees';

type EmployeeFormValues = z.input<typeof createEmployeeSchema>;
type EmployeeFormOutput = z.output<typeof createEmployeeSchema>;
type Manager = { id: string; name: string; email: string };

type EmployeeFormProps = {
  managers: Manager[];
  defaultValues?: Partial<Record<keyof EmployeeFormValues, string | null>>;
  action: (data: unknown) => Promise<EmployeeActionState>;
};

function valueOrEmpty(value: string | null | undefined) {
  return value ?? '';
}

export function EmployeeForm({ managers, defaultValues, action }: EmployeeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm<EmployeeFormValues, unknown, EmployeeFormOutput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      name: valueOrEmpty(defaultValues?.name),
      email: valueOrEmpty(defaultValues?.email),
      registration: valueOrEmpty(defaultValues?.registration),
      position: valueOrEmpty(defaultValues?.position),
      department: valueOrEmpty(defaultValues?.department),
      managerId: valueOrEmpty(defaultValues?.managerId),
    },
  });

  const managerId = useWatch({ control, name: 'managerId' });

  function onSubmit(data: EmployeeFormOutput) {
    startTransition(async () => {
      const result = await action(data);

      if (result.success) {
        router.push('/funcionarios');
        router.refresh();
        return;
      }

      if (result.error) {
        setError('root', { message: result.error });
      }

      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof EmployeeFormOutput, { message: messages[0] });
          }
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      {errors.root ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.root.message}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          {...register('name')}
          aria-invalid={Boolean(errors.name)}
          placeholder="Maria Silva"
        />
        {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
          placeholder="maria@empresa.com"
        />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="registration">Matricula</Label>
          <Input
            id="registration"
            {...register('registration')}
            aria-invalid={Boolean(errors.registration)}
            placeholder="000123"
          />
          {errors.registration ? (
            <p className="text-sm text-destructive">{errors.registration.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="position">Cargo</Label>
          <Input
            id="position"
            {...register('position')}
            aria-invalid={Boolean(errors.position)}
            placeholder="Analista"
          />
          {errors.position ? (
            <p className="text-sm text-destructive">{errors.position.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="department">Departamento</Label>
          <Input
            id="department"
            {...register('department')}
            aria-invalid={Boolean(errors.department)}
            placeholder="Operacoes"
          />
          {errors.department ? (
            <p className="text-sm text-destructive">{errors.department.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="managerId">Gestor</Label>
          <Select
            value={managerId || 'none'}
            onValueChange={(value) => {
              const nextValue = value ?? 'none';

              setValue('managerId', nextValue === 'none' ? '' : nextValue, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
          >
            <SelectTrigger id="managerId" className="w-full" aria-invalid={Boolean(errors.managerId)}>
              <SelectValue placeholder="Sem gestor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem gestor</SelectItem>
              {managers.map((manager) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {manager.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.managerId ? (
            <p className="text-sm text-destructive">{errors.managerId.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/funcionarios')}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
