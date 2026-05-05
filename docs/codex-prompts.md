# Prompts para o Codex — Kaishain

Cada seção é um prompt independente e autocontido. Entregue um por vez na ordem apresentada.

---

## PROMPT 1 — Gestão de Usuários do Sistema (CRUD)

### Contexto do projeto

Você está trabalhando no **Kaishain**, uma plataforma interna de avaliação diária de funcionários. O projeto usa:

- **Next.js App Router** com TypeScript strict (sem `any`)
- **Drizzle ORM** + PostgreSQL (Neon)
- **Zod** em todas as fronteiras (validators, actions)
- **shadcn/ui** para componentes (Tailwind + Radix)
- **pnpm** como gerenciador de pacotes
- **Auth.js (NextAuth)** para autenticação

Erros tipados existem em `src/lib/errors.ts`: `UnauthorizedError`, `NotFoundError`, `ValidationError`, `ConflictError`.

O usuário autenticado é obtido com `getCurrentUser()` de `src/lib/auth`, que retorna `{ id, name, email, role }` ou `null`.

Toda lógica de negócio fica em `src/server/services/`. Toda interface com a UI fica em `src/server/actions/`. Validações ficam em `src/lib/validators/`.

Padrão de páginas: Server Components com `redirect('/login')` se não autenticado, e `redirect('/avaliar')` se não autorizado. Formulários usam `react-hook-form` + `zodResolver`.

### Schema existente — tabela `users`

```ts
// src/lib/db/schema.ts
export const roleEnum = pgEnum('role', ['RH', 'GESTOR', 'ADMIN']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  department: text('department'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### O que implementar

**Regras de permissão:**
- `ADMIN`: pode criar/editar/desativar usuários de qualquer role (`RH`, `GESTOR`, `ADMIN`).
- `RH`: pode criar/editar/desativar apenas usuários com role `GESTOR`.
- `GESTOR`: sem acesso a esta seção.

**Não implementar:** reset de senha via e-mail, self-service. Ao criar usuário, gerar senha temporária padrão `Kaishain@2025` (hasheada com `bcryptjs`, que já está no projeto).

**Regras de negócio:**
- E-mail único na tabela `users` (lançar `ConflictError` se duplicado).
- Usuário desativado (`active = false`) não pode fazer login — a checagem já existe no provider Auth.js.
- Não deletar fisicamente. Apenas `active = false`.
- Não permitir desativar o próprio usuário logado.
- Não permitir RH desativar ou alterar role de outro usuário RH ou ADMIN.

### Arquivos a criar

```
src/lib/validators/user.ts
src/server/services/users.ts
src/server/actions/users.ts
src/components/forms/UserForm.tsx
src/components/tables/UsersTable.tsx
src/app/rh/usuarios/page.tsx
src/app/rh/usuarios/novo/page.tsx
src/app/rh/usuarios/[id]/editar/page.tsx
```

### Arquivos a modificar

- `src/components/layout/AppSidebar.tsx`: adicionar entrada `{ href: '/rh/usuarios', label: 'Usuários', icon: UserCog, roles: ['RH', 'ADMIN'] }`.

### Especificação dos validators (`src/lib/validators/user.ts`)

```ts
// Campos no formulário de criação:
// name: string, min 2, max 255
// email: string, email válido, max 255
// role: 'RH' | 'GESTOR' | 'ADMIN'
// department: string opcional, max 255
// (senha não é campo do formulário — gerada automaticamente)

