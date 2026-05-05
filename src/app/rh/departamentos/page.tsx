import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DepartmentsTable } from '@/components/tables/DepartmentsTable';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { listDepartments } from '@/server/services/departments';

export default async function DepartamentosPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const departments = await listDepartments();

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="Departamentos"
          description="Gerencie os departamentos disponíveis para o cadastro de funcionários."
          actions={
            <Link href="/rh/departamentos/novo" className={cn(buttonVariants(), 'shrink-0')}>
              Novo departamento
            </Link>
          }
        />

        <DepartmentsTable departments={departments} />
      </div>
    </AppShell>
  );
}
