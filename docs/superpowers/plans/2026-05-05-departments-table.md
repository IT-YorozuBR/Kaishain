# Departments Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `DEPARTMENTS` array with a proper `departments` database table, giving RH the ability to manage departments through the UI, and linking employees to departments via a foreign key.

**Architecture:** Add a `departments` table (id, name, active, timestamps); run a two-phase migration — first add the table and a nullable `department_id` FK column on `employees`, then run a one-off data migration script to populate `department_id` from the existing `department` text values, and finally drop the legacy `department` text column from `employees`. The `users.department` text column is display-only (no business logic dependency) and stays as-is. All filters that previously used department name strings will switch to UUIDs.

**Tech Stack:** Drizzle ORM, PostgreSQL (Neon), Next.js App Router, Server Actions, Zod, shadcn/ui, TypeScript strict

---

## File Map

| Status | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/db/migrations/0007_departments.sql` | Add `departments` table + `employees.department_id` FK column |
| Create | `src/lib/db/migrations/0008_drop_employee_department_text.sql` | Drop `employees.department` text column |
| Modify | `src/lib/db/schema.ts` | Add `departments` table definition, add `departmentId` FK to `employees`, remove `department` text from `employees` |
| Create | `src/lib/db/migrate-departments.ts` | One-off script: seed departments + set `department_id` from existing text values |
| Create | `src/lib/validators/department.ts` | Zod schemas for create/update department |
| Create | `src/server/services/departments.ts` | Service: listDepartments, getDepartment, createDepartment, updateDepartment, toggleDepartmentActive |
| Create | `src/server/actions/departments.ts` | Server actions for create/update/toggle |
| Modify | `src/lib/validators/employee.ts` | Remove `DEPARTMENTS` const; change `department` field to `departmentId` uuid |
| Modify | `src/lib/validators/evaluation-history.ts` | Change `department` filter from optionalString to optionalUuid |
| Modify | `src/server/services/employees.ts` | Update `listEmployees` filter, remove `listActiveDepartments`, update create/update to use `departmentId`, join departments table |
| Modify | `src/server/services/evaluations.ts` | Update `listEvaluations` to filter by `employees.departmentId`, join `departments` in result |
| Modify | `src/components/forms/EmployeeForm.tsx` | Accept `departments` prop, use `departmentId`, fix manager filtering |
| Modify | `src/components/forms/EmployeeFilters.tsx` | Accept `departments` from DB, filter by UUID |
| Modify | `src/components/forms/EvaluationHistoryFilters.tsx` | Accept `departments` from DB, filter by UUID |
| Create | `src/components/forms/DepartmentForm.tsx` | Form for create/edit department |
| Create | `src/components/tables/DepartmentsTable.tsx` | Table listing departments with toggle/edit actions |
| Create | `src/app/rh/departamentos/page.tsx` | Department list page |
| Create | `src/app/rh/departamentos/novo/page.tsx` | New department page |
| Create | `src/app/rh/departamentos/[id]/editar/page.tsx` | Edit department page |
| Modify | `src/components/layout/AppSidebar.tsx` | Add "Departamentos" nav item for RH/ADMIN |
| Modify | `src/app/funcionarios/page.tsx` | Load departments from DB for EmployeeFilters |
| Modify | `src/app/funcionarios/novo/page.tsx` | Load departments from DB for EmployeeForm |
| Modify | `src/app/funcionarios/[id]/editar/page.tsx` | Load departments from DB for EmployeeForm |
| Modify | `src/app/rh/historico/page.tsx` | Load departments from DB for EvaluationHistoryFilters |
| Modify | `src/app/historico/page.tsx` | Load departments from DB for EvaluationHistoryFilters |
| Modify | `src/lib/db/seed.ts` | Insert departments first, build name→id map, use `departmentId` for employees |

---

## Task 1: Schema — add `departments` table and `department_id` to `employees`

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `src/lib/db/migrations/0007_departments.sql`

- [ ] **Step 1: Write the raw SQL migration file**

Create `src/lib/db/migrations/0007_departments.sql`:

```sql
CREATE TABLE "departments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "departments_name_unique" UNIQUE("name")
);

ALTER TABLE "employees"
  ADD COLUMN "department_id" uuid REFERENCES "departments"("id");
```

- [ ] **Step 2: Update `src/lib/db/schema.ts` to add the `departments` table and `departmentId` column on `employees`**

Add after the `turnoEnum` definition:

```ts
export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Department = typeof departments.$inferSelect;
```

In the `employees` table definition, add `departmentId` (keep `department` text for now — it will be dropped in Task 3 after data migration):

```ts
departmentId: uuid('department_id').references(() => departments.id),
```

The `employees` table now has both `department` (text, legacy) and `departmentId` (uuid, new). That is intentional — it allows the data migration script in Task 2 to work.

- [ ] **Step 3: Apply the migration**

```bash
pnpm db:migrate
```

Expected: Migration `0007_departments` applied successfully, no errors.

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors. (Some files that reference `employees.department` will still compile because the text column is still in the schema.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/migrations/0007_departments.sql
git commit -m "feat: add departments table and department_id FK to employees"
```

---

## Task 2: Data migration script

**Files:**
- Create: `src/lib/db/migrate-departments.ts`

- [ ] **Step 1: Create the script**

Create `src/lib/db/migrate-departments.ts`:

```ts
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { departments, employees } from '@/lib/db/schema';

const DEPARTMENT_NAMES = [
  'Administrativo',
  'RH/DP',
  'Financeiro/Fiscal/Contabilidade',
  'Tecnologia da informação',
  'SST/MA',
  'Logistica',
  'Compras',
  'Comercial',
  'Engenharia',
  'Pintura Interna',
  'Manutenção',
  'Qualidade',
  'Prensa',
  'Caldeiraria',
  'Ferramentaria',
  'Montagem/Solda',
  'Pintura',
  'Picking',
];

async function main() {
  const db = getDb();

  console.log('Inserindo departamentos...');
  const inserted = await db
    .insert(departments)
    .values(DEPARTMENT_NAMES.map((name) => ({ name })))
    .onConflictDoNothing()
    .returning();
  console.log(`  ${inserted.length} departamentos inseridos.`);

  const allDepts = await db.select({ id: departments.id, name: departments.name }).from(departments);
  const nameToId = new Map(allDepts.map((d) => [d.name, d.id]));

  console.log('Atualizando funcionários...');
  const allEmployees = await db
    .select({ id: employees.id, department: employees.department })
    .from(employees);

  let updated = 0;
  let skipped = 0;

  for (const emp of allEmployees) {
    if (!emp.department) {
      skipped++;
      continue;
    }
    const deptId = nameToId.get(emp.department);
    if (!deptId) {
      console.warn(`  Departamento não encontrado para funcionário ${emp.id}: "${emp.department}"`);
      skipped++;
      continue;
    }
    await db.update(employees).set({ departmentId: deptId }).where(eq(employees.id, emp.id));
    updated++;
  }

  console.log(`  ${updated} funcionários atualizados, ${skipped} ignorados.`);
  console.log('Migração concluída.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the script against the database**

```bash
pnpm tsx src/lib/db/migrate-departments.ts
```

Expected output:
```
Inserindo departamentos...
  18 departamentos inseridos.
Atualizando funcionários...
  N funcionários atualizados, M ignorados.
Migração concluída.
```

Any `"Departamento não encontrado"` warnings mean an employee has a department string that doesn't match the canonical list — investigate and fix manually before continuing.

- [ ] **Step 3: Verify in Drizzle Studio (optional)**

```bash
pnpm db:studio
```

Confirm that `departments` has 18 rows and `employees.department_id` is populated for rows that had a `department` text value.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/migrate-departments.ts
git commit -m "feat: add departments data migration script"
```

---

## Task 3: Drop the legacy `employees.department` text column

**Files:**
- Create: `src/lib/db/migrations/0008_drop_employee_department_text.sql`
- Modify: `src/lib/db/schema.ts` (remove `department: text(...)` from `employees`)

- [ ] **Step 1: Write the SQL migration**

Create `src/lib/db/migrations/0008_drop_employee_department_text.sql`:

```sql
ALTER TABLE "employees" DROP COLUMN "department";
```

- [ ] **Step 2: Remove `department` from the `employees` table in `src/lib/db/schema.ts`**

In the `employees` table definition, delete this line:

```ts
department: text('department'),
```

The table should now have `departmentId` only (no `department` text).

- [ ] **Step 3: Apply the migration**

```bash
pnpm db:migrate
```

Expected: Migration `0008_drop_employee_department_text` applied, no errors.

- [ ] **Step 4: Typecheck — expect errors**

```bash
pnpm typecheck
```

There will be TypeScript errors in files that reference `employees.department` (text). That is expected — Tasks 4–10 fix them.

- [ ] **Step 5: Commit the migration files (schema + SQL)**

```bash
git add src/lib/db/schema.ts src/lib/db/migrations/0008_drop_employee_department_text.sql
git commit -m "feat: drop legacy employees.department text column"
```

---

## Task 4: Department validator and service

**Files:**
- Create: `src/lib/validators/department.ts`
- Create: `src/server/services/departments.ts`

- [ ] **Step 1: Create `src/lib/validators/department.ts`**

```ts
import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres.').max(100),
});

export const updateDepartmentSchema = createDepartmentSchema;

export type CreateDepartmentInput = z.output<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.output<typeof updateDepartmentSchema>;
```

- [ ] **Step 2: Create `src/server/services/departments.ts`**

```ts
import { asc, eq, ne } from 'drizzle-orm';

import type { CurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { departments } from '@/lib/db/schema';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import type { CreateDepartmentInput, UpdateDepartmentInput } from '@/lib/validators/department';

export type Department = typeof departments.$inferSelect;

function requireRhOrAdmin(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError('Apenas RH e administradores podem gerenciar departamentos.');
  }
}

export async function listDepartments(activeOnly = false): Promise<Department[]> {
  const db = getDb();
  return db.query.departments.findMany({
    where: activeOnly ? eq(departments.active, true) : undefined,
    orderBy: [asc(departments.name)],
  });
}

export async function getDepartment(id: string): Promise<Department> {
  const db = getDb();
  const dept = await db.query.departments.findFirst({
    where: eq(departments.id, id),
  });
  if (!dept) {
    throw new NotFoundError('Departamento não encontrado.');
  }
  return dept;
}

async function assertNameUnique(name: string, excludeId?: string) {
  const db = getDb();
  const existing = await db.query.departments.findFirst({
    where: excludeId
      ? (t, { and, eq: eqFn, ne: neFn }) => and(eqFn(t.name, name), neFn(t.id, excludeId))
      : (t, { eq: eqFn }) => eqFn(t.name, name),
  });
  if (existing) {
    throw new ConflictError('Já existe um departamento com este nome.');
  }
}

export async function createDepartment(
  user: CurrentUser,
  data: CreateDepartmentInput,
): Promise<Department> {
  requireRhOrAdmin(user);
  await assertNameUnique(data.name);
  const db = getDb();
  const [dept] = await db.insert(departments).values(data).returning();
  if (!dept) {
    throw new Error('Não foi possível criar o departamento.');
  }
  return dept;
}

export async function updateDepartment(
  user: CurrentUser,
  id: string,
  data: UpdateDepartmentInput,
): Promise<Department> {
  requireRhOrAdmin(user);
  await getDepartment(id);
  await assertNameUnique(data.name, id);
  const db = getDb();
  const [updated] = await db
    .update(departments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(departments.id, id))
    .returning();
  if (!updated) {
    throw new Error('Não foi possível atualizar o departamento.');
  }
  return updated;
}

export async function toggleDepartmentActive(user: CurrentUser, id: string): Promise<Department> {
  requireRhOrAdmin(user);
  const dept = await getDepartment(id);
  const db = getDb();
  const [updated] = await db
    .update(departments)
    .set({ active: !dept.active, updatedAt: new Date() })
    .where(eq(departments.id, id))
    .returning();
  if (!updated) {
    throw new Error('Não foi possível atualizar o departamento.');
  }
  return updated;
}
```