// Campos no formulário de edição:
// name, email, role, department (mesmos do create)
// active: boolean (para ativar/desativar via toggle, não via campo)
```

### Especificação do serviço (`src/server/services/users.ts`)

Funções:
- `listUsers(user, filters)` — filtra por role, active, search (nome/email). Paginação com `limit`/`offset`. Requer RH ou ADMIN.
- `getUser(id)` — busca por id, lança `NotFoundError`.
- `createUser(user, input)` — valida permissão, verifica unicidade do email, hasheia senha padrão, insere. Lança `ConflictError` se email duplicado.
- `updateUser(user, id, input)` — valida permissão (RH não pode editar ADMIN/RH), verifica unicidade de email excluindo o próprio id.
- `deactivateUser(user, id)` — valida permissão, não permite desativar a si mesmo, não permite RH desativar ADMIN/RH.

### Especificação das actions (`src/server/actions/users.ts`)

Seguir exatamente o padrão de `src/server/actions/employees.ts`:
- Verificar sessão no início de cada action.
- Parsear input com Zod `safeParse`.
- Tratar `UnauthorizedError`, `ConflictError`, `NotFoundError`, `ValidationError` retornando `{ error: string }`.
- Chamar `revalidatePath('/rh/usuarios')` após mutações.
- Retornar `{ success: true }` em sucesso.

### UI

- Listagem (`/rh/usuarios`): tabela com colunas Nome, E-mail, Role (badge colorido: RH=azul, GESTOR=verde, ADMIN=roxo), Departamento, Status, Ações (Editar). Filtro por role e por status (ativo/inativo). Paginação idêntica à de `/funcionarios`.
- Formulário de criação/edição: campos `name`, `email`, `role` (select com opções filtradas pela permissão do usuário logado — RH só vê GESTOR), `department` (texto livre).
- Editar inclui "Zona de perigo" com botão Desativar/Reativar (igual ao padrão de `/funcionarios/[id]/editar`).

### Verificações obrigatórias ao final

```bash
pnpm typecheck
pnpm lint
```

Ambos devem passar sem erros.

---

## PROMPT 2 — Fechamento e Imutabilidade da Avaliação

### Contexto do projeto

(mesmo contexto técnico do Prompt 1 — Next.js, Drizzle, Zod, shadcn/ui, pnpm)

### Regra de negócio a implementar

**Uma avaliação pode ser editada apenas no mesmo dia em que foi criada, no fuso `America/Sao_Paulo`.**

Após a virada da meia-noite no horário de Brasília, a avaliação do dia anterior fica **imutável**. Nenhum usuário (inclusive ADMIN) pode alterá-la nesta primeira versão.

A regra de "mesmo dia" deve ser verificada comparando `evaluationDate` com o dia atual em `America/Sao_Paulo` — nunca UTC bruto.

O projeto já possui `src/lib/date.ts` com helpers de data. Use-o ou expanda-o.

### Schema atual da tabela `evaluations`

```ts
export const evaluations = pgTable(
  'evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id),
    evaluatorId: uuid('evaluator_id').notNull().references(() => users.id),
    evaluationDate: date('evaluation_date').notNull(),  // DATE sem hora
    score: smallint('score').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('uq_employee_evaluation_date').on(t.employeeId, t.evaluationDate),
    check('chk_score_range', sql`${t.score} between 0 and 10`),
  ],
);
```

**Nenhuma alteração de schema é necessária.** A data da avaliação já está em `evaluationDate` (campo DATE). A regra é verificada em código, não no banco.

### O que implementar

**1. Helper de verificação em `src/lib/date.ts`**

Adicionar (ou verificar se já existe) uma função:

```ts
export function isSameDayBrasilia(dateStr: string): boolean
// Recebe uma string 'YYYY-MM-DD' e retorna true se for o dia atual em America/Sao_Paulo
```

Use `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'` para obter o dia atual no fuso correto. Não use bibliotecas externas.

**2. Novo erro tipado em `src/lib/errors.ts`**

```ts
export class EvaluationClosedError extends Error {
  constructor(message = 'Esta avaliação não pode mais ser alterada.') {
    super(message);
    this.name = 'EvaluationClosedError';
  }
}
```

**3. Guard no serviço `src/server/services/evaluations.ts`**

Na função `upsertEvaluation`, antes de executar qualquer operação de escrita, adicionar:

```ts
if (!isSameDayBrasilia(evaluationDate)) {
  throw new EvaluationClosedError();
}
```

**4. Tratar o novo erro nas actions**

Em `src/server/actions/evaluations.ts`, na action que chama `upsertEvaluation`, adicionar `EvaluationClosedError` ao bloco de catch e retornar `{ error: error.message }`.

**5. Feedback na UI**

Na tela de avaliação (`src/app/avaliar/[id]/page.tsx` ou equivalente), quando a avaliação estiver fechada (o funcionário já foi avaliado em dia anterior), exibir um banner informativo: **"Avaliação encerrada — não é possível editar avaliações de dias anteriores."** e desabilitar o formulário.

Para isso, o componente da tela de avaliação deve receber um flag `isClosed: boolean` derivado de `!isSameDayBrasilia(evaluationDate)`.

### Verificações obrigatórias ao final

```bash
pnpm typecheck
pnpm lint
```

---

## PROMPT 3 — Importação de Funcionários via Planilha

### Contexto do projeto

(mesmo contexto técnico do Prompt 1)

