import { redirect } from 'next/navigation';

import { EmployeeForm } from '@/components/forms/EmployeeForm';
import { AppShell } from '@/components/layout/AppShell';
import { FormCard } from '@/components/layout/FormCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { getCurrentUser } from '@/lib/auth';
import { createEmployeeAction } from '@/server/actions/employees';
import { listDepartments } from '@/server/services/departments';
import { listManagers } from '@/server/services/employees';

export default async function NovoFuncionarioPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const [managers, departments] = await Promise.all([listManagers(), listDepartments(true)]);

  return (
    <AppShell>
      <div className="grid max-w-3xl gap-6 mx-auto mt-10">
        <PageHeader
          title="Novo funcionário"
          description="Cadastre um funcionário e associe um gestor responsável."
        />
        <FormCard title="Dados do funcionário">
          <EmployeeForm
            managers={managers}
            departments={departments}
            action={createEmployeeAction}
          />
        </FormCard>
      </div>
    </AppShell>
  );
}
