import { notFound, redirect } from 'next/navigation';

import { ChecklistItemForm } from '@/components/forms/ChecklistItemForm';
import { AppShell } from '@/components/layout/AppShell';
import { FormCard } from '@/components/layout/FormCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { getCurrentUser } from '@/lib/auth';
import { NotFoundError } from '@/lib/errors';
import { updateChecklistItemAction } from '@/server/actions/checklist';
import { getChecklistItem } from '@/server/services/checklist';

type EditarChecklistItemPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarChecklistItemPage({ params }: EditarChecklistItemPageProps) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role === 'GESTOR') redirect('/avaliar');

  const { id } = await params;

  let item: Awaited<ReturnType<typeof getChecklistItem>>;
  try {
    item = await getChecklistItem(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const updateAction = updateChecklistItemAction.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto mt-10 grid max-w-3xl gap-6">
        <PageHeader
          title="Editar item de checklist"
          description="Atualize o label ou descrição do critério."
        />
        <FormCard title="Dados do item">
          <ChecklistItemForm
            defaultValues={{
              label: item.label,
              description: item.description ?? '',
            }}
            action={updateAction}
          />
        </FormCard>
      </div>
    </AppShell>
  );
}
