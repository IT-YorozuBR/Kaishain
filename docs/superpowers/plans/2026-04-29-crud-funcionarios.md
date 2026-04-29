# CRUD de Funcionários (Fatia 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar CRUD completo de funcionários para o papel RH — listagem com busca/filtros, cadastro, edição e desativação (soft delete).

**Architecture:** Serviço puro → Server Action (auth + Zod server-side) → UI com react-hook-form (Zod client-side). Lógica de negócio isolada em `services/employees.ts`, erros de domínio extraídos para `lib/errors.ts` e compartilhados entre serviços. Listagem usa TanStack Table no cliente com dados pré-carregados no servidor.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + Neon, Zod 4, react-hook-form + @hookform/resolvers, @tanstack/react-table (a instalar), shadcn/ui Select (a instalar via CLI), lucide-react.

---

## Mapa de arquivos

| Ação    | Arquivo                                              | Responsabilidade                                        |
| ------- | ---------------------------------------------------- | ------------------------------------------------------- |
| Criar   | `src/lib/errors.ts`                                  | Erros de domínio compartilhados                         |
| Criar   | `src/lib/validators/employee.ts`                     | Schemas Zod de funcionário                              |
| Criar   | `src/server/services/employees.ts`                   | Lógica pura: list, get, create, update, deactivate      |
| Criar   | `src/server/actions/employees.ts`                    | Camada auth + validação → delega ao serviço             |
| Criar   | `src/components/forms/EmployeeForm.tsx`              | Formulário react-hook-form (create e edit)              |
| Criar   | `src/components/forms/DeactivateButton.tsx`          | Botão com Dialog de confirmação                         |
| Criar   | `src/components/tables/EmployeesTable.tsx`           | TanStack Table com busca e filtros (client)             |
| Modificar | `src/app/funcionarios/page.tsx`                    | Conectar listagem real ao EmployeesTable                |
| Criar   | `src/app/funcionarios/novo/page.tsx`                 | Página de cadastro                                      |
| Criar   | `src/app/funcionarios/[id]/editar/page.tsx`          | Página de edição + desativação                          |
| Modificar | `src/server/services/evaluations.ts`               | Atualizar imports para `@/lib/errors`                   |
| Modificar | `src/middleware.ts`                                | Corrigir getRoleHome (RH → /funcionarios)               |
| Instalar | `@tanstack/react-table`                             | TanStack Table                                          |
| Instalar | shadcn `select`                                     | Select para dropdown de gestor                          |

---

## Task 1: Erros compartilhados + corrigir middleware

**Files:**
- Create: `src/lib/errors.ts`
- Modify: `src/server/services/evaluations.ts` (linhas 14–33)
- Modify: `src/middleware.ts` (função `getRoleHome`)

### Contexto

Os erros `UnauthorizedError`, `NotFoundError`, `ValidationError` estão definidos em `evaluations.ts`. Outros serviços precisam deles. O `getRoleHome` no middleware está errado: manda RH e ADMIN para `/avaliar` ao invés de `/funcionarios`.

- [ ] **Criar `src/lib/errors.ts`**

```ts
export class UnauthorizedError extends Error {
  constructor(message = 'Acao nao permitida.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Registro nao encontrado.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message = 'Dados invalidos.') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message = 'Registro ja existe.') {
    super(message);
    this.name = 'ConflictError';
  }
}
```

- [ ] **Atualizar `src/server/services/evaluations.ts`** — remover as três classes de erro definidas localmente (linhas 14–33) e adicionar o import:

```ts
import { NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
```

Manter tudo o mais igual.

- [ ] **Corrigir `src/middleware.ts`** — substituir a função `getRoleHome`:

```ts
function getRoleHome(role: UserRole) {
  if (role === 'GESTOR') return '/avaliar';
  return '/funcionarios'; // RH e ADMIN
}
```

- [ ] **Rodar typecheck e lint**

```bash
pnpm typecheck && pnpm lint
```

Resultado esperado: zero erros.

- [ ] **Commit**

```bash
git add src/lib/errors.ts src/server/services/evaluations.ts src/middleware.ts
git commit -m "refactor: extrair erros de dominio para lib/errors e corrigir redirect do middleware"
```

---

## Task 2: Validators Zod para funcionários

**Files:**
- Create: `src/lib/validators/employee.ts`

### Contexto

