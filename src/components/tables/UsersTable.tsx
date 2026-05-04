import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/components/layout/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UserRole } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
  active: boolean;
};

type UsersTableProps = {
  users: User[];
};

const roleStyles: Record<UserRole, string> = {
  RH: 'border-blue-200 bg-blue-50 text-blue-700',
  GESTOR: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ADMIN: 'border-purple-200 bg-purple-50 text-purple-700',
};

export function UsersTable({ users }: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                Nenhum usuario encontrado.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={roleStyles[user.role]}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>{user.department ?? '-'}</TableCell>
                <TableCell>
                  {user.active ? (
                    <StatusBadge status="active">Ativo</StatusBadge>
                  ) : (
                    <StatusBadge status="inactive">Inativo</StatusBadge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/rh/usuarios/${user.id}/editar`}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'ml-auto')}
                    aria-label={`Editar ${user.name}`}
                  >
                    <Pencil className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
