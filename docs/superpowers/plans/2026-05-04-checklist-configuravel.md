# Checklist Configurável pelo RH — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que RH e ADMIN gerenciem os itens do checklist de avaliação diária (criar, editar, reordenar por drag-and-drop, ativar/desativar) via interface web dedicada.

**Architecture:** Novo serviço `checklist.ts` encapsula toda a lógica de negócio; a função `getActiveChecklistItems` é migrada de `evaluations.ts` para esse serviço. A UI usa `@dnd-kit` para drag-and-drop na aba de itens ativos, com atualização otimista no cliente e persistência via server action. Itens nunca são deletados — apenas desativados.

**Tech Stack:** Next.js App Router, Drizzle ORM, Zod, react-hook-form, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, shadcn/ui (Table, Tabs, Button, Input, Textarea).

---

## Mapa de Arquivos

**Criar:**
- `src/lib/validators/checklist.ts` — schemas Zod e tipos
- `src/server/services/checklist.ts` — lógica de negócio
- `src/server/actions/checklist.ts` — server actions
- `src/components/forms/ChecklistItemForm.tsx` — form compartilhado (novo/editar)
- `src/components/tables/SortableChecklistTable.tsx` — tabela com D&D (aba Ativos)
- `src/components/tables/ChecklistInativosTable.tsx` — tabela estática (aba Inativos)
- `src/app/rh/checklist/page.tsx` — listagem com abas
- `src/app/rh/checklist/novo/page.tsx` — formulário de criação
- `src/app/rh/checklist/[id]/editar/page.tsx` — formulário de edição

**Modificar:**
- `src/server/services/evaluations.ts` — remove `getActiveChecklistItems`, importa de `checklist.ts`
- `src/components/layout/AppSidebar.tsx` — adiciona entrada Checklist

---

## Task 1: Instalar dependências @dnd-kit

**Files:** `package.json`, `pnpm-lock.yaml`

- [ ] Instalar os pacotes:

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] Verificar que não houve quebra:

```bash
pnpm typecheck
```

Expected: sem erros de tipo.

- [ ] Commit:

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @dnd-kit packages for sortable checklist"
```

---

## Task 2: Validators

**Files:**
- Create: `src/lib/validators/checklist.ts`

- [ ] Criar o arquivo:

```ts
import { z } from 'zod';

export const createChecklistItemSchema = z.object({
  label: z.string().trim().min(1, 'Label é obrigatório.').max(120, 'Máximo 120 caracteres.'),
  description: z
    .string()
    .trim()
    .max(500, 'Máximo 500 caracteres.')
    .optional()
    .transform((v) => (v === '' ? null : (v ?? null))),
});

export const updateChecklistItemSchema = createChecklistItemSchema.partial();

export const reorderChecklistItemsSchema = z
  .array(z.string().uuid())
  .min(1, 'Lista de ids não pode ser vazia.');

export type CreateChecklistItemInput = z.output<typeof createChecklistItemSchema>;
export type UpdateChecklistItemInput = z.output<typeof updateChecklistItemSchema>;
export type ReorderChecklistItemsInput = z.output<typeof reorderChecklistItemsSchema>;
```

- [ ] Verificar tipos:

```bash
pnpm typecheck
```

Expected: sem erros.

- [ ] Commit:

```bash
git add src/lib/validators/checklist.ts
git commit -m "feat: add checklist Zod validators"
```

---

## Task 3: Serviço

**Files:**
- Create: `src/server/services/checklist.ts`

- [ ] Criar o arquivo:

```ts
import { asc, eq, max } from 'drizzle-orm';

import type { CurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { checklistItems } from '@/lib/db/schema';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';
import type {
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
} from '@/lib/validators/checklist';

export type ChecklistItem = typeof checklistItems.$inferSelect;

function requireRhOrAdmin(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError('Apenas RH e administradores podem gerenciar o checklist.');
  }
}

export async function listChecklistItems(activeOnly = false): Promise<ChecklistItem[]> {
  const db = getDb();
  return db.query.checklistItems.findMany({
    where: activeOnly ? eq(checklistItems.active, true) : undefined,
    orderBy: [asc(checklistItems.order), asc(checklistItems.label)],
  });
}

export async function getChecklistItem(id: string): Promise<ChecklistItem> {
  const db = getDb();
  const item = await db.query.checklistItems.findFirst({
    where: eq(checklistItems.id, id),
  });
  if (!item) {
    throw new NotFoundError('Item de checklist não encontrado.');
  }
  return item;
}

