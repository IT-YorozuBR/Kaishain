import { redirect } from 'next/navigation';
import Link from 'next/link';

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
    <main className="bg-background min-h-dvh px-4 py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-normal">Funcionarios</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie o cadastro de funcionarios da empresa.
            </p>
          </div>
          <Link
            href="/funcionarios/novo"
            className={cn(buttonVariants(), 'shrink-0')}
          >
            Novo funcionario
          </Link>
        </header>

        <EmployeesTable employees={employees} managers={managers} />
      </div>
    </main>
  );
}
