import { redirect } from 'next/navigation';
import Link from 'next/link';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmployeeFilters } from '@/components/forms/EmployeeFilters';
import { EmployeesTable } from '@/components/tables/EmployeesTable';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { listDepartments } from '@/server/services/departments';
import { listEmployees, listManagers } from '@/server/services/employees';

const PAGE_SIZE = 20;

type FuncionariosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
) {
  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const current = Array.isArray(value) ? value[0] : value;
    if (current && key !== 'page') {
      nextParams.set(key, current);
    }
  }
  nextParams.set('page', String(page));
  return `/funcionarios?${nextParams.toString()}`;
}

export default async function FuncionariosPage({ searchParams }: FuncionariosPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const params = await searchParams;

  const search = getParam(params, 'search');
  const statusParam = getParam(params, 'status') ?? 'active';
  const managerId = getParam(params, 'managerId');
  const departmentId = getParam(params, 'departmentId');
  const page = Math.max(1, parseInt(getParam(params, 'page') ?? '1', 10));

  const active =
    statusParam === 'inactive' ? false : statusParam === 'all' ? undefined : true;

  const [{ rows: employees, total }, managers, departments] = await Promise.all([
    listEmployees({
      search,
      active,
      managerId,
      departmentId,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    listManagers(),
    listDepartments(true),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="Funcionários"
          description="Gerencie o cadastro de funcionários da empresa."
          actions={
            <Link href="/funcionarios/novo" className={cn(buttonVariants(), 'shrink-0')}>
              Novo funcionário
            </Link>
          }
        />

        <EmployeeFilters
          managers={managers}
          departments={departments}
          defaultValues={{
            search,
            status: statusParam,
            managerId,
            departmentId,
          }}
        />

        <EmployeesTable employees={employees} />

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages} — {total} funcionário(s)
          </span>
          <div className="flex gap-2">
            <Link
              href={buildPageHref(params, Math.max(page - 1, 1))}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                page <= 1 && 'pointer-events-none opacity-50',
              )}
              aria-disabled={page <= 1}
            >
              Anterior
            </Link>
            <Link
              href={buildPageHref(params, Math.min(page + 1, totalPages))}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                page >= totalPages && 'pointer-events-none opacity-50',
              )}
              aria-disabled={page >= totalPages}
            >
              Próxima
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
