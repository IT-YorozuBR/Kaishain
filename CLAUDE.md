@AGENTS.md

# Kaishain

Plataforma interna de avaliação e acompanhamento de funcionários. Gestores fazem avaliações diárias de seus liderados (checklist + nota de 0 a 10 + observação) e o RH gerencia o cadastro de pessoas e times.

O nome vem do japonês **会社員 (kaishain)**, "funcionário de empresa".

---

## Visão geral do produto

- **Avaliação diária**: cada gestor vê a lista de seus liderados e preenche, para cada um, um checklist de itens (booleano) e uma nota de 0 a 10 com campo de observação opcional.
- **Histórico**: as avaliações são imutáveis após o fechamento do dia (a definir regra) e ficam disponíveis para consulta pelo RH e pelo próprio gestor.
- **Cadastros**: o RH cadastra funcionários, gestores e define a hierarquia (quem reporta a quem). Em uma fase posterior, gestores poderão cadastrar seus próprios liderados.
- **Importação em massa**: RH consegue importar funcionários a partir de uma planilha (.xlsx/.csv).

### Fora do escopo desta primeira versão

- Self-service do funcionário avaliado (ele não acessa o sistema).
- Relatórios analíticos avançados / BI (apenas listagens e exportação simples).
- Notificações por e-mail / push (a avaliar em fase 2).

---

## Stack técnica

- **Framework**: Next.js (App Router) + TypeScript em modo `strict`.
- **Banco de dados**: PostgreSQL hospedado no Neon.
- **ORM**: Drizzle ORM (preferido pela leveza e type-safety) — Prisma é alternativa aceita se houver preferência.
- **Autenticação**: Auth.js (NextAuth) com provider de credenciais ou OAuth corporativo.
- **UI**: Tailwind CSS + shadcn/ui (Radix por baixo).
- **Validação**: Zod em todas as fronteiras (forms, server actions, route handlers).
- **Tabelas / data grid**: TanStack Table.
- **Importação de planilha**: SheetJS (`xlsx`) no server-side.
- **Gerenciador de pacotes**: pnpm.
- **Linter / formatter**: ESLint + Prettier.
- **Testes**: Vitest para unidade, Playwright para e2e (introduzir conforme o projeto cresce).

---

## Papéis e permissões

Três papéis principais:

| Papel    | Acessa                                                      | Não acessa                              |
| -------- | ----------------------------------------------------------- | --------------------------------------- |
| `RH`     | Cadastros, importação, relatórios, todos os históricos      | —                                       |
| `GESTOR` | Tela de avaliação dos seus liderados, histórico do seu time | Cadastros gerais, dados de outros times |
| `ADMIN`  | Tudo (super-usuário técnico)                                | —                                       |

Regras-chave:

- Um `GESTOR` **só** consegue ler/escrever avaliações para funcionários onde `funcionario.gestor_id = usuario.id`.
- Toda checagem de permissão acontece **no server** (server actions / route handlers). Nunca confiar no cliente.
- A UI esconde o que o usuário não pode acessar, mas isso é decoração — a autoridade é o backend.

---

## Modelo de dados (rascunho inicial)

Tabelas principais (snake_case no banco, camelCase no código TS):

- **`users`**: usuários do sistema (RH, gestores, admin). Campos: `id`, `name`, `email` (único), `password_hash` ou provider OAuth, `role` (`'RH' | 'GESTOR' | 'ADMIN'`), `active`, timestamps.
- **`employees`**: funcionários avaliados. Campos: `id`, `name`, `email`, `cpf`/`registration` (opcional), `position`, `department`, `manager_id` (FK → `users.id`), `active`, timestamps.
- **`checklist_items`**: itens do checklist diário (configuráveis pelo RH). Campos: `id`, `label`, `description`, `order`, `active`.
- **`evaluations`**: uma avaliação por funcionário por dia. Campos: `id`, `employee_id`, `evaluator_id` (gestor), `evaluation_date` (DATE), `score` (0–10, smallint com check), `note` (text), timestamps. Índice único em `(employee_id, evaluation_date)`.
- **`evaluation_checklist_results`**: resultado de cada item do checklist em uma avaliação. Campos: `evaluation_id`, `checklist_item_id`, `checked` (bool). PK composta.
- **`audit_logs`** (opcional, fase 2): rastreio de quem alterou o quê.

Observações:

- Datas de avaliação devem ser armazenadas como `DATE` (sem hora) para facilitar a regra "uma por dia".
- Toda operação de escrita passa por uma camada de serviço que valida o papel do usuário e a propriedade do recurso.

