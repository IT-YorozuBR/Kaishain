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
import { listEvaluationManagersForUser } from '@/server/services/employees';

type RhHistoricoPageProps = {
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
  return `/rh/historico?${nextParams.toString()}`;
}

export default async function RhHistoricoPage({ searchParams }: RhHistoricoPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/historico');
  }

  const params = await searchParams;
  const [history, evaluators, departments] = await Promise.all([
    listEvaluationHistoryAction({
      employeeId: getParam(params, 'employeeId'),
      employeeSearch: getParam(params, 'employeeSearch'),
      evaluatorId: getParam(params, 'evaluatorId'),
      dateFrom: getParam(params, 'dateFrom'),
      dateTo: getParam(params, 'dateTo'),
      departmentId: getParam(params, 'departmentId'),
      page: getParam(params, 'page'),
    }),
    listEvaluationManagersForUser(user),
    listDepartments(true),
  ]);

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="Histórico de avaliações"
          description="Consulte avaliações de todos os gestores."
        />

        <EvaluationHistoryFilters
          evaluators={evaluators}
          departments={departments}
          defaultValues={{
            employeeId: getParam(params, 'employeeId'),
            employeeSearch: getParam(params, 'employeeSearch'),
            evaluatorId: getParam(params, 'evaluatorId'),
            dateFrom: getParam(params, 'dateFrom'),
            dateTo: getParam(params, 'dateTo'),
            departmentId: getParam(params, 'departmentId'),
          }}
        />

        <EvaluationsHistoryTable evaluations={history.items} showEvaluator />

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
