import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ListChecks,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCurrentUser } from '@/lib/auth';
import { formatSaoPauloDisplayDate } from '@/lib/date';
import { NotFoundError, ValidationError } from '@/lib/errors';
import {
  employeeEvaluationDashboardFiltersSchema,
  employeeEvaluationDashboardParamsSchema,
} from '@/lib/validators/employee-evaluation-dashboard';
import { cn } from '@/lib/utils';
import { getEmployeeEvaluationDashboard } from '@/server/services/evaluations';

type PageProps = {
  params: Promise<{ employeeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildPageHref({
  employeeId,
  dateFrom,
  dateTo,
  page,
  pageSize,
}: {
  employeeId: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();

  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  return `/rh/funcionarios/${employeeId}/dashboard?${params.toString()}`;
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof Star;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="grid gap-1">
          <span className="text-muted-foreground text-sm">{label}</span>
          <span className="text-2xl font-semibold">{value}</span>
          <span className="text-muted-foreground text-xs">{description}</span>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function getScoreBadgeStatus(score: number) {
  if (score <= 4) return 'danger';
  if (score <= 6) return 'pending';
  return 'success';
}

export default async function EmployeeDashboardPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const rawParams = await params;
  const parsedParams = employeeEvaluationDashboardParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    throw new ValidationError('Funcionário inválido.');
  }

  const rawSearchParams = searchParams ? await searchParams : {};
  const parsedFilters = employeeEvaluationDashboardFiltersSchema.safeParse({
    dateFrom: readSingleParam(rawSearchParams.dateFrom),
    dateTo: readSingleParam(rawSearchParams.dateTo),
    page: readSingleParam(rawSearchParams.page),
    pageSize: readSingleParam(rawSearchParams.pageSize),
  });

  if (!parsedFilters.success) {
    throw new ValidationError('Filtros inválidos.');
  }

  let dashboard;
  try {
    dashboard = await getEmployeeEvaluationDashboard(
      user,
      parsedParams.data.employeeId,
      parsedFilters.data,
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <AppShell>
          <EmptyState
            title="Funcionário não encontrado"
            description="Não foi possível localizar o cadastro solicitado."
          />
        </AppShell>
      );
    }

    throw error;
  }

  const { employee, metrics, history } = dashboard;
  const page = Math.min(history.page, history.totalPages);

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title={`Dashboard - ${employee.name}`}
          description="Acompanhe desempenho, notas e checklist do funcionário."
          actions={
            <Link href="/funcionarios" className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft />
              Voltar
            </Link>
          }
          meta={
            <Badge variant="secondary" className="w-fit">
              {employee.department ?? 'Sem setor'}
            </Badge>
          }
        />

        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1">
              <span className="text-muted-foreground text-sm">Cargo</span>
              <span className="font-medium">{employee.position ?? '-'}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-sm">Gestor</span>
              <span className="font-medium">{employee.manager?.name ?? '-'}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-sm">Matrícula</span>
              <span className="font-medium">{employee.registration ?? '-'}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-sm">Status</span>
              <span>
                {employee.active ? (
                  <StatusBadge status="active">Ativo</StatusBadge>
                ) : (
                  <StatusBadge status="inactive">Inativo</StatusBadge>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <form
          action={`/rh/funcionarios/${employee.id}/dashboard`}
          method="get"
          className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4 shadow-sm"
        >
          <input type="hidden" name="page" value="1" />
          <div className="grid gap-1">
            <Label htmlFor="dateFrom">De</Label>
            <Input
              id="dateFrom"
              name="dateFrom"
              type="date"
              defaultValue={parsedFilters.data.dateFrom}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="dateTo">Até</Label>
            <Input id="dateTo" name="dateTo" type="date" defaultValue={parsedFilters.data.dateTo} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="pageSize">Por página</Label>
            <select
              id="pageSize"
              name="pageSize"
              defaultValue={String(parsedFilters.data.pageSize)}
              className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
            >
              {[10, 20, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <button className={buttonVariants()} type="submit">
            Filtrar
          </button>
          <Link
            href={`/rh/funcionarios/${employee.id}/dashboard`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Limpar
          </Link>
        </form>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Nota média"
            value={metrics.averageScore ?? '-'}
            description={`${metrics.totalEvaluations} avaliação(ões)`}
            icon={Star}
          />
          <MetricCard
            label="Maior nota"
            value={metrics.highestScore ?? '-'}
            description="Melhor resultado no período"
            icon={TrendingUp}
          />
          <MetricCard
            label="Menor nota"
            value={metrics.lowestScore ?? '-'}
            description="Ponto de atenção no período"
            icon={TrendingDown}
          />
          <MetricCard
            label="Última nota"
            value={metrics.lastEvaluation?.score ?? '-'}
            description={
              metrics.lastEvaluation
                ? formatSaoPauloDisplayDate(metrics.lastEvaluation.evaluationDate)
                : 'Sem avaliação'
            }
            icon={CalendarDays}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="size-4" />
                Distribuição de notas
              </CardTitle>
              <CardDescription>Quantidade de avaliações por faixa.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                { label: 'Crítico (0-4)', value: metrics.scoreBuckets.critical, status: 'danger' },
                {
                  label: 'Atenção (5-6)',
                  value: metrics.scoreBuckets.attention,
                  status: 'pending',
                },
                { label: 'Bom (7-8)', value: metrics.scoreBuckets.good, status: 'success' },
                {
                  label: 'Excelente (9-10)',
                  value: metrics.scoreBuckets.excellent,
                  status: 'success',
                },
              ].map((bucket) => (
                <div key={bucket.label} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground text-sm">{bucket.label}</span>
                  <StatusBadge status={bucket.status as 'danger' | 'pending' | 'success'}>
                    {bucket.value}
                  </StatusBadge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="size-4" />
                Checklist
              </CardTitle>
              <CardDescription>Itens com menor cumprimento aparecem primeiro.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.checklistStats.length === 0 ? (
                <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
                  Nenhum checklist encontrado no período.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Cumprimento</TableHead>
                        <TableHead>Falhas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard.checklistStats.map((item) => (
                        <TableRow key={item.checklistItemId}>
                          <TableCell className="font-medium">{item.label}</TableCell>
                          <TableCell>{item.pct}%</TableCell>
                          <TableCell>{item.unchecked}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              Histórico de avaliações
            </CardTitle>
            <CardDescription>
              Página {page} de {history.totalPages} - {history.total} avaliação(ões)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.items.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
                Nenhuma avaliação encontrada no período.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Avaliador</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.items.map((evaluation) => (
                      <TableRow key={evaluation.id}>
                        <TableCell>
                          {formatSaoPauloDisplayDate(evaluation.evaluationDate)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={getScoreBadgeStatus(evaluation.score)}>
                            {evaluation.score}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>{evaluation.evaluator.name}</TableCell>
                        <TableCell className="max-w-[320px] truncate">
                          {evaluation.note ?? '-'}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/historico/${evaluation.id}`}
                            className={buttonVariants({ variant: 'outline', size: 'sm' })}
                          >
                            Ver detalhe
                            <ArrowRight />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={buildPageHref({
                  employeeId: employee.id,
                  dateFrom: parsedFilters.data.dateFrom,
                  dateTo: parsedFilters.data.dateTo,
                  page: Math.max(page - 1, 1),
                  pageSize: parsedFilters.data.pageSize,
                })}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  page <= 1 && 'pointer-events-none opacity-50',
                )}
                aria-disabled={page <= 1}
              >
                Anterior
              </Link>
              <span className="text-muted-foreground text-sm">
                Média calculada sobre o período filtrado.
              </span>
              <Link
                href={buildPageHref({
                  employeeId: employee.id,
                  dateFrom: parsedFilters.data.dateFrom,
                  dateTo: parsedFilters.data.dateTo,
                  page: Math.min(page + 1, history.totalPages),
                  pageSize: parsedFilters.data.pageSize,
                })}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  page >= history.totalPages && 'pointer-events-none opacity-50',
                )}
                aria-disabled={page >= history.totalPages}
              >
                Próxima
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
