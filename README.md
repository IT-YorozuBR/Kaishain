# Kaishain — 会社員

Plataforma interna de avaliação diária de funcionários. Gestores preenchem um checklist, atribuem uma nota (0–10) e adicionam observações sobre cada liderado. O RH gerencia o cadastro de pessoas, times e a hierarquia organizacional.

> **kaishain** (会社員) — "funcionário de empresa" em japonês.

---

## Funcionalidades

- **Avaliação diária**: checklist booleano + nota de 0 a 10 + observação opcional, uma por funcionário por dia
- **Controle de acesso por papel**: `ADMIN`, `RH` e `GESTOR` com permissões distintas
- **CRUD de funcionários**: cadastro, edição e vínculo com gestor responsável
- **Histórico de avaliações**: consulta por período e por funcionário
- **Importação em massa** *(fase 2)*: upload de planilha `.xlsx`/`.csv` com relatório de erros linha a linha

### Fora do escopo (v1)

- Acesso do funcionário avaliado ao sistema
- Relatórios analíticos / BI
- Notificações por e-mail ou push

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript strict |
| Banco de dados | PostgreSQL via [Neon](https://neon.tech) |
| ORM | Drizzle ORM |
| Autenticação | Auth.js v5 (NextAuth) — credenciais |
| UI | Tailwind CSS v4 + shadcn/ui |
| Validação | Zod |
| Formulários | React Hook Form |
| Gerenciador de pacotes | pnpm |
| Testes | Vitest |

---

## Papéis e permissões

| Papel | O que acessa |
|---|---|
| `ADMIN` | Tudo (super-usuário técnico) |
| `RH` | Cadastros, importação, histórico de todos os times |
| `GESTOR` | Avaliação e histórico apenas dos seus liderados diretos |

Regra crítica: um `GESTOR` só lê/escreve avaliações de funcionários onde `employee.manager_id = user.id`. Essa verificação acontece **sempre no servidor** — nunca no cliente.

---

## Modelo de dados

```
users                      — usuários do sistema (ADMIN / RH / GESTOR)
employees                  — funcionários avaliados (ligados a um manager_id)
checklist_items            — itens configuráveis do checklist diário
evaluations                — uma avaliação por funcionário por dia (score 0–10)
evaluation_checklist_results — resultado booleano de cada item por avaliação
```

- `evaluation_date` é armazenada como `DATE` (sem hora) — garante unicidade diária e simplifica comparações
- Todas as datas são gravadas em UTC; a conversão para `America/Sao_Paulo` ocorre somente na camada de apresentação

---

## Estrutura de pastas

```
src/
  app/
    (auth)/login/          # página de login
    (gestor)/avaliar/      # tela de avaliação diária
    api/                   # route handlers
  components/
    ui/                    # componentes shadcn
    forms/                 # formulários compostos
    tables/                # tabelas com TanStack Table
  lib/
    auth/                  # configuração Auth.js + helpers de sessão
    db/                    # cliente Drizzle, schema, migrations, seed
    permissions/           # funções canEvaluate(), canManage() etc.
    validators/            # schemas Zod compartilhados
  server/
    actions/               # Server Actions (interface com UI)
    services/              # lógica de negócio pura e testável
```

---

## Pré-requisitos

- Node.js 20+
- pnpm
- Banco PostgreSQL (recomendado: [Neon](https://neon.tech) — plano free suficiente para desenvolvimento)

---

## Configuração local

**1. Clone e instale as dependências**

```bash
git clone https://github.com/seu-usuario/kaishain.git
cd kaishain
pnpm install
```

**2. Configure as variáveis de ambiente**

```bash
cp .env.example .env.local
```

Edite `.env.local` com os valores reais:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
AUTH_SECRET=             # string aleatória longa (ex: openssl rand -base64 32)
AUTH_URL=http://localhost:3000

# Apenas para pnpm db:seed
SEED_ADMIN_NAME=Administrador
SEED_ADMIN_EMAIL=admin@empresa.com
SEED_ADMIN_PASSWORD=Teste@12345
```

**3. Aplique as migrations e popule o banco**

```bash
pnpm db:migrate
pnpm db:seed        # cria o usuário ADMIN inicial
```

**4. Rode em modo desenvolvimento**

```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Comandos disponíveis

```bash
pnpm dev            # servidor Next.js em modo dev
pnpm build          # build de produção
pnpm start          # inicia o build de produção
pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
pnpm format         # Prettier
pnpm test           # testes unitários (Vitest)

pnpm db:generate    # gera migrations a partir do schema Drizzle
pnpm db:migrate     # aplica migrations pendentes
pnpm db:studio      # abre Drizzle Studio (GUI do banco)
pnpm db:seed        # popula o banco com dados iniciais
```

---

## Roadmap

- [x] Setup inicial (Next + TS + Tailwind + Drizzle + Auth.js)
- [x] Schema do banco e migrations no Neon
- [x] Login e proteção de rotas por papel
- [ ] CRUD de funcionários (RH)
- [ ] Tela de avaliação diária (gestor)
- [ ] Histórico de avaliações
- [ ] Configuração dos itens do checklist pelo RH
- [ ] Importação de planilha com relatório de erros
- [ ] Exportação de relatórios

---

## Convenções

- **TypeScript estrito**: proibido `any` — use `unknown` + narrowing
- **Server-first**: Server Components e Server Actions por padrão; Client Components apenas onde há interatividade real
- **Nomes em português** para conceitos de domínio (`avaliacao`, `funcionario`); inglês para infra (`AuthProvider`, `DbClient`)
- **Migrations**: nunca editar uma migration já aplicada — gere sempre uma nova
- **Erros tipados**: `UnauthorizedError`, `NotFoundError`, `ValidationError` — a UI traduz para mensagens de usuário
