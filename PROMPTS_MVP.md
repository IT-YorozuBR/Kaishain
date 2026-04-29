# Prompts para o MVP do Kaishain

Sequência de prompts para construir o MVP em fatias verticais usando Claude Code. Cada fatia é uma sessão nova (`/compact` antes ou conversa do zero). Sempre começamos em **Plan Mode** (Shift+Tab no extensão), aprovamos o plano, depois executamos.

> **Regra geral**: antes de iniciar qualquer fatia, faça commit da anterior, rode `pnpm typecheck && pnpm lint && pnpm test`, e tenha o `CLAUDE.md` atualizado.

---

## Fatia 0 — Setup inicial do projeto

**Objetivo**: deixar o esqueleto do projeto rodando, com todas as ferramentas configuradas e o banco vazio criado via migration.

### Prompt de planejamento (Plan Mode)

```
Estamos em Plan Mode. Leia o CLAUDE.md.

Vou inicializar o projeto Kaishain do zero. Stack confirmada:
- Next.js (App Router) + TypeScript estrito
- Tailwind CSS + shadcn/ui
- Drizzle ORM + Drizzle Kit (code-first, conforme CLAUDE.md)
- Neon como PostgreSQL
- Auth.js (NextAuth v5) com credentials provider
- Zod para validação (incluindo envs no boot)
- ESLint + Prettier
- pnpm como gerenciador

Me entregue um plano dividido em fases curtas, na ordem em que devemos rodar.
Marque explicitamente os pontos onde eu preciso fornecer algo (DATABASE_URL do
Neon, AUTH_SECRET, etc.) e os pontos onde você roda comandos no terminal.

Não escreva código ainda. Apenas o plano em markdown.
```

### Prompt de execução (após aprovar o plano)

```
Plano aprovado. Pode executar a Fase 1.

Pare e me avise quando precisar de:
1. DATABASE_URL do Neon
2. AUTH_SECRET (você mesmo pode gerar com `openssl rand -base64 32`)

Ao final de cada fase, rode `pnpm typecheck` e `pnpm lint` e me mostre o
resultado antes de seguir para a próxima fase.
```

### Critérios para considerar a Fatia 0 pronta

- [ ] `pnpm dev` sobe sem erro e mostra a home placeholder.
- [ ] `pnpm typecheck` e `pnpm lint` passam.
- [ ] `pnpm db:generate` gera migration vazia ou inicial sem reclamar.
- [ ] `pnpm db:migrate` aplica no Neon sem erro.
- [ ] `.env.example` versionado, `.env.local` no `.gitignore`.
- [ ] `src/lib/env.ts` valida envs com Zod e quebra o build se algo faltar.
- [ ] Estrutura de pastas conforme CLAUDE.md (`src/lib/db/`, `src/server/`, etc.).
- [ ] Commit inicial feito.

---

## Fatia 1 — Autenticação e papéis

**Objetivo**: ter login funcionando, sessão com `role`, middleware redirecionando por papel.

### Prompt de planejamento (Plan Mode)

```
Estamos em Plan Mode. Leia o CLAUDE.md, o schema atual em src/lib/db/schema.ts
e a config de Auth.js já existente.

Vou implementar a Fatia 1: autenticação e papéis.

Escopo:
1. Adicionar a tabela `users` ao schema Drizzle conforme CLAUDE.md
   (id, name, email único, password_hash, role enum 'RH'|'GESTOR'|'ADMIN',
   active boolean, timestamps).
2. Gerar migration via `pnpm db:generate` e me mostrar o SQL antes de aplicar.
3. Configurar Auth.js (NextAuth v5) com Credentials Provider validando
   email/senha contra a tabela users (bcrypt para hash).
4. Adicionar `role` ao callback `session` para que esteja disponível no client.
5. Criar página `/login` em (auth)/login com form validado por Zod.
6. Criar middleware que:
   - Redireciona usuários não autenticados para /login.
   - Redireciona RH para /funcionarios após login.
   - Redireciona GESTOR para /avaliar após login.
   - Bloqueia acessos cruzados (gestor tentando acessar /funcionarios → 403).
7. Criar helper `getCurrentUser()` em src/lib/auth/ para uso em server actions.
8. Criar seed em src/lib/db/seed.ts que insere um usuário ADMIN inicial
   se não existir nenhum (idempotente). Adicionar script `pnpm db:seed`.

Não escreva código ainda. Me devolva:
- Plano em fases pequenas e ordenadas
- Lista de arquivos a criar/alterar com motivo de cada um
- Pontos de risco que você quer me confirmar antes de codar
```

