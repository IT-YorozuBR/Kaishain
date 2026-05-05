import { notFound, redirect } from 'next/navigation';
import { Check, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { NotFoundError, UnauthorizedError } from '@/lib/errors';
import { getEvaluationDetail } from '@/server/services/evaluations';

type HistoricoDetalhePageProps = {
  params: Promise<{ evaluationId: string }>;
};

export default async function HistoricoDetalhePage({ params }: HistoricoDetalhePageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { evaluationId } = await params;

  let evaluation: Awaited<ReturnType<typeof getEvaluationDetail>>;
  try {
    evaluation = await getEvaluationDetail(user, evaluationId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    if (error instanceof UnauthorizedError) {
      redirect('/historico');
    }

    throw error;
  }

  return (
    <AppShell>
      <div className="grid max-w-3xl gap-6">
        <PageHeader
          title="Detalhe da avaliação"
          description={`${evaluation.employee.name} em ${formatSaoPauloDisplayDate(evaluation.evaluationDate)}`}
          meta={<Badge variant="outline">{evaluation.score}/10</Badge>}
        />

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">Funcionário</span>
              <span>{evaluation.employee.name}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">Avaliador</span>
              <span>{evaluation.evaluator.name}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">Cargo</span>
              <span>{evaluation.employee.position ?? '-'}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">Departamento</span>
              <span>{evaluation.employee.department ?? '-'}</span>
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Observação</span>
              <p className="whitespace-pre-wrap text-sm">{evaluation.note ?? '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluation.checklistResults.map((result) => (
                    <TableRow key={result.checklistItemId}>
                      <TableCell>
                        <div className="grid gap-0.5">
                          <span className="font-medium">{result.label}</span>
                          {result.description ? (
                            <span className="text-xs text-muted-foreground">
                              {result.description}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.checked ? (
                          <Badge variant="outline">
                            <Check className="size-3" />
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="size-3" />
                            Não
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
