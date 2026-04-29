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
    <main className="bg-muted/30 grid min-h-dvh place-items-center px-4 py-10">
      <Card className="w-full max-w-sm rounded-lg">
        <CardHeader>
          <CardTitle>Kaishain</CardTitle>
          <CardDescription>Acesse sua area de avaliacao de funcionarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm redirectTo={callbackUrl} />
        </CardContent>
      </Card>
    </main>
  );
}
