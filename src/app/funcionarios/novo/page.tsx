import { redirect } from 'next/navigation';

import { EmployeeForm } from '@/components/forms/EmployeeForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { createEmployeeAction } from '@/server/actions/employees';
import { listManagers } from '@/server/services/employees';

export default async function NovoFuncionarioPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const managers = await listManagers();

  return (
    <main className="bg-background min-h-dvh px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Novo funcionario</CardTitle>
          </CardHeader>
          <CardContent>
            <EmployeeForm managers={managers} action={createEmployeeAction} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
