import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarDays } from 'lucide-react';

import { getCurrentUser } from '@/lib/auth';
import { formatSaoPauloDisplayDate, getSaoPauloTodayDateString } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getEvaluationDashboard } from '@/server/services/evaluations';

export default async function AvaliarPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const today = getSaoPauloTodayDateString();
  const dashboard = await getEvaluationDashboard(user, today);

  return (
    <main className="bg-background min-h-dvh px-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-normal">Avaliar funcionarios</h1>
            <p className="text-muted-foreground text-sm">
              Avaliacoes de hoje em America/Sao_Paulo: {formatSaoPauloDisplayDate(today)}.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            <CalendarDays className="size-3" />
            {dashboard.length} liderado(s)
          </Badge>
        </header>

        {dashboard.length === 0 ? (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Nenhum funcionario encontrado</CardTitle>
              <CardDescription>
                Nao ha funcionarios ativos associados ao seu usuario para avaliacao.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {dashboard.map(({ employee, evaluation }) => (
              <Card key={employee.id} className="rounded-lg">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <CardTitle>{employee.name}</CardTitle>
                      <CardDescription>
                        {[employee.position, employee.department].filter(Boolean).join(' - ') ||
                          'Cargo nao informado'}
                      </CardDescription>
                    </div>
                    <Badge variant={evaluation ? 'default' : 'secondary'}>
                      {evaluation ? 'Avaliado' : 'Pendente'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="text-muted-foreground text-sm">
                    {evaluation ? `Nota atual: ${evaluation.score}` : 'Sem nota registrada hoje.'}
                  </div>
                  <Link
                    href={`/avaliar/${employee.id}`}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    {evaluation ? 'Editar' : 'Avaliar'}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