---

## Estrutura de pastas sugerida

```
src/
  app/
    (auth)/
      login/
    (rh)/
      funcionarios/
      checklists/
      importar/
    (gestor)/
      avaliar/
      historico/
    api/
  components/
    ui/                # componentes shadcn
    forms/
    tables/
  lib/
    auth/              # config Auth.js, helpers de sessão
    db/                # cliente Drizzle, schema, migrations
    permissions/       # funções tipo canEvaluate(user, employee)
    validators/        # schemas Zod compartilhados
  server/
    actions/           # server actions agrupadas por domínio
    services/          # lógica de negócio pura, testável
  styles/
```

---

## Convenções de código

- **TypeScript estrito**: nada de `any`. Use `unknown` + narrowing quando necessário.
- **Server-first**: prefira Server Components e Server Actions. Use Client Components só onde houver interatividade real.
- **Validação na borda**: todo input externo (form, body, query, planilha importada) passa por um schema Zod antes de chegar nos serviços.
- **Erros**: serviços lançam erros tipados (`UnauthorizedError`, `NotFoundError`, `ValidationError`). A camada de UI traduz para mensagens.
- **Nomes em português** para conceitos de negócio (`avaliacao`, `funcionario`, `gestor`) quando aparecerem no domínio. Código de infra (`AuthProvider`, `DbClient`) fica em inglês. Manter consistência dentro de cada arquivo.
- **Migrations**: nunca editar uma migration aplicada — sempre gerar uma nova.
- **Componentes**: um componente por arquivo, nome do arquivo igual ao do componente em PascalCase.
- **Imports**: usar paths absolutos com alias `@/` configurado no `tsconfig.json`.

---

## Variáveis de ambiente

Mínimo esperado em `.env.local`:

```
DATABASE_URL=postgresql://...neon.tech/...
AUTH_SECRET=...
AUTH_URL=http://localhost:3000
```

Manter um `.env.example` versionado e nunca commitar valores reais. Validar as envs no boot com Zod (`src/lib/env.ts`).

---

## Comandos de desenvolvimento

> Ajustar conforme o projeto for inicializado.

```bash
pnpm install          # instala dependências
pnpm dev              # roda Next em modo dev
pnpm build            # build de produção
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # testes unitários (Vitest)

pnpm db:generate      # gera migrations a partir do schema Drizzle
pnpm db:migrate       # aplica migrations
pnpm db:studio        # abre Drizzle Studio
```

---

## Como o Claude deve trabalhar neste repo

1. **Confirme antes de criar arquivos novos em escala.** Se a tarefa pode ser feita editando arquivos existentes, prefira editar.
2. **Sempre rode `pnpm typecheck` e `pnpm lint`** antes de considerar uma tarefa pronta.
3. **Migrations**: ao alterar schema, gere a migration e mostre o diff antes de aplicar.
4. **Permissões**: ao criar qualquer endpoint ou server action que toque em `evaluations` ou `employees`, escreva explicitamente a checagem de papel/propriedade — não assuma que a UI já filtrou.
5. **Não exponha IDs internos** desnecessariamente em URLs públicas; use slugs ou IDs opacos quando fizer sentido.
6. **Datas**: trabalhar sempre em UTC no banco; converter para `America/Sao_Paulo` apenas na camada de apresentação.
7. **Ao importar planilhas**, valide cada linha com Zod e retorne um relatório das linhas que falharam — nunca aborte a importação inteira por uma linha ruim sem comunicar.
8. **Não introduza dependências novas sem justificar.** Se já existe algo no stack que resolve, use o que está.
9. **Comentários**: explique o _porquê_, não o _o quê_. Código óbvio não precisa de comentário.
10. **Em caso de dúvida sobre regra de negócio**, pergunte antes de inventar — especialmente em torno de quem pode avaliar quem, e o que acontece com avaliações de dias anteriores.

---

## Roadmap curto

- [ ] Setup inicial do projeto (Next + TS + Tailwind + Drizzle + Auth.js)
- [ ] Schema do banco e primeira migration no Neon
- [ ] Login e proteção de rotas por papel
- [ ] CRUD de funcionários (RH)
- [ ] Tela de avaliação diária (gestor)
- [ ] Histórico de avaliações
- [ ] Importação de planilha
- [ ] Configuração dos itens do checklist pelo RH
- [ ] Exportação de relatórios
