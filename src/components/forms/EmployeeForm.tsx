'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
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
import {
  createEmployeeSchema,
  EQUIPAMENTOS,
  type EquipamentoValue,
  TURNO_LABELS,
  TURNOS,
} from '@/lib/validators/employee';
import type { EmployeeActionState } from '@/server/actions/employees';

type EmployeeFormValues = z.input<typeof createEmployeeSchema>;
type EmployeeFormOutput = z.output<typeof createEmployeeSchema>;
type Manager = { id: string; name: string; email: string; department: string | null };
type Department = { id: string; name: string };

type EmployeeFormProps = {
  managers: Manager[];
  departments: Department[];
  defaultValues?: Partial<Record<Exclude<keyof EmployeeFormValues, 'equipamentos'>, string | null>> & {
    equipamentos?: EquipamentoValue[];
  };
  action: (data: unknown) => Promise<EmployeeActionState>;
};

function valueOrEmpty(value: string | null | undefined) {
  return value ?? '';
}

export function EmployeeForm({ managers, departments, defaultValues, action }: EmployeeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const mounted = useRef(false);

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
      departmentId: valueOrEmpty(defaultValues?.departmentId),
      turno: valueOrEmpty(defaultValues?.turno),
      managerId: valueOrEmpty(defaultValues?.managerId),
      equipamentos: defaultValues?.equipamentos ?? [],
    },
  });

  const managerId = useWatch({ control, name: 'managerId' });
  const turno = useWatch({ control, name: 'turno' });
  const departmentId = useWatch({ control, name: 'departmentId' });
  const equipamentos = useWatch({ control, name: 'equipamentos' }) ?? [];

  const selectedDepartment = departments.find((department) => department.id === departmentId);
  const filteredManagers = selectedDepartment
    ? managers.filter((manager) => manager.department === selectedDepartment.name)
    : [];

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    if (!departmentId || !managerId || !selectedDepartment) return;
    const inList = managers
      .filter((manager) => manager.department === selectedDepartment.name)
      .some((manager) => manager.id === managerId);
    if (!inList) {
      setValue('managerId', '', { shouldDirty: false, shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleEquipamento(item: EquipamentoValue) {
    const next = equipamentos.includes(item)
      ? equipamentos.filter((equipamento) => equipamento !== item)
      : [...equipamentos, item];
    setValue('equipamentos', next, { shouldDirty: true, shouldValidate: true });
  }

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

  const managerDisabled = !departmentId || filteredManagers.length === 0;
  const managerPlaceholder = !departmentId
    ? 'Selecione um departamento primeiro'
    : filteredManagers.length === 0
      ? 'Nenhum gestor para este departamento'
      : 'Selecione um gestor';

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
          <Label htmlFor="registration">Matrícula</Label>
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
          <Label htmlFor="departmentId">Departamento</Label>
          <Select
            value={departmentId || 'none'}
            onValueChange={(value) => {
              const next = value && value !== 'none' ? value : '';
              setValue('departmentId', next, { shouldDirty: true, shouldValidate: true });
              setValue('managerId', '', { shouldDirty: true, shouldValidate: false });
            }}
          >
            <SelectTrigger
              id="departmentId"
              className="w-full"
              aria-invalid={Boolean(errors.departmentId)}
            >
              <SelectValue placeholder="Selecione um departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem departamento</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.departmentId ? (
            <p className="text-sm text-destructive">{errors.departmentId.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="turno">Turno</Label>
          <Select
            value={turno || 'none'}
            onValueChange={(value) => {
              const nextValue = value ?? 'none';
              setValue('turno', nextValue === 'none' ? '' : nextValue, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
          >
            <SelectTrigger id="turno" className="w-full" aria-invalid={Boolean(errors.turno)}>
              <SelectValue placeholder="Sem turno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem turno</SelectItem>
              {TURNOS.map((turnoOption) => (
                <SelectItem key={turnoOption} value={turnoOption}>
                  {TURNO_LABELS[turnoOption]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.turno ? (
            <p className="text-sm text-destructive">{errors.turno.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="managerId">Gestor</Label>
        <Select
          value={managerDisabled ? '' : (managerId || 'none')}
          disabled={managerDisabled}
          onValueChange={(value) => {
            const next = value && value !== 'none' ? value : '';
            setValue('managerId', next, { shouldDirty: true, shouldValidate: true });
          }}
        >
          <SelectTrigger
            id="managerId"
            className="w-full"
            aria-invalid={Boolean(errors.managerId)}
          >
            <SelectValue placeholder={managerPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem gestor</SelectItem>
            {filteredManagers.map((manager) => (
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

      <div className="grid gap-3">
        <Label>Equipamentos necessários</Label>
        <div className="flex flex-wrap gap-4">
          {EQUIPAMENTOS.map((item) => (
            <label key={item} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={equipamentos.includes(item)}
                onChange={() => toggleEquipamento(item)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              {item}
            </label>
          ))}
        </div>
        {errors.equipamentos ? (
          <p className="text-sm text-destructive">{errors.equipamentos.message}</p>
        ) : null}
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