Campos opcionais do formulário enviam string vazia quando deixados em branco. O helper `emptyToNull` transforma `""` em `null` antes de validar, permitindo que campos opcionais aceitem tanto vazio quanto valor preenchido.

- [ ] **Criar `src/lib/validators/employee.ts`**

```ts
import { z } from 'zod';

// Transforma string vazia em null — necessário para inputs opcionais de formulário HTML
const emptyToNull = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v));

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres.').max(255),
  email: emptyToNull.pipe(z.string().email('E-mail invalido.').max(255).nullable()),
  registration: emptyToNull.pipe(z.string().max(50).nullable()),
  position: emptyToNull.pipe(z.string().max(255).nullable()),
  department: emptyToNull.pipe(z.string().max(255).nullable()),
  managerId: emptyToNull.pipe(z.string().uuid('Gestor invalido.').nullable()),
});

export const updateEmployeeSchema = createEmployeeSchema;

export type CreateEmployeeInput = z.output<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.output<typeof updateEmployeeSchema>;
```

- [ ] **Rodar typecheck**

```bash
pnpm typecheck
```

Resultado esperado: zero erros.

- [ ] **Commit**

```bash
git add src/lib/validators/employee.ts
git commit -m "feat: adicionar validators Zod para funcionarios"
```

---

## Task 3: Serviço de funcionários

**Files:**
- Create: `src/server/services/employees.ts`

### Contexto

Serviço puro — sem Next.js, sem Auth.js. Recebe `CurrentUser` já validado. O join com `users` é feito via `leftJoin` (sem precisar definir `relations()` no schema). Unicidade de email é checada na camada de serviço (o banco só tem unique em `registration`).

- [ ] **Criar `src/server/services/employees.ts`**

```ts
import { and, asc, eq, ilike, ne, or } from 'drizzle-orm';

import type { CurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { employees, users } from '@/lib/db/schema';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/validators/employee';

function requireRhOrAdmin(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError('Apenas RH e administradores podem gerenciar funcionarios.');
  }
}

export type EmployeeWithManager = typeof employees.$inferSelect & {
  manager: Pick<typeof users.$inferSelect, 'id' | 'name'> | null;
};

export type Manager = Pick<typeof users.$inferSelect, 'id' | 'name' | 'email'>;

export type ListEmployeesFilters = {
  search?: string;
  managerId?: string;
  active?: boolean;
};

export async function listEmployees(
  filters: ListEmployeesFilters = {},
): Promise<EmployeeWithManager[]> {
  const db = getDb();

  const conditions = [];

  if (filters.active !== undefined) {
    conditions.push(eq(employees.active, filters.active));
  }

  if (filters.managerId) {
    conditions.push(eq(employees.managerId, filters.managerId));
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(employees.name, term),
        ilike(employees.email, term),
      ),
    );
  }

  const rows = await db
    .select({
      employee: employees,
      manager: { id: users.id, name: users.name },
    })
    .from(employees)
    .leftJoin(users, eq(employees.managerId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(employees.name));

  return rows.map(({ employee, manager }) => ({
    ...employee,
    manager: manager?.id ? { id: manager.id, name: manager.name } : null,
  }));
}

export async function getEmployee(id: string): Promise<EmployeeWithManager> {
  const db = getDb();

  const [row] = await db
    .select({
      employee: employees,
      manager: { id: users.id, name: users.name },
    })
    .from(employees)
    .leftJoin(users, eq(employees.managerId, users.id))
    .where(eq(employees.id, id));

  if (!row) throw new NotFoundError('Funcionario nao encontrado.');

  return {
    ...row.employee,
    manager: row.manager?.id ? { id: row.manager.id, name: row.manager.name } : null,
  };
}

export async function listManagers(): Promise<Manager[]> {
  const db = getDb();

  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.role, 'GESTOR'), eq(users.active, true)))
    .orderBy(asc(users.name));
}

async function assertEmailUnique(email: string, excludeId?: string) {
  const db = getDb();
  const conditions = [eq(employees.email, email)];
  if (excludeId) conditions.push(ne(employees.id, excludeId));
  const [existing] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(...conditions));
  if (existing) throw new ConflictError('Ja existe um funcionario com este e-mail.');
}

async function assertRegistrationUnique(registration: string, excludeId?: string) {
  const db = getDb();
  const conditions = [eq(employees.registration, registration)];
  if (excludeId) conditions.push(ne(employees.id, excludeId));
  const [existing] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(...conditions));
  if (existing) throw new ConflictError('Ja existe um funcionario com esta matricula.');
}

export async function createEmployee(user: CurrentUser, data: CreateEmployeeInput) {
  requireRhOrAdmin(user);
  if (data.email) await assertEmailUnique(data.email);
  if (data.registration) await assertRegistrationUnique(data.registration);

  const db = getDb();
  const [employee] = await db.insert(employees).values(data).returning();
  return employee!;
}

export async function updateEmployee(
  user: CurrentUser,
  id: string,
  data: UpdateEmployeeInput,
) {
  requireRhOrAdmin(user);
  await getEmployee(id); // lança NotFoundError se não existir
  if (data.email) await assertEmailUnique(data.email, id);
  if (data.registration) await assertRegistrationUnique(data.registration, id);

  const db = getDb();
  const [updated] = await db
    .update(employees)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(employees.id, id))
    .returning();
  return updated!;
}

export async function deactivateEmployee(user: CurrentUser, id: string) {
  requireRhOrAdmin(user);
  await getEmployee(id); // lança NotFoundError se não existir
  const db = getDb();
  await db
    .update(employees)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(employees.id, id));
}
```

