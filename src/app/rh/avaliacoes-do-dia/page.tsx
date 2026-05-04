import { CalendarDays, CheckCircle2, CircleAlert, Clock, Percent, Users } from 'lucide-react';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { formatSaoPauloDisplayDate, getSaoPauloTodayDateString } from '@/lib/date';
import { getDailyEvaluationStatus, type ManagerDailyStatus } from '@/server/services/evaluations';

function ManagerProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PendingManagerCard({ m }: { m: ManagerDailyStatus }) {
  return (
    <Card className="shadow-none">
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="grid gap-0.5">
            <div className="flex items-center gap-2">
              <CircleAlert className="size-4 shrink-0 text-amber-500" />
              <CardTitle className="text-base">{m.manager.name}</CardTitle>
            </div>
            <CardDescription>
              {m.total} funcionário{m.total !== 1 ? 's' : ''} no time
            </CardDescription>
          </div>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-sm font-semibold text-amber-700">
            {m.pct}%
          </span>
        </div>
        <ManagerProgressBar pct={m.pct} />
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-emerald-500" />
            {m.done} realizad{m.done !== 1 ? 'as' : 'a'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-amber-400" />
            {m.pending} pendente{m.pending !== 1 ? 's' : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AvaliacoesDoDiaPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const today = getSaoPauloTodayDateString();
  const status = await getDailyEvaluationStatus(today);

  const pendingManagers = status.managers.filter((m) => m.pct < 100);
  const doneManagers = status.managers.filter((m) => m.pct === 100);

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

        {/* Stat cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total', value: status.totalEmployees, icon: Users, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Realizadas', value: status.totalDone, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Pendentes', value: status.totalPending, icon: CircleAlert, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Concluído', value: `${status.pct}%`, icon: Percent, color: 'text-purple-700', bg: 'bg-purple-50' },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label}>
                <CardContent className="flex items-center justify-between">
                  <div className="grid gap-1">
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                    <span className="text-2xl font-semibold">{metric.value}</span>
                  </div>
                  <div className={`grid size-10 place-items-center rounded-lg ${metric.bg} ${metric.color}`}>
                    <Icon className="size-5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {status.totalEmployees === 0 ? (
          <EmptyState
            title="Nenhum funcionario com gestor"
            description="Nao ha funcionarios ativos vinculados a um gestor para acompanhar."
          />
        ) : (
          <>
            {/* Overall progress bar */}
            <section className="grid gap-3 rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progresso geral</span>
                <span className="text-sm text-muted-foreground">
                  {status.totalDone} de {status.totalEmployees} funcionários avaliados
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${status.pct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" />
                  Realizadas: {status.totalDone}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-muted-foreground/30" />
                  Pendentes: {status.totalPending}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-blue-400" />
                  Gestores ativos: {status.managers.length}
                </span>
              </div>
            </section>

            {/* Pending managers */}
            {pendingManagers.length > 0 ? (
              <section className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-500" />
                  <h2 className="font-semibold text-foreground">
                    Gestores com pendências
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {pendingManagers.length}
                    </span>
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pendingManagers.map((m) => (
                    <PendingManagerCard key={m.manager.id} m={m} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* Done managers */}
            {doneManagers.length > 0 ? (
              <section className="grid gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <h2 className="font-semibold text-foreground">
                    Gestores concluídos
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {doneManagers.length}
                    </span>
                  </h2>
                </div>
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  {doneManagers.map((m, i) => (
                    <div
                      key={m.manager.id}
                      className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                        i < doneManagers.length - 1 ? 'border-b' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                        <span className="truncate font-medium text-sm">{m.manager.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                        <span>{m.total} avaliação{m.total !== 1 ? 'ões' : ''}</span>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          100%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
