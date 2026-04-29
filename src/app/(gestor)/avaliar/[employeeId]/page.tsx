import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { getCurrentUser } from '@/lib/auth';
import { formatSaoPauloDisplayDate, getSaoPauloTodayDateString } from '@/lib/date';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EvaluationForm } from '@/components/forms/EvaluationForm';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';
import { getEvaluationFormData } from '@/server/services/evaluations';

type AvaliarFuncionarioPageProps = {
  params: Promise<{
    employeeId: string;
  }>;
};

export default async function AvaliarFuncionarioPage({ params }: AvaliarFuncionarioPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { employeeId } = await params;
  const today = getSaoPauloTodayDateString();
  let formData: Awaited<ReturnType<typeof getEvaluationFormData>>;

  try {
    formData = await getEvaluationFormData(user, employeeId, today);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    if (error instanceof UnauthorizedError) {
      redirect('/avaliar');
    }

    throw error;
  }

  const { employee, checklistItems, evaluation } = formData;

  return (
    <main className="bg-background min-h-dvh px-4 py-8">
      <div className="mx-auto grid w-full max-w-3xl gap-6">
        <Link href="/avaliar" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeft data-icon="inline-start" />
          Voltar
        </Link>

        <header className="grid gap-2 border-b pb-6">
          <h1 className="text-2xl font-semibold tracking-normal">{employee.name}</h1>
          <p className="text-muted-foreground text-sm">
            Avaliacao de {formatSaoPauloDisplayDate(today)}. Pode ser editada ate 23:59 em
            America/Sao_Paulo.
          </p>
        </header>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Avaliacao diaria</CardTitle>
            <CardDescription>
              Preencha o checklist, informe a nota de 0 a 10 e registre uma observacao se
              necessario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EvaluationForm
              employeeId={employee.id}
              initialScore={evaluation?.score ?? 0}
              initialNote={evaluation?.note}
              checklistItems={checklistItems}
              checklistResults={evaluation?.checklistResults ?? []}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
