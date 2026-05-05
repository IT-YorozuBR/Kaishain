'use client';

import { Download } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Option = {
  id: string;
  name: string;
};

type EvaluationHistoryFiltersProps = {
  evaluators?: Option[];
  departments?: Option[];
  defaultValues: {
    employeeId?: string;
    employeeSearch?: string;
    evaluatorId?: string;
    dateFrom?: string;
    dateTo?: string;
    departmentId?: string;
  };
};

export function EvaluationHistoryFilters({
  evaluators = [],
  departments = [],
  defaultValues,
}: EvaluationHistoryFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleExport() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const str = value.toString().trim();
      if (str && key !== 'page') {
        params.set(key, str);
      }
    }
    window.location.href = `/api/relatorio/avaliacoes?${params.toString()}`;
  }

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm"
      action=""
      method="get"
    >
      <div className="grid gap-1">
        <Label htmlFor="employeeSearch">Funcionário</Label>
        <Input
          id="employeeSearch"
          name="employeeSearch"
          placeholder="Nome, e-mail ou matrícula"
          defaultValue={defaultValues.employeeSearch ?? ''}
          className="w-64"
        />
      </div>

      {evaluators.length > 0 ? (
        <div className="grid gap-1">
          <Label htmlFor="evaluatorId">Avaliador</Label>
          <select
            id="evaluatorId"
            name="evaluatorId"
            defaultValue={defaultValues.evaluatorId ?? ''}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {evaluators.map((evaluator) => (
              <option key={evaluator.id} value={evaluator.id}>
                {evaluator.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {departments.length > 0 ? (
        <div className="grid gap-1">
          <Label htmlFor="departmentId">Departamento</Label>
          <select
            id="departmentId"
            name="departmentId"
            defaultValue={defaultValues.departmentId ?? ''}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-1">
        <Label htmlFor="dateFrom">De</Label>
        <Input id="dateFrom" name="dateFrom" type="date" defaultValue={defaultValues.dateFrom} />
      </div>

      <div className="grid gap-1">
        <Label htmlFor="dateTo">Até</Label>
        <Input id="dateTo" name="dateTo" type="date" defaultValue={defaultValues.dateTo} />
      </div>

      <div className="flex gap-2">
        <Button type="submit">Filtrar</Button>
        <Button type="button" variant="outline" onClick={handleExport}>
          <Download className="size-4" />
          Exportar Excel
        </Button>
      </div>
    </form>
  );
}
