import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatSaoPauloDisplayDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { EvaluationHistoryItem } from '@/server/services/evaluations';

type EvaluationsHistoryTableProps = {
  evaluations: EvaluationHistoryItem[];
  showEvaluator?: boolean;
};

export function EvaluationsHistoryTable({
  evaluations,
  showEvaluator = false,
}: EvaluationsHistoryTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionario</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Nota</TableHead>
            {showEvaluator ? <TableHead>Avaliador</TableHead> : null}
            <TableHead>Observacao</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {evaluations.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showEvaluator ? 6 : 5}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhuma avaliacao encontrada.
              </TableCell>
            </TableRow>
          ) : (
            evaluations.map((evaluation) => (
              <TableRow key={evaluation.id}>
                <TableCell>
                  <div className="grid gap-0.5">
                    <span className="font-medium">{evaluation.employee.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {evaluation.employee.position ?? '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatSaoPauloDisplayDate(evaluation.evaluationDate)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{evaluation.score}/10</Badge>
                </TableCell>
                {showEvaluator ? <TableCell>{evaluation.evaluator.name}</TableCell> : null}
                <TableCell className="max-w-80 truncate">{evaluation.note ?? '-'}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/historico/${evaluation.id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    Detalhes
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
