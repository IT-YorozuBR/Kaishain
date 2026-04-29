import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function FuncionariosPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  return (
    <main className="bg-background min-h-dvh px-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="grid gap-2 border-b pb-6">
          <h1 className="text-2xl font-semibold tracking-normal">Funcionarios</h1>
          <p className="text-muted-foreground text-sm">
            Area administrativa para RH e administradores.
          </p>
        </header>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Cadastro de funcionarios</CardTitle>
            <CardDescription>Esta tela sera conectada ao CRUD do RH.</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Usuario autenticado: {user.email} ({user.role})
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