export async function createChecklistItem(
  user: CurrentUser,
  input: CreateChecklistItemInput,
): Promise<ChecklistItem> {
  requireRhOrAdmin(user);
  const db = getDb();

  const [maxRow] = await db.select({ value: max(checklistItems.order) }).from(checklistItems);
  const nextOrder = (maxRow?.value ?? 0) + 1;

  const [item] = await db
    .insert(checklistItems)
    .values({ ...input, order: nextOrder })
    .returning();

  if (!item) throw new Error('Falha ao criar item de checklist.');
  return item;
}

export async function updateChecklistItem(
  user: CurrentUser,
  id: string,
  input: UpdateChecklistItemInput,
): Promise<ChecklistItem> {
  requireRhOrAdmin(user);
  const db = getDb();

  await getChecklistItem(id);

  const [item] = await db
    .update(checklistItems)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(checklistItems.id, id))
    .returning();

  if (!item) throw new NotFoundError('Item de checklist não encontrado.');
  return item;
}

export async function toggleChecklistItemActive(
  user: CurrentUser,
  id: string,
): Promise<ChecklistItem> {
  requireRhOrAdmin(user);
  const db = getDb();

  const item = await getChecklistItem(id);

  const [updated] = await db
    .update(checklistItems)
    .set({ active: !item.active, updatedAt: new Date() })
    .where(eq(checklistItems.id, id))
    .returning();

  if (!updated) throw new NotFoundError('Item de checklist não encontrado.');
  return updated;
}

export async function reorderChecklistItems(
  user: CurrentUser,
  orderedIds: string[],
): Promise<void> {
  requireRhOrAdmin(user);
  const db = getDb();

  await db.transaction(async (tx) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        tx
          .update(checklistItems)
          .set({ order: index + 1, updatedAt: new Date() })
          .where(eq(checklistItems.id, id)),
      ),
    );
  });
}
```

- [ ] Verificar tipos:

```bash
pnpm typecheck
```

Expected: sem erros.

- [ ] Commit:

```bash
git add src/server/services/checklist.ts
git commit -m "feat: add checklist service"
```

---

## Task 4: Migrar getActiveChecklistItems para o novo serviço

**Files:**
- Modify: `src/server/services/evaluations.ts`

- [ ] Remover a função `getActiveChecklistItems` de `evaluations.ts` (atualmente nas linhas 41–48):

```ts
// REMOVER este bloco inteiro:
export async function getActiveChecklistItems() {
  const db = getDb();

  return db.query.checklistItems.findMany({
    where: eq(checklistItems.active, true),
    orderBy: [asc(checklistItems.order), asc(checklistItems.label)],
  });
}
```

- [ ] Adicionar import de `listChecklistItems` no topo de `evaluations.ts`, junto aos outros imports:

```ts
import { listChecklistItems } from '@/server/services/checklist';
```

- [ ] Substituir as duas chamadas a `getActiveChecklistItems()` por `listChecklistItems(true)`:
  - Na função `getEvaluationFormData` (~linha 99): `getActiveChecklistItems()` → `listChecklistItems(true)`
  - Na função `upsertEvaluation` (~linha 130): `getActiveChecklistItems()` → `listChecklistItems(true)`

- [ ] Remover do import de `@/lib/db/schema` em `evaluations.ts` a entrada `checklistItems` caso não seja mais usada em outras partes do arquivo. (Verificar: `checklistItems` ainda é usado na query de `getEvaluationDetail` — manter o import se for o caso.)

- [ ] Verificar tipos e lint:

```bash
pnpm typecheck && pnpm lint
```

Expected: sem erros. Se `checklistItems` ainda aparecer no arquivo (linha ~461 de `getEvaluationDetail`), mantenha o import.

- [ ] Commit:

```bash
git add src/server/services/evaluations.ts
git commit -m "refactor: migrate getActiveChecklistItems to checklist service"
```

---

## Task 5: Server Actions

**Files:**
- Create: `src/server/actions/checklist.ts`

- [ ] Criar o arquivo:

```ts
'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth';
import { NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import {
  createChecklistItemSchema,
  reorderChecklistItemsSchema,
  updateChecklistItemSchema,
} from '@/lib/validators/checklist';
import {
  createChecklistItem,
  reorderChecklistItems,
  toggleChecklistItemActive,
  updateChecklistItem,
} from '@/server/services/checklist';

export type ChecklistActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    label?: string[];
    description?: string[];
  };
};

export async function createChecklistItemAction(data: unknown): Promise<ChecklistActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  const parsed = createChecklistItemSchema.safeParse(data);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await createChecklistItem(user, parsed.data);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath('/rh/checklist');
  return { success: true };
}

