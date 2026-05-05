import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock,
  Percent,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { formatSaoPauloDisplayDate, getSaoPauloTodayDateString } from '@/lib/date';
import { NotFoundError } from '@/lib/errors';
import { dailyEvaluationStatusFiltersSchema } from '@/lib/validators/evaluation-status';
import {
  getDailyEvaluationStatus,
  getManagerDailyEvaluationDetails,
  type ManagerDailyEvaluationDetails,
  type ManagerDailyStatus,
} from '@/server/services/evaluations';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ManagerProgressBar({ pct }: { pct: number }) {
  return (
    <div className="bg-muted h-2 overflow-hidden rounded-full">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ManagerCard({ manager, selected }: { manager: ManagerDailyStatus; selected: boolean }) {
  const isDone = manager.pct === 100;
  const Icon = isDone ? CheckCircle2 : CircleAlert;

  return (
    <Link
      href={`/rh/avaliacoes-do-dia?gestorId=${manager.manager.id}#funcionarios-do-gestor`}
      className="group focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <Card
        className={`group-hover:border-primary/50 h-full shadow-none transition group-hover:shadow-sm ${
          selected ? 'border-primary bg-primary/5' : ''
        }`}
      >
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="grid gap-0.5">
              <div className="flex items-center gap-2">
                <Icon
                  className={`size-4 shrink-0 ${isDone ? 'text-emerald-500' : 'text-amber-500'}`}
                />
                <CardTitle className="text-base">{manager.manager.name}</CardTitle>
              </div>
              <CardDescription>
                {manager.total} funcionário{manager.total !== 1 ? 's' : ''} no time
              </CardDescription>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-sm font-semibold ${
                isDone ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {manager.pct}%
            </span>
          </div>
          <ManagerProgressBar pct={manager.pct} />
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                {manager.done} realizada{manager.done !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-amber-400" />
                {manager.pending} pendente{manager.pending !== 1 ? 's' : ''}
              </span>
            </div>
            <ArrowRight className="size-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatEmployeeMeta(employee: { position: string | null; department: string | null }) {
  const parts = [employee.position, employee.department].filter(Boolean);
  return parts.length > 0 ? parts.join(' - ') : 'Sem cargo/departamento';
}

function ManagerDetailsPanel({ details }: { details: ManagerDailyEvaluationDetails }) {
  return (
    <section
      id="funcionarios-do-gestor"
      className="bg-card grid scroll-mt-6 gap-4 rounded-xl border p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Detalhe do gestor</h2>
          <p className="text-muted-foreground text-sm">
            {details.manager.name} - {details.done} de {details.total} funcionários avaliados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
            {details.done} realizadas
          </Badge>
          <Badge variant="secondary" className="bg-amber-50 text-amber-700">
            {details.pending} pendentes
          </Badge>
        </div>
      </div>

      <ManagerProgressBar pct={details.pct} />

      {details.total === 0 ? (
        <EmptyState
          title="Nenhum funcionário neste time"
          description="Este gestor não possui funcionários ativos vinculados."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <h3 className="font-semibold">Avaliados</h3>
            </div>
            {details.evaluated.length > 0 ? (
              <div className="bg-background overflow-hidden rounded-xl border">
                {details.evaluated.map((item, index) => (
                  <Link
                    key={item.evaluation.id}
                    href={`/historico/${item.evaluation.id}`}
                    className={`hover:bg-muted/60 flex items-center justify-between gap-4 px-4 py-3 transition ${
                      index < details.evaluated.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{item.employee.name}</div>
                      <div className="text-muted-foreground truncate text-xs">
                        {formatEmployeeMeta(item.employee)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                        Nota {item.evaluation.score}
                      </Badge>
                      <ArrowRight className="text-muted-foreground size-4" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
                Nenhuma avaliação realizada para este gestor hoje.
              </div>
            )}
          </div>

          <div className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <CircleAlert className="size-4 text-amber-500" />
              <h3 className="font-semibold">Pendentes</h3>
            </div>
            {details.pendingEmployees.length > 0 ? (
              <div className="bg-background overflow-hidden rounded-xl border">
                {details.pendingEmployees.map((employee, index) => (
                  <div
                    key={employee.id}
                    className={`flex items-center justify-between gap-4 px-4 py-3 ${
                      index < details.pendingEmployees.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{employee.name}</div>
                      <div className="text-muted-foreground truncate text-xs">
                        {formatEmployeeMeta(employee)}
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                      Pendente
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
                Todos os funcionários deste gestor foram avaliados hoje.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default async function AvaliacoesDoDiaPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const rawSearchParams = searchParams ? await searchParams : {};
  const parsedFilters = dailyEvaluationStatusFiltersSchema.safeParse({
    gestorId: readSingleParam(rawSearchParams.gestorId),
  });
  const selectedManagerId = parsedFilters.success ? parsedFilters.data.gestorId : undefined;
  const invalidSelection = !parsedFilters.success;

  const today = getSaoPauloTodayDateString();
  const status = await getDailyEvaluationStatus(today);

  let selectedManagerDetails: ManagerDailyEvaluationDetails | null = null;
  let selectionError: string | null = invalidSelection ? 'Gestor inválido.' : null;

  if (selectedManagerId) {
    try {
      selectedManagerDetails = await getManagerDailyEvaluationDetails(
        user,
        selectedManagerId,
        today,
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        selectionError = error.message;
      } else {
        throw error;
      }
    }
  }

  const pendingManagers = status.managers.filter((manager) => manager.pct < 100);
  const doneManagers = status.managers.filter((manager) => manager.pct === 100);

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="Avaliações do dia"
          description="Acompanhe em tempo real quantas avaliações já foram realizadas e quais ainda estão pendentes."
          meta={
            <Badge variant="secondary" className="w-fit">
              <CalendarDays className="size-3" />
              {formatSaoPauloDisplayDate(today)}
            </Badge>
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total',
              value: status.totalEmployees,
              icon: Users,
              color: 'text-blue-700',
              bg: 'bg-blue-50',
            },
            {
              label: 'Realizadas',
              value: status.totalDone,
              icon: CheckCircle2,
              color: 'text-emerald-700',
              bg: 'bg-emerald-50',
            },
            {
              label: 'Pendentes',
              value: status.totalPending,
              icon: CircleAlert,
              color: 'text-amber-700',
              bg: 'bg-amber-50',
            },
            {
              label: 'Concluído',
              value: `${status.pct}%`,
              icon: Percent,
              color: 'text-purple-700',
              bg: 'bg-purple-50',
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label}>
                <CardContent className="flex items-center justify-between">
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm">{metric.label}</span>
                    <span className="text-2xl font-semibold">{metric.value}</span>
                  </div>
                  <div
                    className={`grid size-10 place-items-center rounded-lg ${metric.bg} ${metric.color}`}
                  >
                    <Icon className="size-5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {status.totalEmployees === 0 ? (
          <EmptyState
            title="Nenhum funcionário com gestor"
            description="Não há funcionários ativos vinculados a um gestor para acompanhar."
          />
        ) : (
          <>
            <section className="bg-card grid gap-3 rounded-xl border p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">Progresso geral</span>
                <span className="text-muted-foreground text-sm">
                  {status.totalDone} de {status.totalEmployees} funcionários avaliados
                </span>
              </div>
              <div className="bg-muted h-3 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${status.pct}%` }}
                />
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-5 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" />
                  Realizadas: {status.totalDone}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="bg-muted-foreground/30 inline-block size-2 rounded-full" />
                  Pendentes: {status.totalPending}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-blue-400" />
                  Gestores ativos: {status.managers.length}
                </span>
              </div>
            </section>

            {pendingManagers.length > 0 ? (
              <section className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-500" />
                  <h2 className="text-foreground font-semibold">
                    Gestores com pendências
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {pendingManagers.length}
                    </span>
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pendingManagers.map((manager) => (
                    <ManagerCard
                      key={manager.manager.id}
                      manager={manager}
                      selected={manager.manager.id === selectedManagerId}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {doneManagers.length > 0 ? (
              <section className="grid gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <h2 className="text-foreground font-semibold">
                    Gestores concluidos
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {doneManagers.length}
                    </span>
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {doneManagers.map((manager) => (
                    <ManagerCard
                      key={manager.manager.id}
                      manager={manager}
                      selected={manager.manager.id === selectedManagerId}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {selectedManagerDetails ? (
              <ManagerDetailsPanel details={selectedManagerDetails} />
            ) : (
              <section className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
                {selectionError ??
                  'Selecione um gestor para ver os funcionários avaliados e pendentes.'}
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