### Prompt de execução

```
Plano aprovado.

Execute fase por fase. Regras:
- Antes de rodar `pnpm db:migrate`, me mostre o SQL gerado.
- Antes de seguir para a próxima fase, rode `pnpm typecheck` e me mostre o resultado.
- Quando terminar todas as fases, rode `pnpm db:seed` e me mostre as credenciais
  do admin de bootstrap (não commitar a senha; usar variável de ambiente
  ADMIN_BOOTSTRAP_PASSWORD com fallback claramente marcado como dev-only).
```

### Verificação manual (faça você mesmo no navegador)

- [ ] Login com usuário admin funciona.
- [ ] Login com senha errada mostra erro claro (sem vazar se é email ou senha).
- [ ] Acesso a `/funcionarios` sem login → redirect para /login.
- [ ] Logout funciona e invalida a sessão.
- [ ] `getCurrentUser()` retorna `{ id, role }` em uma server action de teste.

---

## Fatia 2 — CRUD de funcionários (RH)

**Objetivo**: RH consegue cadastrar, listar, editar e desativar funcionários, e atribuir um gestor.

### Prompt de planejamento (Plan Mode)

```
Estamos em Plan Mode. Leia o CLAUDE.md e o schema atual.

Vou implementar a Fatia 2: CRUD de funcionários (apenas RH).

Escopo:
1. Adicionar tabela `employees` ao schema (id, name, email, registration
   opcional, position, department, manager_id FK -> users.id, active, timestamps).
   Gerar e aplicar migration.
2. Criar schemas Zod compartilhados em src/lib/validators/employee.ts
   (createEmployeeSchema, updateEmployeeSchema).
3. Criar serviços puros em src/server/services/employees.ts
   (listEmployees, getEmployee, createEmployee, updateEmployee, deactivateEmployee)
   sem nenhum acoplamento com Next/Auth — apenas recebem o usuário autenticado
   já validado.
4. Criar server actions em src/server/actions/employees.ts que:
   - Chamam `getCurrentUser()`.
   - Verificam que o papel é RH ou ADMIN (jogar UnauthorizedError caso contrário).
   - Validam o input com Zod.
   - Delegam para o serviço.
5. Criar telas em src/app/(rh)/funcionarios/:
   - Página de listagem com TanStack Table (paginação, busca por nome/email,
     filtro por gestor, filtro ativo/inativo).
   - Página de novo funcionário (form shadcn + react-hook-form + zod).
   - Página de edição.
   - Botão de desativar (não deletar — soft delete via flag active).
6. Listar gestores no select de "manager" puxando users com role='GESTOR'.

Pontos a confirmar comigo antes de codar:
- Email do funcionário é único? (assumir que sim, mas confirmar)
- O que acontece com avaliações de um funcionário desativado? (assumir
  que continuam consultáveis no histórico mas ele some da tela de avaliar)

Não escreva código ainda. Devolva plano + arquivos + perguntas.
```

### Prompt de execução

```
Plano aprovado, com as seguintes decisões nas perguntas:
- Email único: sim
- Funcionário desativado: some das listas de avaliação ativa, mas histórico permanece

Execute. Regras de sempre:
- Mostrar SQL antes de aplicar migration
- typecheck + lint após cada fase
- Implementar o serviço puro ANTES da server action ANTES da UI
  (camadas de dentro pra fora; isso facilita testar)
```

### Verificação manual

- [ ] Logado como RH: consegue criar, editar, desativar funcionário.
- [ ] Logado como GESTOR: tentar acessar `/funcionarios` → 403 ou redirect.
- [ ] Tentar chamar a server action diretamente como GESTOR (via DevTools) → erro.
- [ ] Email duplicado mostra erro claro no form.

---

## Fatia 3 — Tela de avaliação diária (gestor)

**Objetivo**: gestor vê seu time e registra avaliação do dia (checklist + nota + observação).

### Prompt de planejamento (Plan Mode)

