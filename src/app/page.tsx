import { redirect } from 'next/navigation';
import { ClipboardCheck, ShieldCheck, Users } from 'lucide-react';

import { auth } from '@/auth';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="Kaishain"
          description={`Olá, ${session.user.name ?? session.user.email}. A autenticação está ativa.`}
          meta={<Badge variant="secondary">{session.user.role}</Badge>}
        />

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="size-4" />
                Avaliações
              </CardTitle>
              <CardDescription>Fluxo diário dos gestores.</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Próximo passo: tela de avaliação por liderado.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" />
                Funcionários
              </CardTitle>
              <CardDescription>Gestão de cadastros para RH e ADMIN.</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              As permissões finais devem continuar no server.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Segurança
              </CardTitle>
              <CardDescription>Auth.js, JWT e proxy configurados.</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Rotas privadas redirecionam para login quando não há sessão.
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
