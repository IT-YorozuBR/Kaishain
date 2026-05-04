import { BarChart3, Pencil } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/components/layout/StatusBadge';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { TURNO_LABELS, type TurnoValue } from '@/lib/validators/employee';

type Employee = {
  id: string;
  name: string;
  email: string | null;
  position: string | null;
  department: string | null;
  turno: string | null;
  active: boolean;
  manager: { id: string; name: string } | null;
};

type EmployeesTableProps = {
  employees: Employee[];
};

export function EmployeesTable({ employees }: EmployeesTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Turno</TableHead>
            <TableHead>Gestor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                Nenhum funcionario encontrado.
              </TableCell>
            </TableRow>
          ) : (
            employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>{employee.email ?? '-'}</TableCell>
                <TableCell>{employee.position ?? '-'}</TableCell>
                <TableCell>{employee.department ?? '-'}</TableCell>
                <TableCell>
                  {employee.turno
                    ? (TURNO_LABELS[employee.turno as TurnoValue] ?? employee.turno)
                    : '-'}
                </TableCell>
                <TableCell>{employee.manager?.name ?? '-'}</TableCell>
                <TableCell>
                  {employee.active ? (
                    <StatusBadge status="active">Ativo</StatusBadge>
                  ) : (
                    <StatusBadge status="inactive">Inativo</StatusBadge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/rh/funcionarios/${employee.id}/dashboard`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                      aria-label={`Dashboard de ${employee.name}`}
                    >
                      <BarChart3 className="size-4" />
                    </Link>
                    <Link
                      href={`/funcionarios/${employee.id}/editar`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                      aria-label={`Editar ${employee.name}`}
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
