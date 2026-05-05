import { notFound, redirect } from 'next/navigation';

import { DepartmentForm } from '@/components/forms/DepartmentForm';
import { AppShell } from '@/components/layout/AppShell';
import { FormCard } from '@/components/layout/FormCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { getCurrentUser } from '@/lib/auth';
import { NotFoundError } from '@/lib/errors';
import { updateDepartmentAction } from '@/server/actions/departments';
import { getDepartment } from '@/server/services/departments';

type EditarDepartamentoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarDepartamentoPage({ params }: EditarDepartamentoPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const { id } = await params;

  let department: Awaited<ReturnType<typeof getDepartment>>;
  try {
    department = await getDepartment(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const updateAction = updateDepartmentAction.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto mt-10 grid max-w-3xl gap-6">
        <PageHeader
          title="Editar departamento"
          description="Atualize o nome do departamento."
          meta={!department.active ? <StatusBadge status="inactive">Inativo</StatusBadge> : null}
        />
        <FormCard title="Dados do departamento">
          <DepartmentForm defaultValues={{ name: department.name }} action={updateAction} />
        </FormCard>
      </div>
    </AppShell>
  );
}
