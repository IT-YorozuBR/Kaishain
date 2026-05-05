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
import type { EquipamentoValue } from '@/lib/validators/employee';
import { updateEmployeeAction } from '@/server/actions/employees';
import { listDepartments } from '@/server/services/departments';
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

  const [managers, departments] = await Promise.all([listManagers(), listDepartments(true)]);
  const updateAction = updateEmployeeAction.bind(null, id);

  return (
    <AppShell>
      <div className="grid max-w-3xl gap-6">
        <PageHeader
          title="Editar funcionário"
          description="Atualize os dados cadastrais e a relação com o gestor."
          meta={!employee.active ? <StatusBadge status="inactive">Inativo</StatusBadge> : null}
        />
        <FormCard title="Dados do funcionário">
          <EmployeeForm
            managers={managers}
            departments={departments}
            defaultValues={{
              name: employee.name,
              email: employee.email,
              registration: employee.registration,
              position: employee.position,
              departmentId: employee.departmentId,
              turno: employee.turno,
              managerId: employee.managerId,
              equipamentos: employee.equipamentos as EquipamentoValue[],
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
                Funcionários desativados saem da tela de avaliação. O histórico é preservado.
              </p>
              <DeactivateButton id={employee.id} employeeName={employee.name} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
