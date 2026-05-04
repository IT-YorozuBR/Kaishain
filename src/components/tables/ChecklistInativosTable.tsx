'use client';

import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toggleChecklistItemActiveAction } from '@/server/actions/checklist';

type ChecklistItem = {
  id: string;
  label: string;
  description: string | null;
};

function ActivateButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleActivate() {
    startTransition(async () => {
      await toggleChecklistItemActiveAction(id);
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={handleActivate}>
      {pending ? 'Ativando...' : 'Ativar'}
    </Button>
  );
}

type ChecklistInativosTableProps = {
  items: ChecklistItem[];
};

export function ChecklistInativosTable({ items }: ChecklistInativosTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                Nenhum item inativo.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.label}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {item.description ?? '-'}
                </TableCell>
                <TableCell className="text-right">
                  <ActivateButton id={item.id} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