- [ ] **Rodar typecheck**

```bash
pnpm typecheck
```

Resultado esperado: zero erros.

- [ ] **Commit**

```bash
git add src/server/services/employees.ts
git commit -m "feat: adicionar servico de funcionarios (list, get, create, update, deactivate)"
```

---

## Task 4: Server actions de funcionários

**Files:**
- Create: `src/server/actions/employees.ts`

### Contexto

As actions recebem dados como `unknown` e re-validam com Zod (defesa em profundidade — não confiar nem no cliente). `updateEmployeeAction` e `deactivateEmployeeAction` recebem o `id` como primeiro argumento para uso com `.bind(null, id)` nos componentes client.

- [ ] **Criar `src/server/actions/employees.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { createEmployeeSchema, updateEmployeeSchema } from '@/lib/validators/employee';
import {
  createEmployee,
  deactivateEmployee,
  updateEmployee,
} from '@/server/services/employees';

export type EmployeeActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    registration?: string[];
    position?: string[];
    department?: string[];
    managerId?: string[];
  };
};

export async function createEmployeeAction(data: unknown): Promise<EmployeeActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  const parsed = createEmployeeSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createEmployee(user, parsed.data);
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: error.message };
    if (error instanceof ConflictError) return { error: error.message };
    throw error;
  }

  revalidatePath('/funcionarios');
  return { success: true };
}

export async function updateEmployeeAction(
  id: string,
  data: unknown,
): Promise<EmployeeActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  const parsed = updateEmployeeSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateEmployee(user, id, parsed.data);
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: error.message };
    if (error instanceof ConflictError) return { error: error.message };
    if (error instanceof NotFoundError) return { error: error.message };
    throw error;
  }

  revalidatePath('/funcionarios');
  revalidatePath(`/funcionarios/${id}/editar`);
  return { success: true };
}

export async function deactivateEmployeeAction(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  try {
    await deactivateEmployee(user, id);
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: error.message };
    if (error instanceof NotFoundError) return { error: error.message };
    throw error;
  }

  revalidatePath('/funcionarios');
  return {};
}
```

- [ ] **Rodar typecheck**

```bash
pnpm typecheck
```

Resultado esperado: zero erros.

- [ ] **Commit**

```bash
git add src/server/actions/employees.ts
git commit -m "feat: adicionar server actions de funcionarios"
```

---

## Task 5: Instalar dependências faltantes

**Contexto:** `@tanstack/react-table` não está no `package.json`. O shadcn `select` não está em `src/components/ui/`. Ambos estão no stack oficial do projeto.

- [ ] **Instalar @tanstack/react-table**

```bash
pnpm add @tanstack/react-table
```

- [ ] **Adicionar componente Select via shadcn CLI**

```bash
pnpm dlx shadcn@latest add select
```

Verifique que `src/components/ui/select.tsx` foi criado.

- [ ] **Rodar typecheck**

```bash
pnpm typecheck
```

Resultado esperado: zero erros.

- [ ] **Commit**

```bash
git add src/components/ui/select.tsx pnpm-lock.yaml package.json
git commit -m "chore: instalar @tanstack/react-table e shadcn select"
```

---

## Task 6: Componente EmployeeForm

**Files:**
- Create: `src/components/forms/EmployeeForm.tsx`

### Contexto

