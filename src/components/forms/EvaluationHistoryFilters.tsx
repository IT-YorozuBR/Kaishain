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
  employees: Option[];
  evaluators?: Option[];
  departments?: string[];
  defaultValues: {
    employeeId?: string;
    evaluatorId?: string;
    dateFrom?: string;
    dateTo?: string;
    department?: string;
  };
};

export function EvaluationHistoryFilters({
  employees,
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
        <Label htmlFor="employeeId">Funcionario</Label>
        <select
          id="employeeId"
          name="employeeId"
          defaultValue={defaultValues.employeeId ?? ''}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">Todos</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
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
          <Label htmlFor="department">Setor</Label>
          <select
            id="department"
            name="department"
            defaultValue={defaultValues.department ?? ''}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
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
        <Label htmlFor="dateTo">Ate</Label>
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
