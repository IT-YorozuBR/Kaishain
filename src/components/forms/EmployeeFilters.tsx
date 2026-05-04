import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEPARTMENTS } from '@/lib/validators/employee';

type Manager = { id: string; name: string };

type EmployeeFiltersProps = {
  managers: Manager[];
  defaultValues: {
    search?: string;
    status?: string;
    managerId?: string;
    department?: string;
  };
};

export function EmployeeFilters({ managers, defaultValues }: EmployeeFiltersProps) {
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm"
      action=""
      method="get"
    >
      <div className="grid gap-1">
        <Label htmlFor="search">Buscar</Label>
        <Input
          id="search"
          name="search"
          placeholder="Nome ou e-mail"
          defaultValue={defaultValues.search ?? ''}
          className="w-56"
        />
      </div>

      <div className="grid gap-1">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues.status ?? 'active'}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      <div className="grid gap-1">
        <Label htmlFor="managerId">Gestor</Label>
        <select
          id="managerId"
          name="managerId"
          defaultValue={defaultValues.managerId ?? ''}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">Todos os gestores</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <Label htmlFor="department">Departamento</Label>
        <select
          id="department"
          name="department"
          defaultValue={defaultValues.department ?? ''}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">Todos os departamentos</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit">Filtrar</Button>
    </form>
  );
}
