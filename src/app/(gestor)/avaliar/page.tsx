import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, Percent, Users } from 'lucide-react';

import { getCurrentUser } from '@/lib/auth';
import { formatSaoPauloDisplayDate, getSaoPauloTodayDateString } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { getEvaluationDashboard } from '@/server/services/evaluations';

export default async function AvaliarPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const today = getSaoPauloTodayDateString();
  const dashboard = await getEvaluationDashboard(user, today);
  const evaluatedCount = dashboard.filter(({ evaluation }) => Boolean(evaluation)).length;
  const pendingCount = dashboard.length - evaluatedCount;
  const completionRate =
    dashboard.length > 0 ? Math.round((evaluatedCount / dashboard.length) * 100) : 0;

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="Avaliar funcionarios"
          description={`Avaliacoes de hoje em America/Sao_Paulo: ${formatSaoPauloDisplayDate(today)}.`}
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
            { label: 'Concluido', value: `${completionRate}%`, icon: Percent },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label}>
                <CardContent className="flex items-center justify-between">
                  <div className="grid gap-1">
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
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

        {dashboard.length === 0 ? (
          <EmptyState
            title="Nenhum funcionario encontrado"
            description="Nao ha funcionarios ativos associados ao seu usuario para avaliacao."
          />
        ) : (
          <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
            {dashboard.map(({ employee, evaluation }) => (
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
                        'Cargo nao informado'}
                    </CardDescription>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {evaluation ? `Nota atual: ${evaluation.score}` : 'Sem nota registrada hoje.'}
                  </div>
                  <Link
                    href={`/avaliar/${employee.id}`}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    {evaluation ? 'Ver avaliacao' : 'Avaliar'}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
