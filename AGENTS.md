🧠 Contexto do Projeto

Kaishain é uma plataforma SaaS interna para avaliação diária de funcionários, onde gestores avaliam seus liderados com:

Checklist (booleano)
Nota de 0 a 10
Observação opcional

RH gerencia cadastros, estrutura organizacional e importações em massa.

Origem do nome: 会社員 (kaishain) = funcionário de empresa.

🎯 Objetivo do Agente

Você (Codex) deve:

Implementar features com foco em simplicidade, segurança e consistência
Respeitar regras de negócio e permissões
Priorizar código type-safe, validado e server-first
🚫 Fora de Escopo (não implementar)
Acesso do funcionário avaliado
BI avançado
Notificações (email/push)
🧱 Stack Oficial
Next.js (App Router)
TypeScript (strict)
PostgreSQL (Neon)
Drizzle ORM (preferencial)
Auth.js (NextAuth)
Tailwind + shadcn/ui
Zod (validação obrigatória)
TanStack Table
SheetJS (xlsx)
pnpm
ESLint + Prettier
👥 Papéis e Permissões
Roles:
RH
GESTOR
ADMIN
Regras CRÍTICAS:

GESTOR só acessa funcionários onde:

employee.manager_id === user.id
Permissões sempre no backend
Nunca confiar na UI
🗄️ Modelo de Dados
Tabelas principais:
users
employees
checklist_items
evaluations
evaluation_checklist_results
Regras importantes:
1 avaliação por funcionário por dia
evaluation_date = DATE (sem hora)
score: 0–10
avaliações são imutáveis após fechamento
📁 Estrutura do Projeto
src/
  app/
  components/
  lib/
  server/

Separação obrigatória:

services → regra de negócio
actions → interface com UI
lib → infra (auth, db, validators)
⚙️ Regras de Desenvolvimento
Tipagem
Proibido any
Use unknown + narrowing
Arquitetura
Server-first (Server Components + Actions)
Client só quando necessário
Validação
Tudo passa por Zod (SEM exceção)
Permissões

Sempre validar:

canEvaluate(user, employee)
Erros

Use erros tipados:

UnauthorizedError
ValidationError
NotFoundError
🛑 Regras CRÍTICAS
Nunca confiar no cliente
Nunca pular validação
Nunca criar endpoint sem checar permissão
Nunca expor ID sensível desnecessariamente
Nunca editar migration já aplicada
📅 Datas
Banco: UTC
Front: converter para America/Sao_Paulo
📥 Importação de Planilhas

Obrigatório:

Validar linha a linha com Zod
Retornar relatório de erro
Nunca falhar silenciosamente
🌱 Variáveis de Ambiente
DATABASE_URL=
AUTH_SECRET=
AUTH_URL=
Validar com Zod no boot
🧪 Comandos
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test

pnpm db:generate
pnpm db:migrate
🤖 Comportamento Esperado do Codex
Antes de implementar:
Prefira editar arquivos existentes
Pergunte se regra de negócio não estiver clara
Durante:
Código limpo e modular
Sem dependências desnecessárias
Depois:
Rodar:
typecheck
lint
🔐 Segurança
Autorização SEMPRE no server
Nunca confiar em filtros da UI
Sanitizar inputs sempre
📌 Convenções
Domínio → português (avaliacao, funcionario)
Infra → inglês (AuthProvider, DbClient)
1 componente por arquivo
PascalCase para componentes
Alias @/ para imports
🚀 Roadmap
Setup inicial
Auth + roles
CRUD funcionários
Avaliação diária
Histórico
Importação
Checklist configurável
Exportação
⚠️ Quando estiver em dúvida

Pare e pergunte.

Principalmente sobre:

Quem pode avaliar quem
Regras de edição de avaliação
Hierarquia