Note: `assertNameUnique` uses `db.query` with a where callback to avoid importing `ne`/`and` from drizzle-orm just for this one function. If the pattern in this codebase uses the `and(eq(...), ne(...))` pattern from `drizzle-orm`, use that instead for consistency:

```ts
async function assertNameUnique(name: string, excludeId?: string) {
  const db = getDb();
  const conditions = [eq(departments.name, name)];
  if (excludeId) conditions.push(ne(departments.id, excludeId));
  const [existing] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(and(...conditions));
  if (existing) {
    throw new ConflictError('Já existe um departamento com este nome.');
  }
}
```

Use whichever form matches the rest of the codebase. The `employees.ts` service uses `and/eq/ne` imports from `drizzle-orm` — use that pattern.

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expect errors only in files that still reference the removed `employees.department` text column. This task's new files should be clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/validators/department.ts src/server/services/departments.ts
git commit -m "feat: add departments service and validator"
```

---

## Task 5: Department server actions and CRUD pages

**Files:**
- Create: `src/server/actions/departments.ts`
- Create: `src/components/forms/DepartmentForm.tsx`
- Create: `src/components/tables/DepartmentsTable.tsx`
- Create: `src/app/rh/departamentos/page.tsx`
- Create: `src/app/rh/departamentos/novo/page.tsx`
- Create: `src/app/rh/departamentos/[id]/editar/page.tsx`

- [ ] **Step 1: Create `src/server/actions/departments.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth';
import { UnauthorizedError, ValidationError } from '@/lib/errors';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from '@/lib/validators/department';
import {
  createDepartment,
  toggleDepartmentActive,
  updateDepartment,
} from '@/server/services/departments';

export type DepartmentActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function createDepartmentAction(data: unknown): Promise<DepartmentActionState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Sessão expirada. Entre novamente.' };

  const parsed = createDepartmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createDepartment(user, parsed.data);
    revalidatePath('/rh/departamentos');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function updateDepartmentAction(
  id: string,
  data: unknown,
): Promise<DepartmentActionState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Sessão expirada. Entre novamente.' };

  const parsed = updateDepartmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateDepartment(user, id, parsed.data);
    revalidatePath('/rh/departamentos');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function toggleDepartmentActiveAction(id: string): Promise<DepartmentActionState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Sessão expirada. Entre novamente.' };

  try {
    await toggleDepartmentActive(user, id);
    revalidatePath('/rh/departamentos');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}
```

- [ ] **Step 2: Create `src/components/forms/DepartmentForm.tsx`**

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createDepartmentSchema } from '@/lib/validators/department';
import type { DepartmentActionState } from '@/server/actions/departments';

type DepartmentFormValues = z.input<typeof createDepartmentSchema>;
type DepartmentFormOutput = z.output<typeof createDepartmentSchema>;

type DepartmentFormProps = {
  defaultValues?: Partial<DepartmentFormValues>;
  action: (data: unknown) => Promise<DepartmentActionState>;
};

export function DepartmentForm({ defaultValues, action }: DepartmentFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DepartmentFormValues, unknown, DepartmentFormOutput>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: { name: defaultValues?.name ?? '' },
  });

  function onSubmit(data: DepartmentFormOutput) {
    startTransition(async () => {
      const result = await action(data);

      if (result.success) {
        router.push('/rh/departamentos');
        router.refresh();
        return;
      }

      if (result.error) {
        setError('root', { message: result.error });
      }

      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof DepartmentFormOutput, { message: messages[0] });
          }
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      {errors.root ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.root.message}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          {...register('name')}
          aria-invalid={Boolean(errors.name)}
          placeholder="Ex: Tecnologia da informação"
        />
        {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/rh/departamentos')}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `src/components/tables/DepartmentsTable.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import type { Department } from '@/server/services/departments';
import { toggleDepartmentActiveAction } from '@/server/actions/departments';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type DepartmentsTableProps = {
  departments: Department[];
};

export function DepartmentsTable({ departments }: DepartmentsTableProps) {
  if (departments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum departamento encontrado.</p>
    );
  }

  return (
    <div className="rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 text-left font-medium">Nome</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <DepartmentRow key={dept.id} department={dept} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DepartmentRow({ department }: { department: Department }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleDepartmentActiveAction(department.id);
    });
  }

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3">{department.name}</td>
      <td className="px-4 py-3">
        <span
          className={
            department.active
              ? 'text-xs font-medium text-green-700'
              : 'text-xs font-medium text-muted-foreground'
          }
        >
          {department.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/rh/departamentos/${department.id}/editar`}>Editar</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={toggle}
          >
            {department.active ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </td>
    </tr>
  );
}
```

- [ ] **Step 4: Create `src/app/rh/departamentos/page.tsx`**

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DepartmentsTable } from '@/components/tables/DepartmentsTable';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { listDepartments } from '@/server/services/departments';

