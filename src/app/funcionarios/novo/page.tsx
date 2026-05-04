import { redirect } from 'next/navigation';

import { EmployeeForm } from '@/components/forms/EmployeeForm';
import { AppShell } from '@/components/layout/AppShell';
import { FormCard } from '@/components/layout/FormCard';
import { PageHeader } from '@/components/layout/PageHeader';
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
    <AppShell>
      <div className="grid max-w-3xl gap-6 mx-auto mt-10">
        <PageHeader
          title="Novo funcionario"
          description="Cadastre um funcionario e associe um gestor responsavel."
        />
        <FormCard title="Dados do funcionario">
          <EmployeeForm managers={managers} action={createEmployeeAction} />
        </FormCard>
      </div>
    </AppShell>
  );
}
