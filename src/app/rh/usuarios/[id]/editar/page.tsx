import { redirect } from 'next/navigation';

import { UserDeactivateButton } from '@/components/forms/UserDeactivateButton';
import { UserForm } from '@/components/forms/UserForm';
import { UserPasswordForm } from '@/components/forms/UserPasswordForm';
import { AppShell } from '@/components/layout/AppShell';
import { FormCard } from '@/components/layout/FormCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { NotFoundError } from '@/lib/errors';
import type { UserRoleValue } from '@/lib/validators/user';
import { changeUserPasswordAction, updateUserAction } from '@/server/actions/users';
import { listDepartments } from '@/server/services/departments';
import { getUser } from '@/server/services/users';

type EditarUsuarioPageProps = {
  params: Promise<{ id: string }>;
};

function getAllowedRoles(role: string): UserRoleValue[] {
  return role === 'ADMIN' ? ['RH', 'GESTOR', 'ADMIN'] : ['GESTOR'];
}

export default async function EditarUsuarioPage({ params }: EditarUsuarioPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const { id } = await params;

  let user;
  try {
    user = await getUser(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      redirect('/rh/usuarios');
    }

    throw error;
  }

  if (currentUser.role === 'RH' && user.role !== 'GESTOR') {
    redirect('/rh/usuarios');
  }

  const departments = await listDepartments(true);

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader title="Editar usuário" description={`Atualize os dados de ${user.name}.`} />
        <FormCard title="Dados do usuário">
          <UserForm
            allowedRoles={getAllowedRoles(currentUser.role)}
            departments={departments}
            defaultValues={{
              name: user.name,
              email: user.email,
              role: user.role,
              department: user.department ?? '',
              active: user.active,
            }}
            showActive
            action={updateUserAction.bind(null, user.id)}
          />
        </FormCard>

        <FormCard title="Alterar senha">
          <UserPasswordForm action={changeUserPasswordAction.bind(null, user.id)} />
        </FormCard>

        {user.active ? (
          <Card className="border-red-200 bg-red-50/40">
            <CardHeader>
              <CardTitle className="text-base text-red-700">Zona de perigo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-red-700">
                Desativar impede novo login, mas preserva o histórico relacionado.
              </p>
              <UserDeactivateButton id={user.id} userName={user.name} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
