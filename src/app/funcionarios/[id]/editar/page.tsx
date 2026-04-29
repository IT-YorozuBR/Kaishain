import { notFound, redirect } from 'next/navigation';

import { DeactivateButton } from '@/components/forms/DeactivateButton';
import { EmployeeForm } from '@/components/forms/EmployeeForm';
import { Badge } from '@/components/ui/badge';
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
    <main className="bg-background min-h-dvh px-4 py-8">
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Editar funcionario</CardTitle>
            {!employee.active ? <Badge variant="secondary">Inativo</Badge> : null}
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {employee.active ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Zona de perigo</CardTitle>
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
    </main>
  );
}