A biblioteca `xlsx` (SheetJS) deve ser usada **server-side** (em uma Route Handler ou Server Action). Já está listada no stack, verifique se está no `package.json`; se não, instale com `pnpm add xlsx` e `pnpm add -D @types/xlsx`.

### Regras obrigatórias

1. **Validar linha a linha com Zod** — nunca abortar toda a importação por erro em uma linha.
2. **Retornar relatório** com: total de linhas, linhas importadas com sucesso, linhas com erro (número da linha + motivo).
3. **Nunca falhar silenciosamente** — se algo der errado, reportar.
4. **Vincular gestor**: a coluna de gestor na planilha pode ser o e-mail do gestor. O serviço busca o usuário pelo e-mail e valida que tem role `GESTOR` e está ativo.
5. **Arquivo aceito**: `.xlsx` ou `.csv`. Tamanho máximo: 5 MB (validar no servidor).
6. **Idempotência**: se o funcionário já existe pelo campo `registration` (matrícula), **atualizar** os dados (não duplicar). Se não tem matrícula, usar e-mail como identificador alternativo. Se nenhum dos dois existir na base, **criar**.

### Colunas esperadas na planilha

| Coluna | Campo no banco | Obrigatório |
|--------|---------------|------------|
| Nome | `name` | Sim |
| Email | `email` | Não |
| Matricula | `registration` | Não |
| Cargo | `position` | Não |
| Departamento | `department` | Não (deve ser um dos valores de `DEPARTMENTS` em `src/lib/validators/employee.ts`) |
| Turno | `turno` | Não (valores aceitos: `PRIMEIRO`, `SEGUNDO`, `TERCEIRO`) |
| Email do Gestor | lookup em `users` | Não |

A primeira linha da planilha é o cabeçalho. Ignorar colunas extras.

### Arquivos a criar

```
src/lib/validators/import.ts         # schema Zod de uma linha da planilha
src/server/services/import.ts        # lógica de parsing e importação
src/app/api/importar/funcionarios/route.ts  # Route Handler POST que recebe FormData com o arquivo
src/app/rh/importar/page.tsx         # página com formulário de upload
src/components/forms/ImportForm.tsx  # componente client com feedback de resultado
```

### Arquivos a modificar

- `src/components/layout/AppSidebar.tsx`: adicionar `{ href: '/rh/importar', label: 'Importar', icon: Upload, roles: ['RH', 'ADMIN'] }`.

### Especificação da Route Handler (`src/app/api/importar/funcionarios/route.ts`)

```ts
// POST /api/importar/funcionarios
// Content-Type: multipart/form-data
// Campo: file (File)
// Retorno JSON:
// {
//   total: number,
//   success: number,
//   errors: { row: number; message: string }[]
// }
```

- Verificar sessão (RH ou ADMIN, caso contrário retornar 403).
- Verificar tamanho do arquivo (máximo 5 MB).
- Verificar extensão (`.xlsx` ou `.csv`).
- Parsear com `xlsx.read(buffer, { type: 'buffer' })`.
- Processar linha a linha chamando o serviço de importação.

### Especificação do serviço (`src/server/services/import.ts`)

```ts
export type ImportRowResult =
  | { status: 'success' }
  | { status: 'error'; message: string };

export async function importEmployeeRow(
  user: CurrentUser,
  rowIndex: number,
  rawRow: unknown,
): Promise<ImportRowResult>
```

- Parsear `rawRow` com `importRowSchema` do Zod.
- Buscar gestor pelo e-mail, se fornecido.
- Verificar se funcionário já existe (por matrícula ou e-mail).
- Criar ou atualizar via `createEmployee`/`updateEmployee` do serviço existente.
- Retornar `{ status: 'error', message }` em qualquer falha — nunca lançar.

### UI (`src/app/rh/importar/page.tsx` + `ImportForm.tsx`)

- Formulário com `<input type="file" accept=".xlsx,.csv">`.
- Botão "Importar". Durante o upload: spinner + texto "Processando...".
- Após o retorno: exibir resumo (ex.: "365 linhas processadas. 360 importadas. 5 erros.").
- Se houver erros: tabela com colunas Linha e Motivo.
- Usar `fetch` com `FormData` no `onSubmit` do componente client (não server action, pois é upload de arquivo binário).

### Verificações obrigatórias ao final

```bash
pnpm typecheck
pnpm lint
```

---

## PROMPT 4 — Dashboard do Gestor

### Contexto do projeto

