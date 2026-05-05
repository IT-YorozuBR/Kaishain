'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';

import { StatusBadge } from '@/components/layout/StatusBadge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toggleDepartmentActiveAction } from '@/server/actions/departments';

type Department = {
  id: string;
  name: string;
  active: boolean;
};

type DepartmentsTableProps = {
  departments: Department[];
};

export function DepartmentsTable({ departments }: DepartmentsTableProps) {
  const [pending, startTransition] = useTransition();

  function toggleDepartment(id: string) {
    startTransition(async () => {
      await toggleDepartmentActiveAction(id);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                Nenhum departamento encontrado.
              </TableCell>
            </TableRow>
          ) : (
            departments.map((department) => (
              <TableRow key={department.id}>
                <TableCell className="font-medium">{department.name}</TableCell>
                <TableCell>
                  {department.active ? (
                    <StatusBadge status="active">Ativo</StatusBadge>
                  ) : (
                    <StatusBadge status="inactive">Inativo</StatusBadge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => toggleDepartment(department.id)}
                    >
                      {department.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Link
                      href={`/rh/departamentos/${department.id}/editar`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                      aria-label={`Editar ${department.name}`}
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