export default async function DepartamentosPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'RH' && user.role !== 'ADMIN') redirect('/avaliar');

  const allDepts = await listDepartments();
  const ativos = allDepts.filter((d) => d.active);
  const inativos = allDepts.filter((d) => !d.active);

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="Departamentos"
          description="Gerencie os departamentos da empresa."
          actions={
            <Link href="/rh/departamentos/novo" className={cn(buttonVariants(), 'shrink-0')}>
              Novo departamento
            </Link>
          }
        />

        <div className="grid gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Ativos ({ativos.length})
          </h2>
          <DepartmentsTable departments={ativos} />

          {inativos.length > 0 && (
            <>
              <h2 className="mt-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Inativos ({inativos.length})
              </h2>
              <DepartmentsTable departments={inativos} />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 5: Create `src/app/rh/departamentos/novo/page.tsx`**

```tsx
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DepartmentForm } from '@/components/forms/DepartmentForm';
import { getCurrentUser } from '@/lib/auth';
import { createDepartmentAction } from '@/server/actions/departments';

export default async function NovoDepartamentoPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'RH' && user.role !== 'ADMIN') redirect('/avaliar');

  return (
    <AppShell>
      <div className="mx-auto grid w-full max-w-lg gap-6">
        <PageHeader
          title="Novo departamento"
          description="Cadastre um departamento para organizar os funcionários."
        />
        <DepartmentForm action={createDepartmentAction} />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 6: Create `src/app/rh/departamentos/[id]/editar/page.tsx`**

```tsx
import { notFound, redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DepartmentForm } from '@/components/forms/DepartmentForm';
import { getCurrentUser } from '@/lib/auth';
import { updateDepartmentAction } from '@/server/actions/departments';
import { getDepartment } from '@/server/services/departments';

type Props = { params: Promise<{ id: string }> };

export default async function EditarDepartamentoPage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'RH' && user.role !== 'ADMIN') redirect('/avaliar');

  const { id } = await params;

  let dept;
  try {
    dept = await getDepartment(id);
  } catch {
    notFound();
  }

  const action = updateDepartmentAction.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto grid w-full max-w-lg gap-6">
        <PageHeader
          title="Editar departamento"
          description="Atualize o nome do departamento."
        />
        <DepartmentForm defaultValues={{ name: dept.name }} action={action} />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 7: Add "Departamentos" to sidebar in `src/components/layout/AppSidebar.tsx`**

Import the `Building2` icon from `lucide-react`:

```ts
import {
  Building2,
  CalendarCheck,
  // ... (keep existing imports)
} from 'lucide-react';
```

Add the sidebar item to the `items` array, after `'Checklist'`:

```ts
{ href: '/rh/departamentos', label: 'Departamentos', icon: Building2, roles: ['RH', 'ADMIN'] },
```

- [ ] **Step 8: Typecheck**

```bash
pnpm typecheck
```

Expect errors only in files still referencing `employees.department` (text). This task's files should be clean.

- [ ] **Step 9: Commit**

```bash
git add \
  src/server/actions/departments.ts \
  src/components/forms/DepartmentForm.tsx \
  src/components/tables/DepartmentsTable.tsx \
  src/app/rh/departamentos/page.tsx \
  src/app/rh/departamentos/novo/page.tsx \
  "src/app/rh/departamentos/[id]/editar/page.tsx" \
  src/components/layout/AppSidebar.tsx
git commit -m "feat: add departments CRUD UI and sidebar navigation"
```

---

## Task 6: Update employee validator and service

**Files:**
- Modify: `src/lib/validators/employee.ts`
- Modify: `src/server/services/employees.ts`

- [ ] **Step 1: Update `src/lib/validators/employee.ts`**

Remove the `DEPARTMENTS` const, `DepartmentValue` type, and their exports. Change the `department` field to `departmentId`:

```ts
import { z } from 'zod';

// Transforma string vazia em null — necessário para inputs opcionais de formulário HTML
const emptyToNull = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v));

export const TURNOS = ['PRIMEIRO', 'SEGUNDO', 'TERCEIRO'] as const;
export type TurnoValue = (typeof TURNOS)[number];

export const TURNO_LABELS: Record<TurnoValue, string> = {
  PRIMEIRO: 'Primeiro',
  SEGUNDO: 'Segundo',
  TERCEIRO: 'Terceiro',
};

export const EQUIPAMENTOS = ['Notebook', 'Monitor', 'EPI'] as const;
export type EquipamentoValue = (typeof EQUIPAMENTOS)[number];

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres.').max(255),
  email: emptyToNull.pipe(z.string().email('E-mail inválido.').max(255).nullable()),
  registration: emptyToNull.pipe(z.string().max(50).nullable()),
  position: emptyToNull.pipe(z.string().max(255).nullable()),
  departmentId: emptyToNull.pipe(z.string().uuid('Departamento inválido.').nullable()),
  turno: emptyToNull.pipe(z.enum(TURNOS).nullable()),
  managerId: emptyToNull.pipe(z.string().uuid('Gestor inválido.').nullable()),
  equipamentos: z.array(z.enum(EQUIPAMENTOS)).default([]),
});

export const updateEmployeeSchema = createEmployeeSchema;

export type CreateEmployeeInput = z.output<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.output<typeof updateEmployeeSchema>;
```

- [ ] **Step 2: Update `src/server/services/employees.ts`**

Update the import and type for `ListEmployeesFilters`. Replace `department?: string` with `departmentId?: string`. Update `buildEmployeeConditions` to use `employees.departmentId`. Remove the `listActiveDepartments` function. Update `EmployeeWithManager` to include the joined department name.

Full updated file:

```ts
import { and, asc, count, eq, ilike, ne, or, type SQL } from 'drizzle-orm';

import type { CurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { departments, employees, users } from '@/lib/db/schema';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/validators/employee';

function requireRhOrAdmin(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError('Apenas RH e administradores podem gerenciar funcionários.');
  }
}

export type EmployeeWithManager = typeof employees.$inferSelect & {
  manager: Pick<typeof users.$inferSelect, 'id' | 'name'> | null;
  department: Pick<typeof departments.$inferSelect, 'id' | 'name'> | null;
};

export type Manager = Pick<typeof users.$inferSelect, 'id' | 'name' | 'email' | 'department'>;

export type ListEmployeesFilters = {
  search?: string;
  managerId?: string;
  departmentId?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
};

export type ListEmployeesResult = {
  rows: EmployeeWithManager[];
  total: number;
};

function buildEmployeeConditions(filters: ListEmployeesFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.active !== undefined) {
    conditions.push(eq(employees.active, filters.active));
  }

  if (filters.managerId) {
    conditions.push(eq(employees.managerId, filters.managerId));
  }

  if (filters.departmentId) {
    conditions.push(eq(employees.departmentId, filters.departmentId));
  }

  const search = filters.search?.trim();
  if (search) {
    const term = `%${search}%`;
    const searchCondition = or(ilike(employees.name, term), ilike(employees.email, term));
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return conditions;
}

export async function listEmployees(
  filters: ListEmployeesFilters = {},
): Promise<ListEmployeesResult> {
  const db = getDb();
  const conditions = buildEmployeeConditions(filters);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ total: count() })
    .from(employees)
    .where(whereClause);

  const total = countResult?.total ?? 0;

  const baseQuery = db
    .select({
      employee: employees,
      manager: {
        id: users.id,
        name: users.name,
      },
      department: {
        id: departments.id,
        name: departments.name,
      },
    })
    .from(employees)
    .leftJoin(users, eq(employees.managerId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(whereClause)
    .orderBy(asc(employees.name));

  const rawRows = await (filters.limit !== undefined
    ? baseQuery.limit(filters.limit).offset(filters.offset ?? 0)
    : baseQuery);

  const rows = rawRows.map(({ employee, manager, department }) => ({
    ...employee,
    manager: manager?.id ? { id: manager.id, name: manager.name } : null,
    department: department?.id ? { id: department.id, name: department.name } : null,
  }));

  return { rows, total };
}

export async function getEmployee(id: string): Promise<EmployeeWithManager> {
  const db = getDb();

  const [row] = await db
    .select({
      employee: employees,
      manager: {
        id: users.id,
        name: users.name,
      },
      department: {
        id: departments.id,
        name: departments.name,
      },
    })
    .from(employees)
    .leftJoin(users, eq(employees.managerId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(employees.id, id));

  if (!row) {
    throw new NotFoundError('Funcionário não encontrado.');
  }

  return {
    ...row.employee,
    manager: row.manager?.id ? { id: row.manager.id, name: row.manager.name } : null,
    department: row.department?.id ? { id: row.department.id, name: row.department.name } : null,
  };
}

export async function listManagers(): Promise<Manager[]> {
  const db = getDb();

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      department: users.department,
    })
    .from(users)
    .where(and(eq(users.role, 'GESTOR'), eq(users.active, true)))
    .orderBy(asc(users.name));
}

export async function listEvaluationEmployeesForUser(user: CurrentUser) {
  if (user.role === 'GESTOR') {
    return getDb()
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(eq(employees.managerId, user.id))
      .orderBy(asc(employees.name));
  }

  if (user.role === 'RH' || user.role === 'ADMIN') {
    return getDb()
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .orderBy(asc(employees.name));
  }

  throw new UnauthorizedError();
}

export async function listEvaluationManagersForUser(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError();
  }

  return listManagers();
}

async function assertManagerCanBeAssigned(managerId: string | null) {
  if (!managerId) {
    return;
  }

  const db = getDb();
  const [manager] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, managerId), eq(users.role, 'GESTOR'), eq(users.active, true)));

  if (!manager) {
    throw new ValidationError('Gestor inválido ou inativo.');
  }
}

async function assertEmailUnique(email: string, excludeId?: string) {
  const db = getDb();
  const conditions: SQL[] = [eq(employees.email, email)];

  if (excludeId) {
    conditions.push(ne(employees.id, excludeId));
  }

  const [existing] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(...conditions));

  if (existing) {
    throw new ConflictError('Já existe um funcionário com este e-mail.');
  }
}

async function assertRegistrationUnique(registration: string, excludeId?: string) {
  const db = getDb();
  const conditions: SQL[] = [eq(employees.registration, registration)];

  if (excludeId) {
    conditions.push(ne(employees.id, excludeId));
  }

  const [existing] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(...conditions));

  if (existing) {
    throw new ConflictError('Já existe um funcionário com esta matrícula.');
  }
}

export async function createEmployee(user: CurrentUser, data: CreateEmployeeInput) {
  requireRhOrAdmin(user);
  await assertManagerCanBeAssigned(data.managerId);

  if (data.email) {
    await assertEmailUnique(data.email);
  }

  if (data.registration) {
    await assertRegistrationUnique(data.registration);
  }

  const db = getDb();
  const [employee] = await db.insert(employees).values(data).returning();

  if (!employee) {
    throw new Error('Não foi possível criar o funcionário.');
  }

  return employee;
}

export async function updateEmployee(user: CurrentUser, id: string, data: UpdateEmployeeInput) {
  requireRhOrAdmin(user);
  await getEmployee(id);
  await assertManagerCanBeAssigned(data.managerId);

  if (data.email) {
    await assertEmailUnique(data.email, id);
  }

  if (data.registration) {
    await assertRegistrationUnique(data.registration, id);
  }

  const db = getDb();
  const [updated] = await db
    .update(employees)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(employees.id, id))
    .returning();

  if (!updated) {
    throw new Error('Não foi possível atualizar o funcionário.');
  }

  return updated;
}

export async function deactivateEmployee(user: CurrentUser, id: string) {
  requireRhOrAdmin(user);
  await getEmployee(id);

  const db = getDb();
  await db
    .update(employees)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(employees.id, id));
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Errors will remain in files that call `listEmployees` with `department:` key, and in EmployeeForm/EmployeeFilters that import `DEPARTMENTS`. Those are fixed in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add src/lib/validators/employee.ts src/server/services/employees.ts
git commit -m "feat: update employee schema to use departmentId FK"
```

---

## Task 7: Update EmployeeForm and EmployeeFilters

**Files:**
- Modify: `src/components/forms/EmployeeForm.tsx`
- Modify: `src/components/forms/EmployeeFilters.tsx`

- [ ] **Step 1: Update `src/components/forms/EmployeeForm.tsx`**

Remove the `DEPARTMENTS` import. Add a `departments` prop. Change `department` field to `departmentId`. Fix manager filtering to compare `m.department === selectedDepartment?.name`.

Replace the top of the file (imports + types):

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createEmployeeSchema,
  EQUIPAMENTOS,
  type EquipamentoValue,
  TURNO_LABELS,
  TURNOS,
} from '@/lib/validators/employee';
import type { EmployeeActionState } from '@/server/actions/employees';

