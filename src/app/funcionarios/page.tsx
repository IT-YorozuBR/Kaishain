import { redirect } from 'next/navigation';
import Link from 'next/link';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmployeesTable } from '@/components/tables/EmployeesTable';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { listEmployees, listManagers } from '@/server/services/employees';

export default async function FuncionariosPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const [employees, managers] = await Promise.all([listEmployees(), listManagers()]);

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="Funcionarios"
          description="Gerencie o cadastro de funcionarios da empresa."
          actions={
            <Link href="/funcionarios/novo" className={cn(buttonVariants(), 'shrink-0')}>
              Novo funcionario
            </Link>
          }
        />
        <EmployeesTable employees={employees} managers={managers} />
      </div>
    </AppShell>
  );
}
