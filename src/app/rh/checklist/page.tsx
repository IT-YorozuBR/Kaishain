import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ChecklistInativosTable } from '@/components/tables/ChecklistInativosTable';
import { SortableChecklistTable } from '@/components/tables/SortableChecklistTable';
import { buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { listChecklistItems } from '@/server/services/checklist';

export default async function ChecklistPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role === 'GESTOR') redirect('/avaliar');

  const allItems = await listChecklistItems();
  const ativos = allItems.filter((item) => item.active);
  const inativos = allItems.filter((item) => !item.active);

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="Checklist"
          description="Configure os itens do checklist de avaliação diária."
          actions={
            <Link href="/rh/checklist/novo" className={cn(buttonVariants(), 'shrink-0')}>
              Novo item
            </Link>
          }
        />

        <Tabs defaultValue="ativos">
          <TabsList>
            <TabsTrigger value="ativos">Ativos ({ativos.length})</TabsTrigger>
            <TabsTrigger value="inativos">Inativos ({inativos.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="ativos" className="mt-4">
            <SortableChecklistTable initialItems={ativos} />
          </TabsContent>
          <TabsContent value="inativos" className="mt-4">
            <ChecklistInativosTable items={inativos} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
