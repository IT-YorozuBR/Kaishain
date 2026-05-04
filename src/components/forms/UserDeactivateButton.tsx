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
import { deactivateUserAction } from '@/server/actions/users';

type UserDeactivateButtonProps = {
  id: string;
  userName: string;
};

export function UserDeactivateButton({ id, userName }: UserDeactivateButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(undefined);

    startTransition(async () => {
      const result = await deactivateUserAction(id);

      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.push('/rh/usuarios');
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="destructive" />}>
        Desativar usuario
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar {userName}?</DialogTitle>
          <DialogDescription>
            O usuario nao conseguira acessar o sistema enquanto estiver inativo.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? 'Desativando...' : 'Confirmar desativacao'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