```
Estamos em Plan Mode. Leia o CLAUDE.md e o schema atual.

Vou implementar a Fatia 3: avaliação diária pelo gestor. Esta é a feature
central do produto, atenção especial a permissões e à regra "uma avaliação
por funcionário por dia".

Escopo:
1. Schema:
   - Tabela `checklist_items` (id, label, description, order, active, timestamps).
   - Tabela `evaluations` (id, employee_id, evaluator_id, evaluation_date DATE,
     score smallint CHECK (score BETWEEN 0 AND 10), note text, timestamps).
     Índice único em (employee_id, evaluation_date).
   - Tabela `evaluation_checklist_results` (evaluation_id, checklist_item_id,
     checked boolean, PK composta).
   Gerar e aplicar migration.

2. Seed: incluir 4-5 itens de checklist iniciais (ex: "Pontualidade",
   "Cumpriu metas do dia", "Colaboração com a equipe", "Qualidade da entrega",
   "Iniciativa") — idempotente.

3. Validators Zod: createEvaluationSchema com score, note (opcional),
   checklistResults (array de {checklistItemId, checked}).

4. Helper de permissão em src/lib/permissions/evaluation.ts:
   `canEvaluate(user, employee): boolean` — true se user.role === 'GESTOR'
   e employee.manager_id === user.id, ou se user.role === 'ADMIN'.

5. Serviço src/server/services/evaluations.ts:
   - getMyTeam(userId): retorna funcionários ativos com manager_id = userId
   - getTodayEvaluation(employeeId, date): retorna avaliação de hoje se existir
   - upsertEvaluation(...): cria ou atualiza a avaliação do dia.
     IMPORTANTE: usar transação. Validar canEvaluate antes.

6. Server action src/server/actions/evaluations.ts: evaluateEmployee.
   - getCurrentUser, validar role GESTOR/ADMIN
   - Validar input com Zod
   - Chamar service (que faz checagem fina)
   - revalidatePath em /avaliar

7. UI em src/app/(gestor)/avaliar/:
   - Página índice: lista de cards, um por liderado, mostrando nome, cargo,
     se já foi avaliado hoje (badge "Avaliado" ou "Pendente"), e a nota
     atual se houver.
   - Página /avaliar/[employeeId]: form com checklist (checkboxes), slider
     ou input numérico 0-10, textarea para observação. Pré-popular com a
     avaliação de hoje se já existir (permitir editar até a virada do dia).
   - Mostrar timezone-aware "hoje" usando America/Sao_Paulo na UI; no banco
     gravar UTC conforme CLAUDE.md.

Pontos a confirmar:
- Gestor pode editar avaliação do mesmo dia até quando? Assumir até 23:59
  America/Sao_Paulo. Depois disso vira readonly.
- Score: slider ou input numérico? Sugiro input numérico com botões +/- e
  validação visual.

Devolva o plano antes de codar.
```

### Prompt de execução

```
Plano aprovado. Decisões:
- Editável até 23:59 America/Sao_Paulo do dia da avaliação
- Score: input numérico com botões e display visual

Execute fase por fase. Regras de sempre + esta extra:
- Para a regra de "uma por dia", confiar no índice único do banco. Tratar o
  erro de unique violation no service e converter para upsert lógico.
- A checagem `canEvaluate` deve estar tanto no service quanto na server
  action — defesa em profundidade.
```

### Verificação manual

- [ ] Logado como GESTOR A: vê apenas funcionários onde manager_id = A.id.
- [ ] Tentar avaliar funcionário do gestor B (mudando o employeeId na URL) → 403.
- [ ] Avaliar hoje: salva. Recarregar a página: mostra os valores salvos.
- [ ] Re-submeter com nota diferente: atualiza, não cria nova linha.
- [ ] Tentar via DevTools chamar a server action com score=15 → erro de validação.
- [ ] Olhar o banco: existe exatamente uma linha em evaluations para (funcionario, hoje).

---

## Fatia 4 — Histórico de avaliações

**Objetivo**: gestor vê o histórico do seu time; RH vê de todos.

### Prompt de planejamento (Plan Mode)

```
Estamos em Plan Mode. Leia o CLAUDE.md.

Vou implementar a Fatia 4: histórico de avaliações.

Escopo:
1. Service: listEvaluations(filtros) com paginação. Filtros:
   - employeeId (opcional)
   - dateFrom, dateTo (opcionais)
   - evaluatorId (RH usa, gestor é forçado para o próprio id)
2. Server action que aplica regra de papel:
   - GESTOR: força evaluatorId = currentUser.id, ignora qualquer evaluatorId vindo do client
   - RH/ADMIN: aceita os filtros como vieram
3. Páginas:
   - /historico (gestor): tabela paginada com nome do funcionário, data, nota, observação truncada
   - /rh/historico (RH): mesma tabela, mas com coluna "avaliador" e filtro adicional por gestor
4. Página de detalhe /historico/[evaluationId]: mostra checklist completo,
   nota, observação, data, gestor que avaliou. Read-only.
5. Permissão na página de detalhe: gestor só vê avaliações onde evaluator_id = self.id.

Sem mudanças de schema nesta fatia.

Devolva o plano.
```

