import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Percent,
  Search,
  Users,
} from 'lucide-react';

import { getCurrentUser } from '@/lib/auth';
import { formatSaoPauloDisplayDate, getSaoPauloTodayDateString } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { evaluationDashboardFiltersSchema } from '@/lib/validators/evaluation-dashboard';
import { getEvaluationDashboard } from '@/server/services/evaluations';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type DashboardItem = Awaited<ReturnType<typeof getEvaluationDashboard>>[number];

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function matchesSearch(dashboardItem: DashboardItem, search: string) {
  const term = search.toLowerCase();
  const fields = [
    dashboardItem.employee.name,
    dashboardItem.employee.email,
    dashboardItem.employee.registration,
    dashboardItem.employee.position,
    dashboardItem.employee.department,
  ];

  return fields.some((field) => field?.toLowerCase().includes(term));
}

function sortDashboardItems(items: DashboardItem[]) {
  return [...items].sort((a, b) => {
    const aEvaluated = Boolean(a.evaluation);
    const bEvaluated = Boolean(b.evaluation);

    if (aEvaluated !== bEvaluated) {
      return aEvaluated ? 1 : -1;
    }

    return a.employee.name.localeCompare(b.employee.name);
  });
}

function buildPaginationHref({
  search,
  page,
  pageSize,
}: {
  search?: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();

  if (search) {
    params.set('search', search);
  }

  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  return `/avaliar?${params.toString()}`;
}

export default async function AvaliarPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const rawSearchParams = searchParams ? await searchParams : {};
  const parsedFilters = evaluationDashboardFiltersSchema.safeParse({
    search: readSingleParam(rawSearchParams.search),
    page: readSingleParam(rawSearchParams.page),
    pageSize: readSingleParam(rawSearchParams.pageSize),
  });
  const search = parsedFilters.success ? parsedFilters.data.search : undefined;
  const requestedPage = parsedFilters.success ? parsedFilters.data.page : 1;
  const pageSize = parsedFilters.success ? parsedFilters.data.pageSize : 20;

  const today = getSaoPauloTodayDateString();
  const dashboard = await getEvaluationDashboard(user, today);
  const filteredDashboard = search
    ? dashboard.filter((dashboardItem) => matchesSearch(dashboardItem, search))
    : dashboard;
  const sortedDashboard = sortDashboardItems(filteredDashboard);
  const totalFilteredItems = sortedDashboard.length;
  const totalPages = Math.max(Math.ceil(totalFilteredItems / pageSize), 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const pageOffset = (currentPage - 1) * pageSize;
  const paginatedDashboard = sortedDashboard.slice(pageOffset, pageOffset + pageSize);
  const displayStart = totalFilteredItems > 0 ? pageOffset + 1 : 0;
  const displayEnd = Math.min(pageOffset + paginatedDashboard.length, totalFilteredItems);
  const evaluatedCount = dashboard.filter(({ evaluation }) => Boolean(evaluation)).length;
  const pendingCount = dashboard.length - evaluatedCount;
  const completionRate =
    dashboard.length > 0 ? Math.round((evaluatedCount / dashboard.length) * 100) : 0;

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="Avaliar funcionários"
          description={`Avaliações de hoje em America/Sao_Paulo: ${formatSaoPauloDisplayDate(today)}.`}
          meta={
            <Badge variant="secondary" className="w-fit">
              <CalendarDays className="size-3" />
              {dashboard.length} liderado(s)
            </Badge>
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total', value: dashboard.length, icon: Users },
            { label: 'Avaliados', value: evaluatedCount, icon: CheckCircle2 },
            { label: 'Pendentes', value: pendingCount, icon: CircleAlert },
            { label: 'Concluído', value: `${completionRate}%`, icon: Percent },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label}>
                <CardContent className="flex items-center justify-between">
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm">{metric.label}</span>
                    <span className="text-2xl font-semibold">{metric.value}</span>
                  </div>
                  <div className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Icon className="size-5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <form
          action="/avaliar"
          method="get"
          className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4 shadow-sm"
        >
          <div className="grid flex-1 gap-1 sm:max-w-sm">
            <Label htmlFor="search">Buscar funcionário</Label>
            <input type="hidden" name="page" value="1" />
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                id="search"
                name="search"
                placeholder="Nome, matrícula, cargo ou setor"
                defaultValue={search ?? ''}
                className="pl-8"
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="pageSize">Por página</Label>
            <select
              id="pageSize"
              name="pageSize"
              defaultValue={String(pageSize)}
              className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
            >
              {[10, 20, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Buscar</Button>
          {search ? (
            <Link href="/avaliar" className={buttonVariants({ variant: 'outline' })}>
              Limpar
            </Link>
          ) : null}
          <span className="text-muted-foreground text-sm">
            {filteredDashboard.length} de {dashboard.length} funcionário
            {dashboard.length !== 1 ? 's' : ''}
          </span>
        </form>

        {dashboard.length === 0 ? (
          <EmptyState
            title="Nenhum funcionário encontrado"
            description="Não há funcionários ativos associados ao seu usuário para avaliação."
          />
        ) : filteredDashboard.length === 0 ? (
          <EmptyState
            title="Nenhum resultado encontrado"
            description="Ajuste a busca para localizar um funcionário da sua equipe."
          />
        ) : (
          <section className="bg-card grid gap-3 rounded-xl border p-4 shadow-sm">
            <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>
                Exibindo {displayStart}-{displayEnd} de {totalFilteredItems} funcionário
                {totalFilteredItems !== 1 ? 's' : ''}
              </span>
              <span>
                Página {currentPage} de {totalPages}
              </span>
            </div>

            {paginatedDashboard.map(({ employee, evaluation }) => (
              <Card key={employee.id} className="shadow-none">
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{employee.name}</CardTitle>
                      <StatusBadge status={evaluation ? 'success' : 'pending'}>
                        {evaluation ? 'Avaliado' : 'Pendente'}
                      </StatusBadge>
                    </div>
                    <CardDescription>
                      {[employee.position, employee.department].filter(Boolean).join(' - ') ||
                        'Cargo não informado'}
                    </CardDescription>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {evaluation ? `Nota atual: ${evaluation.score}` : 'Sem nota registrada hoje.'}
                  </div>
                  <Link
                    href={`/avaliar/${employee.id}`}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    {evaluation ? 'Ver avaliação' : 'Avaliar'}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </CardContent>
              </Card>
            ))}

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                {currentPage > 1 ? (
                  <Link
                    href={buildPaginationHref({
                      search,
                      page: currentPage - 1,
                      pageSize,
                    })}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    Anterior
                  </Link>
                ) : (
                  <span
                    className={buttonVariants({ variant: 'outline', className: 'opacity-50' })}
                    aria-disabled="true"
                  >
                    Anterior
                  </span>
                )}

                <span className="text-muted-foreground text-sm">
                  Página {currentPage} de {totalPages}
                </span>

                {currentPage < totalPages ? (
                  <Link
                    href={buildPaginationHref({
                      search,
                      page: currentPage + 1,
                      pageSize,
                    })}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    Próxima
                  </Link>
                ) : (
                  <span
                    className={buttonVariants({ variant: 'outline', className: 'opacity-50' })}
                    aria-disabled="true"
                  >
                    Próxima
                  </span>
                )}
              </div>
            ) : null}
          </section>
        )}
      </div>
    </AppShell>
  );
}
