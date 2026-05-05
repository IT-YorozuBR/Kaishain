'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { deactivateEmployeeAction } from '@/server/actions/employees';

type DeactivateButtonProps = {
  id: string;
  employeeName: string;
};

export function DeactivateButton({ id, employeeName }: DeactivateButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(undefined);

    startTransition(async () => {
      const result = await deactivateEmployeeAction(id);

      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.push('/funcionarios');
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="destructive" />}>
        Desativar funcionário
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar {employeeName}?</DialogTitle>
          <DialogDescription>
            O funcionário não aparecerá mais na tela de avaliação. O histórico de avaliações será
            preservado.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? 'Desativando...' : 'Confirmar desativação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