### Prompt de execução

```
Plano aprovado. Execute. Regras de sempre.

Atenção: a server action de listagem é o ponto crítico. O filtro de evaluatorId
para gestor NÃO pode vir do client — sempre sobrescrever no servidor. Faça um
comentário explicando isso no código.
```

### Verificação manual

- [ ] Gestor A vê só avaliações que ELE fez.
- [ ] RH vê tudo, e consegue filtrar por gestor.
- [ ] Tentar trocar `evaluatorId` na URL como gestor → ignorado pelo server.

---

## Fatia 5 — Importação de planilha

**Objetivo**: RH faz upload de .xlsx/.csv com lista de funcionários e o sistema cadastra em massa, com relatório de erros por linha.

### Prompt de planejamento (Plan Mode)

```
Estamos em Plan Mode. Leia o CLAUDE.md.

Vou implementar a Fatia 5: importação de funcionários por planilha (RH only).

Escopo:
1. Adicionar dependência `xlsx` (SheetJS).
2. Página /importar com:
   - Link para baixar template (.xlsx) com colunas:
     name, email, registration, position, department, manager_email
   - Upload de arquivo (drag-and-drop opcional).
3. Route handler POST /api/importar que:
   - Verifica papel RH/ADMIN (caso contrário 403)
   - Recebe o arquivo (multipart)
   - Parseia com SheetJS no servidor
   - Para cada linha:
     a. Valida com Zod (mesma forma do createEmployeeSchema, com manager_email
        em vez de manager_id)
     b. Resolve manager_email -> manager_id (se não achar, marcar erro)
     c. Verifica se email já existe; se sim, atualiza (upsert) ou pula
        conforme parâmetro do form.
   - Retorna JSON com:
     - total
     - success_count
     - errors: [{ row: 5, errors: ['email inválido', 'gestor não encontrado'] }]
4. Tela mostra resumo após upload e oferece download de CSV com as linhas que falharam.

NUNCA abortar a importação inteira por causa de uma linha ruim — processar
o resto e reportar.

Pontos a confirmar:
- Modo padrão: pular existentes ou atualizar? Sugerir: opção "atualizar se existir" como checkbox.
- Limite de tamanho do arquivo? Sugerir 5MB.

Devolva plano.
```

### Prompt de execução

```
Plano aprovado. Decisões:
- Checkbox "atualizar funcionários existentes" no form de upload
- Limite 5MB

Execute. Atenção:
- Toda a parsing/validação deve rodar no servidor, nunca no cliente
- Usar transação por lote (não uma transação para o arquivo todo, isso poderia ficar lenta) — sugiro lotes de 100 linhas.
```

### Verificação manual

- [ ] Upload com 10 linhas válidas: 10 inseridas.
- [ ] Upload com 5 válidas e 5 com erros variados: 5 inseridas, relatório claro das 5 que falharam.
- [ ] Upload com email duplicado e checkbox marcado: atualiza.
- [ ] Upload com arquivo de 6MB: erro claro de tamanho.
- [ ] Upload .csv funciona igual ao .xlsx.
- [ ] Logado como GESTOR: rota retorna 403.

---

## Fatia 6 — Configuração dos itens do checklist (RH)

**Objetivo**: RH consegue criar, editar, reordenar e desativar itens do checklist.

### Prompt de planejamento (Plan Mode)

```
Estamos em Plan Mode. Leia o CLAUDE.md.

Vou implementar a Fatia 6: CRUD de itens do checklist.

Escopo:
1. Página /rh/checklist:
   - Lista os items ordenados por `order`.
   - Botão "novo item".
   - Cada item: editar inline (label, description), toggle ativo/inativo,
     drag-and-drop para reordenar.
2. Server actions:
   - createChecklistItem
   - updateChecklistItem
   - reorderChecklistItems (recebe array de ids na nova ordem; faz UPDATE
     em transação)
   - toggleChecklistItem
   Todas verificam role RH/ADMIN.
3. Importante: NUNCA deletar um checklist_item, só desativar (active=false).
   Itens inativos não aparecem na tela de avaliar, mas continuam aparecendo
   no histórico para preservar integridade.
4. Itens inativos com seu nome riscado/cinza na lista de admin.

Sem mudança de schema (a tabela já existe da Fatia 3).

Devolva plano.
```

