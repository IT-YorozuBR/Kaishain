'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createChecklistItemSchema } from '@/lib/validators/checklist';
import type { ChecklistActionState } from '@/server/actions/checklist';

type FormValues = z.input<typeof createChecklistItemSchema>;
type FormOutput = z.output<typeof createChecklistItemSchema>;

type ChecklistItemFormProps = {
  defaultValues?: Partial<FormValues>;
  action: (data: unknown) => Promise<ChecklistActionState>;
};

export function ChecklistItemForm({ defaultValues, action }: ChecklistItemFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(createChecklistItemSchema),
    defaultValues: {
      label: defaultValues?.label ?? '',
      description: defaultValues?.description ?? '',
    },
  });

  function onSubmit(data: FormOutput) {
    startTransition(async () => {
      const result = await action(data);

      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof FormValues, { message: messages?.[0] });
        }
        return;
      }

      if (result.error) {
        setError('root', { message: result.error });
        return;
      }

      router.push('/rh/checklist');
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      {errors.root ? (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="label">Label *</Label>
        <Input id="label" {...register('label')} placeholder="Ex.: Usou EPI corretamente" />
        {errors.label ? (
          <p className="text-sm text-destructive">{errors.label.message}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Detalhe opcional sobre o critério"
          rows={3}
        />
        {errors.description ? (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/rh/checklist')}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
