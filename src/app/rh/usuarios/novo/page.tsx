import { redirect } from 'next/navigation';

import { UserForm } from '@/components/forms/UserForm';
import { AppShell } from '@/components/layout/AppShell';
import { FormCard } from '@/components/layout/FormCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { getCurrentUser } from '@/lib/auth';
import type { UserRoleValue } from '@/lib/validators/user';
import { createUserAction } from '@/server/actions/users';
import { listDepartments } from '@/server/services/departments';

function getAllowedRoles(role: string): UserRoleValue[] {
  return role === 'ADMIN' ? ['RH', 'GESTOR', 'ADMIN'] : ['GESTOR'];
}

export default async function NovoUsuarioPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const departments = await listDepartments(true);

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader title="Novo usuário" description="Crie um usuário de acesso ao sistema." />
        <FormCard
          title="Dados do usuário"
          description="A senha temporária padrão será Kaishain@2025."
        >
          <UserForm
            allowedRoles={getAllowedRoles(user.role)}
            departments={departments}
            action={createUserAction}
          />
        </FormCard>
      </div>
    </AppShell>
  );
}
