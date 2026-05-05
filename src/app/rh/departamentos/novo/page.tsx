import { redirect } from 'next/navigation';

import { DepartmentForm } from '@/components/forms/DepartmentForm';
import { AppShell } from '@/components/layout/AppShell';
import { FormCard } from '@/components/layout/FormCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { getCurrentUser } from '@/lib/auth';
import { createDepartmentAction } from '@/server/actions/departments';

export default async function NovoDepartamentoPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  return (
    <AppShell>
      <div className="mx-auto mt-10 grid max-w-3xl gap-6">
        <PageHeader
          title="Novo departamento"
          description="Cadastre um departamento para uso nos filtros e no cadastro de funcionários."
        />
        <FormCard title="Dados do departamento">
          <DepartmentForm action={createDepartmentAction} />
        </FormCard>
      </div>
    </AppShell>
  );
}