export async function updateChecklistItemAction(
  id: string,
  data: unknown,
): Promise<ChecklistActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  const parsed = updateChecklistItemSchema.safeParse(data);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await updateChecklistItem(user, id, parsed.data);
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof NotFoundError ||
      error instanceof ValidationError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath('/rh/checklist');
  return { success: true };
}

export async function toggleChecklistItemActiveAction(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  try {
    await toggleChecklistItemActive(user, id);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath('/rh/checklist');
  return {};
}

export async function reorderChecklistItemsAction(
  orderedIds: unknown,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  const parsed = reorderChecklistItemsSchema.safeParse(orderedIds);
  if (!parsed.success) return { error: 'Lista de IDs inválida.' };

  try {
    await reorderChecklistItems(user, parsed.data);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath('/rh/checklist');
  return {};
}
```

- [ ] Verificar tipos:

```bash
pnpm typecheck
```

Expected: sem erros.

- [ ] Commit:

```bash
git add src/server/actions/checklist.ts
git commit -m "feat: add checklist server actions"
```

---

## Task 6: Formulário compartilhado (novo/editar)

**Files:**
- Create: `src/components/forms/ChecklistItemForm.tsx`

- [ ] Verificar se o componente Textarea já existe; instalar se necessário:

```bash
ls src/components/ui/textarea.tsx
```

Se não existir:

```bash
pnpm dlx shadcn@latest add textarea
```

- [ ] Criar o arquivo:

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createChecklistItemSchema } from '@/lib/validators/checklist';
import type { ChecklistActionState } from '@/server/actions/checklist';

type FormValues = z.input<typeof createChecklistItemSchema>;
type FormOutput = z.output<typeof createChecklistItemSchema>;

type ChecklistItemFormProps = {
  defaultValues?: Partial<FormValues>;
  action: (data: unknown) => Promise<ChecklistActionState>;
};

export function ChecklistItemForm({ defaultValues, action }: ChecklistItemFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(createChecklistItemSchema),
    defaultValues: {
      label: defaultValues?.label ?? '',
      description: defaultValues?.description ?? '',
    },
  });

  function onSubmit(data: FormOutput) {
    startTransition(async () => {
      const result = await action(data);

      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof FormValues, { message: messages?.[0] });
        }
        return;
      }

      if (result.error) {
        setError('root', { message: result.error });
        return;
      }

      router.push('/rh/checklist');
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      {errors.root ? (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="label">Label *</Label>
        <Input id="label" {...register('label')} placeholder="Ex.: Usou EPI corretamente" />
        {errors.label ? (
          <p className="text-sm text-destructive">{errors.label.message}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Detalhe opcional sobre o critério"
          rows={3}
        />
        {errors.description ? (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/rh/checklist">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
```

- [ ] Verificar tipos:

```bash
pnpm typecheck
```

Expected: sem erros.

- [ ] Commit:

```bash
git add src/components/forms/ChecklistItemForm.tsx
git commit -m "feat: add ChecklistItemForm component"
```

---

## Task 7: Tabela de itens inativos

**Files:**
- Create: `src/components/tables/ChecklistInativosTable.tsx`

- [ ] Criar o arquivo:

```tsx
'use client';

import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toggleChecklistItemActiveAction } from '@/server/actions/checklist';

type ChecklistItem = {
  id: string;
  label: string;
  description: string | null;
};

function ActivateButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleActivate() {
    startTransition(async () => {
      await toggleChecklistItemActiveAction(id);
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={handleActivate}>
      {pending ? 'Ativando...' : 'Ativar'}
    </Button>
  );
}

type ChecklistInativosTableProps = {
  items: ChecklistItem[];
};

export function ChecklistInativosTable({ items }: ChecklistInativosTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                Nenhum item inativo.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.label}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {item.description ?? '-'}
                </TableCell>
                <TableCell className="text-right">
                  <ActivateButton id={item.id} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] Verificar tipos:

```bash
pnpm typecheck
```

Expected: sem erros.

- [ ] Commit:

```bash
git add src/components/tables/ChecklistInativosTable.tsx
git commit -m "feat: add ChecklistInativosTable component"
```

---

## Task 8: Tabela de itens ativos com drag-and-drop

**Files:**
- Create: `src/components/tables/SortableChecklistTable.tsx`

- [ ] Criar o arquivo:

```tsx
'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  reorderChecklistItemsAction,
  toggleChecklistItemActiveAction,
} from '@/server/actions/checklist';

type ChecklistItem = {
  id: string;
  label: string;
  description: string | null;
};

function SortableRow({ item }: { item: ChecklistItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [toggling, startToggle] = useTransition();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function handleDeactivate() {
    startToggle(async () => {
      await toggleChecklistItemActiveAction(item.id);
    });
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-50')}>
      <TableCell className="w-10">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{item.label}</TableCell>
      <TableCell className="max-w-xs truncate text-muted-foreground">
        {item.description ?? '-'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Link
            href={`/rh/checklist/${item.id}/editar`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Pencil className="size-3.5" />
            Editar
          </Link>
          <Button variant="outline" size="sm" disabled={toggling} onClick={handleDeactivate}>
            {toggling ? 'Desativando...' : 'Desativar'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

type SortableChecklistTableProps = {
  initialItems: ChecklistItem[];
};

export function SortableChecklistTable({ initialItems }: SortableChecklistTableProps) {
  const [items, setItems] = useState(initialItems);
  const [, startReorder] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    setItems(reordered); // atualização otimista
    startReorder(async () => {
      await reorderChecklistItemsAction(reordered.map((item) => item.id));
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Label</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Nenhum item ativo. Crie o primeiro item.
                </TableCell>
              </TableRow>
            ) : (
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((item) => (
                  <SortableRow key={item.id} item={item} />
                ))}
              </SortableContext>
            )}
          </TableBody>
        </Table>
      </div>
    </DndContext>
  );
}
```

- [ ] Verificar tipos:

```bash
pnpm typecheck
```

Expected: sem erros.

- [ ] Commit:

```bash
git add src/components/tables/SortableChecklistTable.tsx
git commit -m "feat: add SortableChecklistTable with dnd-kit drag-and-drop"
```

---

## Task 9: Página de listagem

**Files:**
- Create: `src/app/rh/checklist/page.tsx`

Observação: o componente `Tabs` do shadcn/ui pode não estar instalado. Verificar com `pnpm dlx shadcn@latest add tabs` caso necessário.

- [ ] Verificar se o componente Tabs já existe:

```bash
ls src/components/ui/tabs.tsx
```

Se não existir, instalar:

```bash
pnpm dlx shadcn@latest add tabs
```

- [ ] Criar o arquivo `src/app/rh/checklist/page.tsx`:

```tsx
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
```

- [ ] Verificar tipos:

```bash
pnpm typecheck
```

Expected: sem erros.

- [ ] Commit:

```bash
git add src/app/rh/checklist/page.tsx src/components/ui/tabs.tsx
git commit -m "feat: add checklist listagem page with tabs"
```

---

## Task 10: Página de criação

**Files:**
- Create: `src/app/rh/checklist/novo/page.tsx`

- [ ] Criar o arquivo:

```tsx
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
  if (user.role === 'GESTOR') redirect('/avaliar');

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
```

- [ ] Verificar tipos:

```bash
pnpm typecheck
```

Expected: sem erros.

- [ ] Commit:

```bash
git add src/app/rh/checklist/novo/page.tsx
git commit -m "feat: add checklist novo page"
```

---

## Task 11: Página de edição

**Files:**
- Create: `src/app/rh/checklist/[id]/editar/page.tsx`

- [ ] Criar o arquivo:

```tsx
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
```

- [ ] Verificar tipos:

```bash
pnpm typecheck
```

Expected: sem erros.

- [ ] Commit:

```bash
git add src/app/rh/checklist/[id]/editar/page.tsx
git commit -m "feat: add checklist editar page"
```

---

## Task 12: Atualizar sidebar

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`

- [ ] Adicionar `ListChecks` ao import existente de `lucide-react` (junto a `CalendarCheck`, `History`, etc.):

```ts
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Users,
} from 'lucide-react';
```

- [ ] Adicionar a nova entrada no array `items` após a entrada de `Funcionarios`:

```ts
const items: SidebarItemConfig[] = [
  { href: '/avaliar', label: 'Avaliar', icon: CalendarCheck, roles: ['GESTOR', 'ADMIN'] },
  { href: '/historico', label: 'Historico', icon: History, roles: ['GESTOR'] },
  { href: '/funcionarios', label: 'Funcionarios', icon: Users, roles: ['RH', 'ADMIN'] },
  { href: '/rh/checklist', label: 'Checklist', icon: ListChecks, roles: ['RH', 'ADMIN'] },
  { href: '/rh/historico', label: 'Avaliações', icon: ClipboardList, roles: ['RH', 'ADMIN'] },
  { href: '/rh/avaliacoes-do-dia', label: 'Avaliações do dia', icon: LayoutDashboard, roles: ['RH', 'ADMIN'] },
];
```

- [ ] Verificar tipos e lint:

```bash
pnpm typecheck && pnpm lint
```

Expected: sem erros.

- [ ] Commit:

```bash
git add src/components/layout/AppSidebar.tsx
git commit -m "feat: add checklist link to sidebar for RH and ADMIN"
```
