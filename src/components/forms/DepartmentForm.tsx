'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createDepartmentSchema } from '@/lib/validators/department';
import type { DepartmentActionState } from '@/server/actions/departments';

type DepartmentFormValues = z.input<typeof createDepartmentSchema>;
type DepartmentFormOutput = z.output<typeof createDepartmentSchema>;

type DepartmentFormProps = {
  defaultValues?: Partial<DepartmentFormValues>;
  action: (data: unknown) => Promise<DepartmentActionState>;
};

export function DepartmentForm({ defaultValues, action }: DepartmentFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DepartmentFormValues, unknown, DepartmentFormOutput>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: { name: defaultValues?.name ?? '' },
  });

  function onSubmit(data: DepartmentFormOutput) {
    startTransition(async () => {
      const result = await action(data);

      if (result.success) {
        router.push('/rh/departamentos');
        router.refresh();
        return;
      }

      if (result.error) {
        setError('root', { message: result.error });
      }

      if (result.fieldErrors?.name?.[0]) {
        setError('name', { message: result.fieldErrors.name[0] });
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
          placeholder="Produção"
        />
        {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/rh/departamentos')}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
