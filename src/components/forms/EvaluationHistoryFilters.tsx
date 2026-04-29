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
  defaultValues: {
    employeeId?: string;
    evaluatorId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
};

export function EvaluationHistoryFilters({
  employees,
  evaluators = [],
  defaultValues,
}: EvaluationHistoryFiltersProps) {
  return (
    <form
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

      <div className="grid gap-1">
        <Label htmlFor="dateFrom">De</Label>
        <Input id="dateFrom" name="dateFrom" type="date" defaultValue={defaultValues.dateFrom} />
      </div>

      <div className="grid gap-1">
        <Label htmlFor="dateTo">Ate</Label>
        <Input id="dateTo" name="dateTo" type="date" defaultValue={defaultValues.dateTo} />
      </div>

      <Button type="submit">Filtrar</Button>
    </form>
  );
}