Formulário reutilizado em create e edit. Usa react-hook-form com zodResolver para validação client-side. Ao submeter, chama a server action diretamente (sem `useActionState`) e redireciona para `/funcionarios` em caso de sucesso. Em caso de erro, exibe mensagem inline. O `action` prop é uma função que recebe `unknown` e retorna `Promise<EmployeeActionState>` — assim tanto `createEmployeeAction` quanto `updateEmployeeAction.bind(null, id)` servem.

- [ ] **Criar `src/components/forms/EmployeeForm.tsx`**

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';

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
import type { EmployeeActionState } from '@/server/actions/employees';
import { createEmployeeSchema, type CreateEmployeeInput } from '@/lib/validators/employee';

type Manager = { id: string; name: string; email: string };

type EmployeeFormProps = {
  managers: Manager[];
  defaultValues?: Partial<CreateEmployeeInput>;
  action: (data: unknown) => Promise<EmployeeActionState>;
};

export function EmployeeForm({ managers, defaultValues, action }: EmployeeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      name: '',
      email: '',
      registration: '',
      position: '',
      department: '',
      managerId: '',
      ...defaultValues,
    },
  });

  function onSubmit(data: CreateEmployeeInput) {
    startTransition(async () => {
      const result = await action(data);

      if (result.success) {
        router.push('/funcionarios');
        return;
      }

      if (result.error) {
        setError('root', { message: result.error });
      }

      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof CreateEmployeeInput, { message: messages[0] });
          }
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
      {errors.root ? (
        <p className="text-destructive text-sm">{errors.root.message}</p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="name">
          Nome <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          aria-invalid={Boolean(errors.name)}
          placeholder="Maria Silva"
        />
        {errors.name ? (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
          placeholder="maria@empresa.com"
        />
        {errors.email ? (
          <p className="text-destructive text-sm">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="registration">Matrícula</Label>
          <Input
            id="registration"
            {...register('registration')}
            aria-invalid={Boolean(errors.registration)}
            placeholder="EMP-001"
          />
          {errors.registration ? (
            <p className="text-destructive text-sm">{errors.registration.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="position">Cargo</Label>
          <Input
            id="position"
            {...register('position')}
            aria-invalid={Boolean(errors.position)}
            placeholder="Analista"
          />
          {errors.position ? (
            <p className="text-destructive text-sm">{errors.position.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="department">Departamento</Label>
          <Input
            id="department"
            {...register('department')}
            aria-invalid={Boolean(errors.department)}
            placeholder="Operações"
          />
          {errors.department ? (
            <p className="text-destructive text-sm">{errors.department.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="managerId">Gestor</Label>
          <Select
            onValueChange={(val) => setValue('managerId', val === 'none' ? '' : val)}
            defaultValue={defaultValues?.managerId ?? 'none'}
          >
            <SelectTrigger id="managerId" aria-invalid={Boolean(errors.managerId)}>
              <SelectValue placeholder="Selecione um gestor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem gestor</SelectItem>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.managerId ? (
            <p className="text-destructive text-sm">{errors.managerId.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/funcionarios')}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Rodar typecheck**

```bash
pnpm typecheck
```

Resultado esperado: zero erros.

- [ ] **Commit**

```bash
git add src/components/forms/EmployeeForm.tsx
git commit -m "feat: adicionar formulario de funcionario com react-hook-form"
```

---

## Task 7: Componente DeactivateButton

**Files:**
- Create: `src/components/forms/DeactivateButton.tsx`

### Contexto

Botão com Dialog de confirmação antes de desativar. Usa `useTransition` para mostrar estado de loading. Após desativar com sucesso, redireciona para `/funcionarios`.

- [ ] **Criar `src/components/forms/DeactivateButton.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { deactivateEmployeeAction } from '@/server/actions/employees';

type DeactivateButtonProps = {
  id: string;
  employeeName: string;
};

export function DeactivateButton({ id, employeeName }: DeactivateButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deactivateEmployeeAction(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push('/funcionarios');
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" type="button">
          Desativar funcionário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar {employeeName}?</DialogTitle>
          <DialogDescription>
            O funcionário não aparecerá mais na tela de avaliação. O histórico de avaliações é
            preservado. Esta ação pode ser revertida pelo RH.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? 'Desativando...' : 'Confirmar desativação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Rodar typecheck**

```bash
pnpm typecheck
```

- [ ] **Commit**

```bash
git add src/components/forms/DeactivateButton.tsx
git commit -m "feat: adicionar botao de desativacao com dialog de confirmacao"
```

---

## Task 8: Componente EmployeesTable (TanStack Table)

**Files:**
- Create: `src/components/tables/EmployeesTable.tsx`

### Contexto

Componente client que recebe todos os funcionários do servidor e faz filtragem/busca no cliente (dataset pequeno para ferramenta interna). Colunas: nome, e-mail, cargo, departamento, gestor, status, ações. Filtros: busca por texto, filtro por status (ativo/inativo), filtro por gestor.

- [ ] **Criar `src/components/tables/EmployeesTable.tsx`**

```tsx
'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Manager = { id: string; name: string } | null;

type Employee = {
  id: string;
  name: string;
  email: string | null;
  position: string | null;
  department: string | null;
  active: boolean;
  manager: Manager;
};

type EmployeesTableProps = {
  employees: Employee[];
  managers: { id: string; name: string }[];
};

const columnHelper = createColumnHelper<Employee>();

const columns = [
  columnHelper.accessor('name', { header: 'Nome' }),
  columnHelper.accessor('email', {
    header: 'E-mail',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('position', {
    header: 'Cargo',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('department', {
    header: 'Departamento',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor((row) => row.manager?.name ?? null, {
    id: 'manager',
    header: 'Gestor',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('active', {
    header: 'Status',
    cell: (info) =>
      info.getValue() ? (
        <Badge variant="outline">Ativo</Badge>
      ) : (
        <Badge variant="secondary">Inativo</Badge>
      ),
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: (info) => (
      <Button asChild variant="ghost" size="sm">
        <Link href={`/funcionarios/${info.row.original.id}/editar`}>
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Editar</span>
        </Link>
      </Button>
    ),
  }),
];

export function EmployeesTable({ employees, managers }: EmployeesTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [managerFilter, setManagerFilter] = useState<string>('all');

  const filtered = employees.filter((emp) => {
    if (statusFilter === 'active' && !emp.active) return false;
    if (statusFilter === 'inactive' && emp.active) return false;
    if (managerFilter !== 'all' && emp.manager?.id !== managerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return emp.name.toLowerCase().includes(q) || emp.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3">
        <div className="grid gap-1">
          <Label htmlFor="search" className="sr-only">Buscar</Label>
          <Input
            id="search"
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={managerFilter} onValueChange={setManagerFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos os gestores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os gestores</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-muted-foreground text-center">
                  Nenhum funcionário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {filtered.length} funcionário(s) encontrado(s)
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
```


- [ ] **Rodar typecheck**

```bash
pnpm typecheck
```

Resultado esperado: zero erros.

- [ ] **Commit**

```bash
git add src/components/tables/EmployeesTable.tsx
git commit -m "feat: adicionar tabela de funcionarios com TanStack Table e filtros"
```

---

## Task 9: Página de listagem

**Files:**
- Modify: `src/app/funcionarios/page.tsx`

### Contexto

Server component que carrega funcionários e gestores em paralelo, depois passa para o `EmployeesTable` (client). O link "Novo funcionário" leva para `/funcionarios/novo`.

- [ ] **Substituir o conteúdo de `src/app/funcionarios/page.tsx`**

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmployeesTable } from '@/components/tables/EmployeesTable';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { listEmployees, listManagers } from '@/server/services/employees';

export default async function FuncionariosPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'GESTOR') redirect('/avaliar');

  const [employees, managers] = await Promise.all([
    listEmployees(),
    listManagers(),
  ]);

  return (
    <main className="bg-background min-h-dvh px-4 py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <header className="flex items-start justify-between gap-4 border-b pb-6">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-normal">Funcionários</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie o cadastro de funcionários da empresa.
            </p>
          </div>
          <Button asChild>
            <Link href="/funcionarios/novo">Novo funcionário</Link>
          </Button>
        </header>

        <EmployeesTable employees={employees} managers={managers} />
      </div>
    </main>
  );
}
```

- [ ] **Rodar typecheck**

```bash
pnpm typecheck
```

- [ ] **Rodar `pnpm dev` e testar no browser**

Checar:
- Logado como RH: página carrega com tabela (vazia se não houver dados)
- Logado como GESTOR: redireciona para `/avaliar`
- Botão "Novo funcionário" visível

- [ ] **Commit**

```bash
git add src/app/funcionarios/page.tsx
git commit -m "feat: conectar pagina de funcionarios ao servico real com tabela"
```

---

## Task 10: Página de cadastro

**Files:**
- Create: `src/app/funcionarios/novo/page.tsx`

- [ ] **Criar `src/app/funcionarios/novo/page.tsx`**

```tsx
import { redirect } from 'next/navigation';

import { EmployeeForm } from '@/components/forms/EmployeeForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { createEmployeeAction } from '@/server/actions/employees';
import { listManagers } from '@/server/services/employees';

export default async function NovoFuncionarioPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'GESTOR') redirect('/avaliar');

  const managers = await listManagers();

  return (
    <main className="bg-background min-h-dvh px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Novo funcionário</CardTitle>
          </CardHeader>
          <CardContent>
            <EmployeeForm managers={managers} action={createEmployeeAction} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
```

- [ ] **Testar no browser**

Checar:
- Form aparece com todos os campos
- Submeter sem nome: erro client-side "Nome deve ter ao menos 2 caracteres"
- Submeter com e-mail inválido: erro client-side
- Submeter com dados válidos: redireciona para `/funcionarios` e funcionário aparece na lista

- [ ] **Commit**

```bash
git add src/app/funcionarios/novo/page.tsx
git commit -m "feat: adicionar pagina de cadastro de funcionario"
```

---

## Task 11: Página de edição + desativação

**Files:**
- Create: `src/app/funcionarios/[id]/editar/page.tsx`

### Contexto

O `updateEmployeeAction` precisa do `id` — usa `.bind(null, id)` para criar uma função com a assinatura `(data: unknown) => Promise<EmployeeActionState>` que o `EmployeeForm` aceita. Funcionário inativo ainda pode ser editado (mas não aparece na tela de avaliação). A desativação fica num bloco separado ao final da página.

- [ ] **Criar `src/app/funcionarios/[id]/editar/page.tsx`**

```tsx
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
  if (!user) redirect('/login');
  if (user.role === 'GESTOR') redirect('/avaliar');

  const { id } = await params;

  let employee;
  try {
    employee = await getEmployee(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const managers = await listManagers();

  // Arrow function em vez de .bind para manter tipagem correta no TypeScript
  const boundUpdateAction = (data: unknown) => updateEmployeeAction(id, data);

  return (
    <main className="bg-background min-h-dvh px-4 py-8">
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Editar funcionário</CardTitle>
            {!employee.active && <Badge variant="secondary">Inativo</Badge>}
          </CardHeader>
          <CardContent>
            <EmployeeForm
              managers={managers}
              defaultValues={{
                name: employee.name,
                email: employee.email ?? '',
                registration: employee.registration ?? '',
                position: employee.position ?? '',
                department: employee.department ?? '',
                managerId: employee.managerId ?? '',
              }}
              action={boundUpdateAction}
            />
          </CardContent>
        </Card>

        {employee.active && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive text-base">Zona de perigo</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm">
                Funcionários desativados saem da tela de avaliação. O histórico é preservado.
              </p>
              <DeactivateButton id={employee.id} employeeName={employee.name} />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Testar no browser**

Checar:
- Abrir `/funcionarios/[id]/editar`: campos pré-populados
- Alterar nome e salvar: redireciona para `/funcionarios`, nome atualizado na lista
- E-mail duplicado: erro inline no form
- Botão "Desativar": abre dialog → confirmar → funcionário some do filtro "Ativos"
- `/funcionarios/id-inexistente/editar`: retorna 404

- [ ] **Rodar typecheck e lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Commit**

```bash
git add src/app/funcionarios/[id]/editar/page.tsx
git commit -m "feat: adicionar pagina de edicao e desativacao de funcionario"
```

---

## Verificação final

```bash
pnpm typecheck && pnpm lint
```

### Checklist de aceitação (Fatia 2)

- [ ] Logado como RH: consegue criar, editar, desativar funcionário.
- [ ] Logado como GESTOR: acessar `/funcionarios` → redirect para `/avaliar`.
- [ ] Logado como GESTOR: chamar `createEmployeeAction` diretamente → `UnauthorizedError`.
- [ ] E-mail duplicado exibe erro claro no form.
- [ ] Matrícula duplicada exibe erro claro no form.
- [ ] Funcionário desativado some do filtro "Ativos" mas aparece em "Todos".
- [ ] URL inválida em `/funcionarios/[id]/editar` → 404.
- [ ] `pnpm typecheck` e `pnpm lint` passam sem erros.
