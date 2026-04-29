import { notFound, redirect } from 'next/navigation';

import { DeactivateButton } from '@/components/forms/DeactivateButton';
import { EmployeeForm } from '@/components/forms/EmployeeForm';
import { AppShell } from '@/components/layout/AppShell';
import { FormCard } from '@/components/layout/FormCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { NotFoundError } from '@/lib/errors';
import { updateEmployeeAction } from '@/server/actions/employees';
import { getEmployee, listManagers } from '@/server/services/employees';

type EditarFuncionarioPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarFuncionarioPage({ params }: EditarFuncionarioPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const { id } = await params;

  let employee: Awaited<ReturnType<typeof getEmployee>>;
  try {
    employee = await getEmployee(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const managers = await listManagers();
  const updateAction = updateEmployeeAction.bind(null, id);

  return (
    <AppShell>
      <div className="grid max-w-3xl gap-6">
        <PageHeader
          title="Editar funcionario"
          description="Atualize os dados cadastrais e a relacao com o gestor."
          meta={!employee.active ? <StatusBadge status="inactive">Inativo</StatusBadge> : null}
        />
        <FormCard title="Dados do funcionario">
          <EmployeeForm
            managers={managers}
            defaultValues={{
              name: employee.name,
              email: employee.email,
              registration: employee.registration,
              position: employee.position,
              department: employee.department,
              managerId: employee.managerId,
            }}
            action={updateAction}
          />
        </FormCard>

        {employee.active ? (
          <Card className="border-red-200 bg-red-50/40">
            <CardHeader>
              <CardTitle className="text-base text-red-700">Zona de perigo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-md text-sm text-muted-foreground">
                Funcionarios desativados saem da tela de avaliacao. O historico e preservado.
              </p>
              <DeactivateButton id={employee.id} employeeName={employee.name} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
