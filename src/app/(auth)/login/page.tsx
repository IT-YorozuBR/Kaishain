import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { LoginForm } from '@/components/forms/LoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session?.user) {
    redirect('/');
  }

  const { callbackUrl } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_top_left,rgba(12,74,110,0.12),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eef6f8_100%)] px-4 py-10">
      <Card className="w-full max-w-sm border-white/70 bg-white shadow-xl shadow-slate-950/10">
        <CardHeader className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
            K
          </div>
          <CardTitle className="text-xl">Kaishain</CardTitle>
          <CardDescription>Acesse sua area de avaliacao de funcionarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm redirectTo={callbackUrl} />
        </CardContent>
      </Card>
    </main>
  );
}