type EmployeeFormValues = z.input<typeof createEmployeeSchema>;
type EmployeeFormOutput = z.output<typeof createEmployeeSchema>;
type Manager = { id: string; name: string; email: string; department: string | null };
type Department = { id: string; name: string };

type EmployeeFormProps = {
  managers: Manager[];
  departments: Department[];
  defaultValues?: Partial<Record<Exclude<keyof EmployeeFormValues, 'equipamentos'>, string | null>> & {
    equipamentos?: EquipamentoValue[];
  };
  action: (data: unknown) => Promise<EmployeeActionState>;
};
```

Replace `defaultValues` in `useForm` — change `department` to `departmentId`:

```tsx
defaultValues: {
  name: valueOrEmpty(defaultValues?.name),
  email: valueOrEmpty(defaultValues?.email),
  registration: valueOrEmpty(defaultValues?.registration),
  position: valueOrEmpty(defaultValues?.position),
  departmentId: valueOrEmpty(defaultValues?.departmentId),
  turno: valueOrEmpty(defaultValues?.turno),
  managerId: valueOrEmpty(defaultValues?.managerId),
  equipamentos: defaultValues?.equipamentos ?? [],
},
```

Replace the watched values and `filteredManagers`:

```tsx
const managerId = useWatch({ control, name: 'managerId' });
const turno = useWatch({ control, name: 'turno' });
const departmentId = useWatch({ control, name: 'departmentId' });
const equipamentos = useWatch({ control, name: 'equipamentos' }) ?? [];

