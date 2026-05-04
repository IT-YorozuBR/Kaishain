import { redirect } from 'next/navigation';

import { ChecklistItemForm } from '@/components/forms/ChecklistItemForm';
import { AppShell } from '@/components/layout/AppShell';
import { FormCard } from '@/components/layout/FormCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { getCurrentUser } from '@/lib/auth';
import { createChecklistItemAction } from '@/server/actions/checklist';

export default async function NovoChecklistItemPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'RH' && user.role !== 'ADMIN') redirect('/avaliar');

  return (
    <AppShell>
      <div className="mx-auto mt-10 grid max-w-3xl gap-6">
        <PageHeader
          title="Novo item de checklist"
          description="Adicione um critério ao checklist diário de avaliação."
        />
        <FormCard title="Dados do item">
          <ChecklistItemForm action={createChecklistItemAction} />
        </FormCard>
      </div>
    </AppShell>
  );
}
