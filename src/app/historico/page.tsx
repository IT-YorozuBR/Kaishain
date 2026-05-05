import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EvaluationHistoryFilters } from '@/components/forms/EvaluationHistoryFilters';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EvaluationsHistoryTable } from '@/components/tables/EvaluationsHistoryTable';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { listEvaluationHistoryAction } from '@/server/actions/evaluation-history';
import { listDepartments } from '@/server/services/departments';

type HistoricoPageProps = {
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
    const currentValue = Array.isArray(value) ? value[0] : value;
    if (currentValue && key !== 'page') {
      nextParams.set(key, currentValue);
    }
  }

  nextParams.set('page', String(page));
  return `/historico?${nextParams.toString()}`;
}

export default async function HistoricoPage({ searchParams }: HistoricoPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'RH' || user.role === 'ADMIN') {
    redirect('/rh/historico');
  }

  const params = await searchParams;
  const [history, departments] = await Promise.all([
    listEvaluationHistoryAction({
      employeeId: getParam(params, 'employeeId'),
      employeeSearch: getParam(params, 'employeeSearch'),
      dateFrom: getParam(params, 'dateFrom'),
      dateTo: getParam(params, 'dateTo'),
      departmentId: getParam(params, 'departmentId'),
      page: getParam(params, 'page'),
    }),
    listDepartments(true),
  ]);

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader title="Histórico" description="Consulte avaliações realizadas por você." />

        <EvaluationHistoryFilters
          departments={departments}
          defaultValues={{
            employeeId: getParam(params, 'employeeId'),
            employeeSearch: getParam(params, 'employeeSearch'),
            dateFrom: getParam(params, 'dateFrom'),
            dateTo: getParam(params, 'dateTo'),
            departmentId: getParam(params, 'departmentId'),
          }}
        />

        <EvaluationsHistoryTable evaluations={history.items} />

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Página {history.page} de {history.totalPages} - {history.total} avaliação(ões)
          </span>
          <div className="flex gap-2">
            <Link
              href={buildPageHref(params, Math.max(history.page - 1, 1))}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              aria-disabled={history.page <= 1}
            >
              Anterior
            </Link>
            <Link
              href={buildPageHref(params, Math.min(history.page + 1, history.totalPages))}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              aria-disabled={history.page >= history.totalPages}
            >
              Próxima
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