const selectedDepartment = departments.find((d) => d.id === departmentId) ?? null;
const filteredManagers = selectedDepartment
  ? managers.filter((m) => m.department === selectedDepartment.name)
  : [];
```

Update the `useEffect` that clears an invalid manager:

```tsx
useEffect(() => {
  if (mounted.current) return;
  mounted.current = true;
  if (!departmentId || !managerId) return;
  const dept = departments.find((d) => d.id === departmentId);
  if (!dept) return;
  const inList = managers
    .filter((m) => m.department === dept.name)
    .some((m) => m.id === managerId);
  if (!inList) {
    setValue('managerId', '', { shouldDirty: false, shouldValidate: false });
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Replace the Departamento `<Select>` block in the JSX:

```tsx
<div className="grid gap-2">
  <Label htmlFor="departmentId">Departamento</Label>
  <Select
    value={departmentId || 'none'}
    onValueChange={(value) => {
      const next = value && value !== 'none' ? value : '';
      setValue('departmentId', next, { shouldDirty: true, shouldValidate: true });
      setValue('managerId', '', { shouldDirty: true, shouldValidate: false });
    }}
  >
    <SelectTrigger id="departmentId" className="w-full" aria-invalid={Boolean(errors.departmentId)}>
      <SelectValue placeholder="Selecione um departamento" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Sem departamento</SelectItem>
      {departments.map((dept) => (
        <SelectItem key={dept.id} value={dept.id}>
          {dept.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  {errors.departmentId ? (
    <p className="text-sm text-destructive">{errors.departmentId.message}</p>
  ) : null}
</div>
```

Update the `managerDisabled` and `managerPlaceholder` variables (change `!department` to `!departmentId`):

```tsx
const managerDisabled = !departmentId || filteredManagers.length === 0;
const managerPlaceholder = !departmentId
  ? 'Selecione um departamento primeiro'
  : filteredManagers.length === 0
    ? 'Nenhum gestor para este departamento'
    : 'Selecione um gestor';
```

Update the manager `<Select>` value:

```tsx
value={managerDisabled ? '' : (managerId || 'none')}
```

(No change needed here — it already uses `managerId`.)

Also update `EmployeeFormProps` destructuring to include `departments`:

```tsx
export function EmployeeForm({ managers, departments, defaultValues, action }: EmployeeFormProps) {
```

- [ ] **Step 2: Update `src/components/forms/EmployeeFilters.tsx`**

Remove the `DEPARTMENTS` import. Add a `departments` prop. Change filter to use UUID:

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Manager = { id: string; name: string };
type Department = { id: string; name: string };

type EmployeeFiltersProps = {
  managers: Manager[];
  departments: Department[];
  defaultValues: {
    search?: string;
    status?: string;
    managerId?: string;
    departmentId?: string;
  };
};

export function EmployeeFilters({ managers, departments, defaultValues }: EmployeeFiltersProps) {
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm"
      action=""
      method="get"
    >
      <div className="grid gap-1">
        <Label htmlFor="search">Buscar</Label>
        <Input
          id="search"
          name="search"
          placeholder="Nome ou e-mail"
          defaultValue={defaultValues.search ?? ''}
          className="w-56"
        />
      </div>

      <div className="grid gap-1">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues.status ?? 'active'}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      <div className="grid gap-1">
        <Label htmlFor="managerId">Gestor</Label>
        <select
          id="managerId"
          name="managerId"
          defaultValue={defaultValues.managerId ?? ''}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">Todos os gestores</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <Label htmlFor="departmentId">Departamento</Label>
        <select
          id="departmentId"
          name="departmentId"
          defaultValue={defaultValues.departmentId ?? ''}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">Todos os departamentos</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit">Filtrar</Button>
    </form>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Errors will remain in the page files that pass props to these components and in validator/service for evaluations. Next tasks fix those.

- [ ] **Step 4: Commit**

```bash
git add src/components/forms/EmployeeForm.tsx src/components/forms/EmployeeFilters.tsx
git commit -m "feat: update EmployeeForm and EmployeeFilters to use department FK"
```

---

## Task 8: Update funcionários pages

**Files:**
- Modify: `src/app/funcionarios/page.tsx`
- Modify: `src/app/funcionarios/novo/page.tsx`
- Modify: `src/app/funcionarios/[id]/editar/page.tsx`

- [ ] **Step 1: Read `src/app/funcionarios/page.tsx`** and identify where `department` filter query param is read and where `EmployeeFilters` is rendered. Change:
  - `sp.get('department')` → `sp.get('departmentId')`
  - Pass `departmentId` to `listEmployees`
  - Load `departments` with `listDepartments(true)` (active only)
  - Pass `departments` to `<EmployeeFilters>`

Add import:
```ts
import { listDepartments } from '@/server/services/departments';
```

Change the query param reading:
```ts
const departmentId = sp.get('departmentId') ?? undefined;
```

Add to the parallel data fetching:
```ts
const [{ rows, total }, managers, departments] = await Promise.all([
  listEmployees({ search, managerId, departmentId, active, limit, offset }),
  listManagers(),
  listDepartments(true),
]);
```

Update the `<EmployeeFilters>` props:
```tsx
<EmployeeFilters
  managers={managers}
  departments={departments}
  defaultValues={{ search, status, managerId, departmentId }}
/>
```

- [ ] **Step 2: Read `src/app/funcionarios/novo/page.tsx`** and add departments loading. Add import and load:

```ts
import { listDepartments } from '@/server/services/departments';

// inside the page function:
const [managers, departments] = await Promise.all([
  listManagers(),
  listDepartments(true),
]);
```

Pass `departments` to `<EmployeeForm>`:
```tsx
<EmployeeForm managers={managers} departments={departments} action={createEmployeeAction} />
```

- [ ] **Step 3: Read `src/app/funcionarios/[id]/editar/page.tsx`** and do the same. Also update `defaultValues` to use `departmentId` instead of `department`:

```ts
defaultValues={{
  // ... other fields
  departmentId: employee.departmentId ?? '',
  // remove: department: employee.department ?? '',
}}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add \
  src/app/funcionarios/page.tsx \
  src/app/funcionarios/novo/page.tsx \
  "src/app/funcionarios/[id]/editar/page.tsx"
git commit -m "feat: load departments from DB in employee pages"
```

---

## Task 9: Update evaluations service and history filters

**Files:**
- Modify: `src/server/services/evaluations.ts`
- Modify: `src/lib/validators/evaluation-history.ts`
- Modify: `src/components/forms/EvaluationHistoryFilters.tsx`
- Modify: `src/app/rh/historico/page.tsx`
- Modify: `src/app/historico/page.tsx`

- [ ] **Step 1: Update `src/lib/validators/evaluation-history.ts`**

Change the `department` field from `optionalString` to `optionalUuid`:

```ts
export const evaluationHistoryFiltersSchema = z.object({
  employeeId: optionalUuid.optional(),
  evaluatorId: optionalUuid.optional(),
  dateFrom: optionalDate.optional(),
  dateTo: optionalDate.optional(),
  departmentId: optionalUuid.optional(),
  page: optionalPositiveInt.default(1),
  pageSize: optionalPositiveInt.default(20),
});
```

Remove the `department` field entirely. Also remove the `optionalString` definition if it's no longer used by any other field in the file.

- [ ] **Step 2: Update `src/server/services/evaluations.ts`**

In `listEvaluations`, change the department filter from text to UUID. Find the `EvaluationHistoryFilters` usage (the filter type now has `departmentId` instead of `department`). Import `departments` from schema.

In the `listEvaluations` function, change:
```ts
// old
if (filters.department) {
  conditions.push(eq(employees.department, filters.department));
}
```
to:
```ts
// new
if (filters.departmentId) {
  conditions.push(eq(employees.departmentId, filters.departmentId));
}
```

Also add `departments` to the join and select if the department name is surfaced in `EvaluationHistoryItem`. Read the full function first to see if `department` is returned in the result type — if so, join `departments` table and return `department.name` instead of `employees.department`.

- [ ] **Step 3: Update `src/components/forms/EvaluationHistoryFilters.tsx`**

Read the file first. Add a `departments` prop; replace the hardcoded DEPARTMENTS list (if any) or the free-text department input with a select that renders `{id, name}` pairs. Change the query param name from `department` to `departmentId`.

The filter form should have:
```tsx
type Department = { id: string; name: string };

type EvaluationHistoryFiltersProps = {
  // ... existing props
  departments: Department[];
  defaultValues: {
    // ... existing
    departmentId?: string;
    // remove: department?: string;
  };
};
```

And in the JSX, render:
```tsx
<select name="departmentId" defaultValue={defaultValues.departmentId ?? ''} ...>
  <option value="">Todos os departamentos</option>
  {departments.map((d) => (
    <option key={d.id} value={d.id}>{d.name}</option>
  ))}
</select>
```

- [ ] **Step 4: Update `src/app/rh/historico/page.tsx` and `src/app/historico/page.tsx`**

In each:
- Add import `listDepartments` from departments service
- Change `sp.get('department')` → `sp.get('departmentId')`
- Load departments in parallel
- Pass `departments` and `departmentId` to `<EvaluationHistoryFilters>`

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add \
  src/lib/validators/evaluation-history.ts \
  src/server/services/evaluations.ts \
  src/components/forms/EvaluationHistoryFilters.tsx \
  src/app/rh/historico/page.tsx \
  src/app/historico/page.tsx
git commit -m "feat: update evaluation history filter to use departmentId"
```

---

## Task 10: Update seed and final typecheck

**Files:**
- Modify: `src/lib/db/seed.ts`

- [ ] **Step 1: Update `src/lib/db/seed.ts`**

The seed currently uses `department: employee.department` (string) when inserting employees. It needs to:
1. Insert departments first using the same 18-name list from the migration script.
2. Build a `nameToId` map.
3. Use `departmentId: nameToId.get(employee.department) ?? null` when inserting employees.

Add the `departments` import:
```ts
import { departments, employees, users, checklistItems, evaluations, evaluationChecklistResults } from '@/lib/db/schema';
```

Before seeding employees, insert departments:
```ts
console.log('Inserindo departamentos...');
const deptNames = [
  'Administrativo', 'RH/DP', 'Financeiro/Fiscal/Contabilidade',
  'Tecnologia da informação', 'SST/MA', 'Logistica', 'Compras',
  'Comercial', 'Engenharia', 'Pintura Interna', 'Manutenção',
  'Qualidade', 'Prensa', 'Caldeiraria', 'Ferramentaria',
  'Montagem/Solda', 'Pintura', 'Picking',
];
const insertedDepts = await db
  .insert(departments)
  .values(deptNames.map((name) => ({ name })))
  .onConflictDoNothing()
  .returning();
const allDepts = await db.select({ id: departments.id, name: departments.name }).from(departments);
const deptNameToId = new Map(allDepts.map((d) => [d.name, d.id]));
console.log(`  ${insertedDepts.length} departamentos inseridos.`);
```

When building employee insert values, replace `department: emp.department` with:
```ts
departmentId: emp.department ? (deptNameToId.get(emp.department) ?? null) : null,
```

Remove any line that sets `department:` (text) on the employee insert.

- [ ] **Step 2: Final typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/seed.ts
git commit -m "feat: update seed to use departments table"
```

---

## Task 11: Update display of department name in tables and detail pages

**Files:**
- Check: `src/components/tables/EmployeesTable.tsx`
- Check: `src/app/rh/funcionarios/[employeeId]/dashboard/page.tsx`
- Check: `src/app/historico/[evaluationId]/page.tsx`

- [ ] **Step 1: Read `src/components/tables/EmployeesTable.tsx`**

If it renders `employee.department` (text), update to `employee.department?.name ?? '—'` (since `EmployeeWithManager` now has `department: { id, name } | null`).

- [ ] **Step 2: Read `src/app/rh/funcionarios/[employeeId]/dashboard/page.tsx`**

If it displays `employee.department`, update to `employee.department?.name`. The dashboard currently receives the employee from `getEmployee` which now returns the joined department.

- [ ] **Step 3: Read `src/app/historico/[evaluationId]/page.tsx`**

If it displays `item.employee.department` as a string, update to reflect the new type (`string | null` or `{ name }` depending on the evaluation service's return type after Task 9).

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Lint**

```bash
pnpm lint
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add \
  src/components/tables/EmployeesTable.tsx \
  src/app/rh/funcionarios \
  src/app/historico
git commit -m "feat: update employee department display to use joined name"
```

---

## Self-Review Checklist

- [x] **Departments CRUD**: list, create, edit, toggle active — Tasks 4, 5
- [x] **Schema migration (add)**: departments table + FK column — Task 1
- [x] **Data migration script**: populate `department_id` from existing text — Task 2
- [x] **Schema migration (drop)**: legacy `employees.department` text — Task 3
- [x] **Employee form**: uses `departmentId`, manager filter by department name — Task 7
- [x] **Employee filters**: uses `departmentId` UUID — Task 7
- [x] **Employee pages**: load departments from DB — Task 8
- [x] **Evaluation history filter**: `departmentId` UUID — Task 9
- [x] **Evaluation service**: filter by `employees.departmentId` — Task 9
- [x] **Sidebar**: "Departamentos" nav item for RH/ADMIN — Task 5
- [x] **Seed**: departments inserted first, FK used for employees — Task 10
- [x] **Display**: all UI that showed `employee.department` (text) updated — Task 11
- [x] **No `DEPARTMENTS` const references remain** after Task 6
- [x] **`listActiveDepartments` removed** from employees service (Task 6)
- [x] **`users.department` left as text** (display-only, no migration needed)