### Prompt de execução

```
Plano aprovado. Execute. Regras de sempre.

Para o drag-and-drop, usar @dnd-kit/core (já é o padrão recomendado com
shadcn/ui). Confirme que essa dependência ainda não está no projeto antes de adicionar.
```

### Verificação manual

- [ ] Criar item novo: aparece no fim da lista.
- [ ] Reordenar arrastando: ordem persiste após reload.
- [ ] Desativar item: some da tela de /avaliar mas histórico antigo preserva.
- [ ] Como GESTOR: 403 em /rh/checklist.

---

## Slash commands recomendados (.claude/commands/)

Coloque esses arquivos no repo para reutilizar nas fatias seguintes.

### `.claude/commands/feature.md`

```markdown
---
description: Iniciar uma nova feature seguindo o loop Research → Plan → Execute → Review
argument-hint: "<descrição curta da feature>"
---

Estamos em Plan Mode. Leia o CLAUDE.md e o estado atual do código relevante.

Feature: $ARGUMENTS

Devolva:
1. Plano em fases pequenas, ordenadas
2. Lista de arquivos a criar/alterar e por quê
3. Mudanças de schema necessárias (se houver)
4. Pontos onde você quer confirmação minha antes de codar
5. Riscos de permissão / segurança que você identifica

Não escreva código ainda.
```

Uso: `/feature listar avaliações vencidas`

### `.claude/commands/migration.md`

```markdown
---
description: Gerar migration Drizzle a partir de uma alteração no schema
argument-hint: "<descrição da mudança>"
---

Mudança de schema: $ARGUMENTS

Passos:
1. Edite src/lib/db/schema.ts implementando a mudança.
2. Rode `pnpm db:generate`.
3. Mostre o SQL gerado.
4. PARE e espere minha aprovação explícita antes de rodar `pnpm db:migrate`.

Se a mudança for destrutiva (drop column, rename, type change), proponha um
plano em duas etapas (expand/contract) conforme CLAUDE.md.
```

Uso: `/migration adicionar coluna phone em employees`

### `.claude/commands/permission-audit.md`

```markdown
---
description: Auditar permissões em todas as server actions e route handlers
---

Audite o código deste repo procurando:

1. Server actions e route handlers que acessam dados sensíveis
   (employees, evaluations, users) sem chamar `getCurrentUser()` ou sem
   validar `role`.
2. Casos onde um GESTOR poderia acessar dados de outro time
   (faltam filtros por manager_id ou evaluator_id).
3. Pontos onde dados vindos do client (URLs, body) são usados como filtro
   de permissão sem reescrita no servidor (ex: confiar em evaluatorId que
   veio do form).

Devolva uma tabela markdown:
| arquivo | linha | risco | sugestão de fix |

Não altere código. Apenas reporte.
```

Uso: `/permission-audit` (depois de cada fatia que mexe em permissões)

---

## Hooks recomendados (.claude/settings.json)

Pelo menos estes dois valem a pena desde o início:

1. **Bloquear escrita direta em `src/lib/db/migrations/`** (forçar regenerar via Drizzle Kit).
2. **Rodar `pnpm typecheck` em arquivos `.ts`/`.tsx` editados** (feedback rápido).

Você pode pedir pro Claude escrever esses hooks com:

```
Escreva dois hooks para .claude/settings.json:
1. PreToolUse hook que bloqueia qualquer escrita em src/lib/db/migrations/
   com mensagem explicando que migrations são geradas via `pnpm db:generate`.
2. PostToolUse hook que roda `pnpm typecheck` quando arquivos .ts ou .tsx
   forem editados, e reporta erros para o Claude no contexto.
```

---

## Roadmap após o MVP (fora do escopo desta sequência)

Quando as 6 fatias estiverem em produção, vale considerar (cada um vira uma nova fatia):

- Notificações por e-mail para gestores que ainda não avaliaram no dia.
- Dashboard de RH com gráficos de notas médias por departamento/gestor.
- Exportação completa em xlsx das avaliações.
- Auditoria (`audit_logs`) registrando quem alterou o quê.
- Self-service do funcionário ver suas próprias avaliações (mudança de produto importante — discutir antes).
- SSO corporativo (Google Workspace / Microsoft Entra) substituindo credentials provider.
