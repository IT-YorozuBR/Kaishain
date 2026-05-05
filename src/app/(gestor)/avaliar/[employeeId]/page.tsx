import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { getCurrentUser } from '@/lib/auth';
import { formatSaoPauloDisplayDate, getSaoPauloTodayDateString } from '@/lib/date';
import { buttonVariants } from '@/components/ui/button';
import { EvaluationForm } from '@/components/forms/EvaluationForm';
import { AppShell } from '@/components/layout/AppShell';
import { FormCard } from '@/components/layout/FormCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/layout/StatusBadge';
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
    <AppShell>
      <div className="grid max-w-3xl gap-6">
        <Link href="/avaliar" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeft data-icon="inline-start" />
          Voltar
        </Link>

        <PageHeader
          title={employee.name}
          description={`Avaliação de ${formatSaoPauloDisplayDate(today)}. Pode ser editada até 23:59 em America/Sao_Paulo.`}
          meta={
            evaluation ? (
              <StatusBadge status="success">Avaliação existente</StatusBadge>
            ) : (
              <StatusBadge status="pending">Pendente</StatusBadge>
            )
          }
        />

        <FormCard
          title="Avaliação diária"
          description="Preencha o checklist, informe a nota de 0 a 10 e registre uma observação se necessário."
        >
            <EvaluationForm
              employeeId={employee.id}
              initialScore={evaluation?.score ?? 0}
              initialNote={evaluation?.note}
              checklistItems={checklistItems}
              checklistResults={evaluation?.checklistResults ?? []}
            />
        </FormCard>
      </div>
    </AppShell>
  );
}
