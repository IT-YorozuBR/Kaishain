import { redirect } from 'next/navigation';
import { ClipboardCheck, LogOut, ShieldCheck, Users } from 'lucide-react';

import { auth, signOut } from '@/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <main className="bg-background min-h-dvh">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-normal">Kaishain</h1>
              <Badge variant="secondary">{session.user.role}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Ola, {session.user.name ?? session.user.email}. A autenticacao esta ativa.
            </p>
          </div>

          <form
            action={async () => {
              'use server';

              await signOut({ redirectTo: '/login' });
            }}
          >
            <Button type="submit" variant="outline">
              <LogOut data-icon="inline-start" />
              Sair
            </Button>
          </form>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="size-4" />
                Avaliacoes
              </CardTitle>
              <CardDescription>Fluxo diario dos gestores.</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Proximo passo: tela de avaliacao por liderado.
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" />
                Funcionarios
              </CardTitle>
              <CardDescription>Gestao de cadastros para RH e ADMIN.</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              As permissoes finais devem continuar no server.
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Seguranca
              </CardTitle>
              <CardDescription>Auth.js, JWT e proxy configurados.</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Rotas privadas redirecionam para login quando nao ha sessao.
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