(mesmo contexto técnico do Prompt 1)

O gestor já tem acesso a `/avaliar` (avaliação diária) e `/historico` (histórico do time). Este prompt adiciona uma visão consolidada acessível em `/dashboard` (rota do gestor).

### Regras de permissão

- Acessível apenas por `GESTOR` e `ADMIN`.
- Um `GESTOR` vê apenas dados dos seus liderados (`employees.manager_id = user.id`).
- Um `ADMIN` pode ver dashboard de qualquer gestor (filtro opcional por gestor na URL).

### O que exibir no dashboard

**Seção 1 — Hoje**
- Total de liderados ativos.
- Quantos já foram avaliados hoje.
- Quantos estão pendentes (com lista dos nomes).
- Percentual de conclusão do dia.

**Seção 2 — Médias do time (últimos 30 dias)**
- Média geral de score do time (arredondada para 1 casa decimal).
- Funcionário com maior média (nome + média).
- Funcionário com menor média (nome + média) — destacar em laranja/vermelho se < 6.

**Seção 3 — Alertas**
- Funcionários com média dos últimos 7 dias abaixo de 6. Exibir nome, média e link para histórico.
- Funcionários sem avaliação nos últimos 3 dias úteis.

**Seção 4 — Checklist do time (últimos 7 dias)**
- Para cada item do checklist, percentual de vezes que foi marcado como `checked = true` no time.
- Ordenar do menos marcado para o mais marcado.

### Arquivos a criar

```
src/server/services/dashboard-gestor.ts  # queries de dados
src/app/dashboard/page.tsx               # página do gestor
src/components/dashboard/TeamTodayCard.tsx
src/components/dashboard/TeamAveragesCard.tsx
src/components/dashboard/AlertsCard.tsx
src/components/dashboard/ChecklistHeatCard.tsx
```

### Arquivos a modificar

- `src/components/layout/AppSidebar.tsx`: adicionar `{ href: '/dashboard', label: 'Dashboard', icon: BarChart2, roles: ['GESTOR', 'ADMIN'] }`.

### Especificação do serviço (`src/server/services/dashboard-gestor.ts`)

```ts
export async function getGestorDashboard(
  user: CurrentUser,
  targetManagerId?: string,  // ADMIN pode passar id de outro gestor
): Promise<GestorDashboardData>
```

Retorna um objeto com:

```ts
type GestorDashboardData = {
  today: {
    date: string;
    total: number;
    done: number;
    pending: number;
    pct: number;
    pendingEmployees: { id: string; name: string }[];
  };
  averages: {
    teamAvg: number | null;
    topEmployee: { id: string; name: string; avg: number } | null;
    bottomEmployee: { id: string; name: string; avg: number } | null;
  };
  alerts: {
    lowScore: { id: string; name: string; avg: number }[];  // média 7d < 6
    noRecentEvaluation: { id: string; name: string; lastDate: string | null }[];
  };
  checklistHeat: {
    checklistItemId: string;
    label: string;
    checkedPct: number;  // 0-100
  }[];
};
```

Datas devem ser calculadas em `America/Sao_Paulo`. Para "últimos 30 dias" e "últimos 7 dias", calcular `hoje - N dias` no fuso correto.

### UI

- Página Server Component que chama `getGestorDashboard` e passa dados para Cards.
- Cards são componentes de apresentação simples — sem interatividade.
- Usar shadcn `Card` para cada seção.
- Funcionários pendentes: lista simples de nomes com link para `/avaliar/{id}`.
- Alertas de nota baixa: badge vermelho com a média.
- Checklist heat: barra de progresso simples (pode usar `<progress>` nativo ou div com largura em %) com o label do item e o percentual.

### Verificações obrigatórias ao final

```bash
pnpm typecheck
pnpm lint
```

---

## PROMPT 5 — Dashboard Consolidado do RH

### Contexto do projeto

(mesmo contexto técnico do Prompt 1)

O RH já tem `/rh/avaliacoes-do-dia` (status do dia por gestor) e `/rh/historico` (listagem paginada). Este prompt adiciona uma visão analítica consolidada em `/rh/dashboard`.

### Regras de permissão

- Acessível apenas por `RH` e `ADMIN`.

### O que exibir

**Seção 1 — Resumo do mês atual**
- Total de avaliações realizadas no mês.
- Média geral de score no mês.
- Total de funcionários ativos.
- Total de gestores ativos.

