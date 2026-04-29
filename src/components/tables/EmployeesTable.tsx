'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type Employee = {
  id: string;
  name: string;
  email: string | null;
  position: string | null;
  department: string | null;
  active: boolean;
  manager: { id: string; name: string } | null;
};

type EmployeesTableProps = {
  employees: Employee[];
  managers: { id: string; name: string }[];
};

const columnHelper = createColumnHelper<Employee>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Nome',
  }),
  columnHelper.accessor('email', {
    header: 'E-mail',
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('position', {
    header: 'Cargo',
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('department', {
    header: 'Departamento',
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor((row) => row.manager?.name ?? null, {
    id: 'manager',
    header: 'Gestor',
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('active', {
    header: 'Status',
    cell: (info) =>
      info.getValue() ? (
        <Badge variant="outline">Ativo</Badge>
      ) : (
        <Badge variant="secondary">Inativo</Badge>
      ),
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: (info) => (
      <Link
        href={`/funcionarios/${info.row.original.id}/editar`}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'ml-auto')}
        aria-label={`Editar ${info.row.original.name}`}
      >
        <Pencil className="size-4" />
      </Link>
    ),
  }),
];

export function EmployeesTable({ employees, managers }: EmployeesTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [managerFilter, setManagerFilter] = useState('all');

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return employees.filter((employee) => {
      if (statusFilter === 'active' && !employee.active) {
        return false;
      }

      if (statusFilter === 'inactive' && employee.active) {
        return false;
      }

      if (managerFilter !== 'all' && employee.manager?.id !== managerFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        employee.name.toLowerCase().includes(normalizedSearch) ||
        (employee.email?.toLowerCase().includes(normalizedSearch) ?? false)
      );
    });
  }, [employees, managerFilter, search, statusFilter]);

  // TanStack Table intentionally returns stateful APIs that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredEmployees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-56 gap-1">
          <Label htmlFor="search">Buscar</Label>
          <Input
            id="search"
            placeholder="Nome ou e-mail"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="grid gap-1">
          <Label>Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              if (value === 'all' || value === 'active' || value === 'inactive') {
                setStatusFilter(value);
              }
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1">
          <Label>Gestor</Label>
          <Select value={managerFilter} onValueChange={(value) => setManagerFilter(value ?? 'all')}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os gestores</SelectItem>
              {managers.map((manager) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {manager.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Nenhum funcionario encontrado.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {filteredEmployees.length} funcionario(s) encontrado(s)
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Proxima
          </Button>
        </div>
      </div>
    </div>
  );
}