**Seção 2 — Ranking por departamento (mês atual)**
Tabela com colunas: Departamento, Nº avaliações, Média, % de dias com avaliação (avaliações realizadas / (nº funcionários × dias úteis no mês)).

**Seção 3 — Ranking de gestores (mês atual)**
Tabela com colunas: Gestor, Liderados, Avaliações realizadas, % cobertura, Média do time. Ordenado por % cobertura decrescente.

**Seção 4 — Evolução semanal (últimas 8 semanas)**
Tabela simples (não gráfico) com colunas: Semana, Total avaliações, Média geral. Uma linha por semana, da mais recente para a mais antiga.

**Seção 5 — Funcionários sem avaliação nos últimos 5 dias úteis**
Lista com nome, departamento, gestor e link para histórico do funcionário.

### Arquivos a criar

```
src/server/services/dashboard-rh.ts
src/app/rh/dashboard/page.tsx
src/components/dashboard/MonthSummaryCard.tsx
src/components/dashboard/DepartmentRankingTable.tsx
src/components/dashboard/ManagerRankingTable.tsx
src/components/dashboard/WeeklyEvolutionTable.tsx
src/components/dashboard/NoRecentEvaluationList.tsx
```

### Arquivos a modificar

- `src/components/layout/AppSidebar.tsx`: adicionar `{ href: '/rh/dashboard', label: 'Dashboard', icon: BarChart2, roles: ['RH', 'ADMIN'] }`.

### Especificação do serviço (`src/server/services/dashboard-rh.ts`)

```ts
export async function getRhDashboard(user: CurrentUser): Promise<RhDashboardData>
```

Retorna:

```ts
type RhDashboardData = {
  monthSummary: {
    totalEvaluations: number;
    avgScore: number | null;
    totalActiveEmployees: number;
    totalActiveManagers: number;
  };
  byDepartment: {
    department: string;
    count: number;
    avgScore: number;
    coveragePct: number;
  }[];
  byManager: {
    managerId: string;
    managerName: string;
    totalEmployees: number;
    evaluationsDone: number;
    coveragePct: number;
    teamAvgScore: number | null;
  }[];
  weeklyEvolution: {
    weekLabel: string;  // ex: "Sem 18/05"
    totalEvaluations: number;
    avgScore: number | null;
  }[];
  noRecentEvaluation: {
    employeeId: string;
    employeeName: string;
    department: string | null;
    managerName: string | null;
    lastEvaluationDate: string | null;
  }[];
};
```

- Mês atual: do dia 1 até hoje no fuso `America/Sao_Paulo`.
- "5 dias úteis": excluir sábado e domingo ao calcular.
- Dias úteis no mês para cálculo de cobertura: contar dias de segunda a sexta do mês até hoje.

### UI

- Página Server Component que chama `getRhDashboard` e passa para os Cards.
- Cards usam shadcn `Card` + shadcn `Table` onde necessário.
- Sem gráficos interativos — apenas tabelas e números.
- `coveragePct` formatado como `87%`. `avgScore` formatado com 1 casa decimal, ex: `8.3`.

### Verificações obrigatórias ao final

```bash
pnpm typecheck
pnpm lint
```

---

## Notas gerais para todos os prompts

### Convenções do projeto

- **TypeScript strict**: proibido `any`. Use `unknown` + narrowing.
- **Server-first**: prefira Server Components. Client Components apenas onde há interatividade real.
- **Imports**: sempre com alias `@/` (ex: `import { getDb } from '@/lib/db'`).
- **Nomes**: conceitos de domínio em português (`avaliacao`, `funcionario`, `gestor`). Infra em inglês.
- **Componentes**: um por arquivo, PascalCase.
- **Comentários**: apenas quando o motivo for não óbvio. Nunca comentar o que o código já diz.
- **Migrations**: se alterar schema, gerar com `pnpm db:generate` e incluir o arquivo SQL. Nunca editar migration já existente.

### Padrão de action (referência)

```ts
'use server';
export async function minhaAction(data: unknown): Promise<{ error?: string; success?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sessao expirada. Entre novamente.' };

  // validar com Zod safeParse
  // chamar serviço
  // tratar erros tipados
  // revalidatePath
  return { success: true };
}
```

### Padrão de serviço (referência)

```ts
function requireRhOrAdmin(user: CurrentUser) {
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new UnauthorizedError('...');
  }
}

export async function minhaFuncao(user: CurrentUser, ...) {
  requireRhOrAdmin(user);
  const db = getDb();
  // lógica
}
```
