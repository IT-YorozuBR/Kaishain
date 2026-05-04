# Checklist Configurável pelo RH — Design Spec

**Data:** 2026-05-04
**Status:** Aprovado

---

## Contexto

O `checklist_items` já existe no schema do banco com os campos `id`, `label`, `description`, `order`, `active`, `createdAt`, `updatedAt`. Nenhuma migration nova é necessária.

A função `getActiveChecklistItems()` atualmente vive em `src/server/services/evaluations.ts`. Ela será movida para o novo `src/server/services/checklist.ts`; `evaluations.ts` passará a importar de lá.

---

## Escopo

- Checklist **global** (único conjunto de itens para toda a empresa).
- Itens usados em avaliações passadas **não são deletados** — apenas desativados (`active = false`).
- Edição de `label`/`description` é **livre**, mesmo em itens já usados em avaliações (histórico exibe o label atual).
- Reordenação por **drag-and-drop** (`@dnd-kit`) apenas na aba de itens ativos.
- Itens inativos não têm ordem relevante.

---

## Camada de Dados

Nenhuma alteração de schema. Campos utilizados:

| Campo         | Tipo      | Observação                                      |
|---------------|-----------|-------------------------------------------------|
| `id`          | uuid      | PK                                              |
| `label`       | text      | Obrigatório, max 120 chars                      |
| `description` | text      | Opcional, max 500 chars                         |
| `order`       | integer   | Controlado pelo serviço; irrelevante em inativos|
| `active`      | boolean   | Soft delete                                     |

---

## Serviço — `src/server/services/checklist.ts`

Funções exportadas:

| Função | Permissão | Descrição |
|--------|-----------|-----------|
| `listChecklistItems(activeOnly?)` | pública | Lista itens ordenados por `order`. Se `activeOnly = true`, filtra `active = true` |
| `getChecklistItem(id)` | pública | Busca por id; lança `NotFoundError` se não encontrar |
| `createChecklistItem(user, input)` | RH / ADMIN | Cria item; `order` = `max(order) + 1` automático |
| `updateChecklistItem(user, id, input)` | RH / ADMIN | Edita `label` e/ou `description` |
| `toggleChecklistItemActive(user, id)` | RH / ADMIN | Inverte `active`; nunca deleta |
| `reorderChecklistItems(user, orderedIds)` | RH / ADMIN | Recebe array de IDs na nova ordem; atualiza `order` em transação |

Guard de permissão: `requireRhOrAdmin(user)` — padrão idêntico ao de `employees.ts`.

`getActiveChecklistItems()` é removida de `evaluations.ts` e substituída por `listChecklistItems(true)` importado de `checklist.ts`.

---

## Validators — `src/lib/validators/checklist.ts`

```ts
CreateChecklistItemSchema  // label (min 1, max 120), description? (max 500)
UpdateChecklistItemSchema  // partial do Create
ReorderChecklistItemsSchema  // array de UUIDs, min 1

// tipos inferidos exportados
CreateChecklistItemInput
UpdateChecklistItemInput
ReorderChecklistItemsInput
```

O campo `order` **não aparece** no input — calculado automaticamente pelo serviço na criação; na reordenação, a ordem é derivada da posição no array.

---

## Actions — `src/server/actions/checklist.ts`

| Action | Input | Comportamento pós-sucesso |
|--------|-------|--------------------------|
| `createChecklistItemAction(formData)` | FormData | Redireciona para `/rh/checklist` |
| `updateChecklistItemAction(id, formData)` | id + FormData | Redireciona para `/rh/checklist` |
| `toggleChecklistItemActiveAction(id)` | id | `revalidatePath('/rh/checklist')` |
| `reorderChecklistItemsAction(orderedIds)` | string[] | `revalidatePath('/rh/checklist')` |

Todas capturam `UnauthorizedError`, `ValidationError`, `NotFoundError` e retornam `{ error: string }` nos casos de falha, seguindo o padrão existente.

---

## Páginas e Componentes

### Rotas

| Rota | Descrição |
|------|-----------|
| `/rh/checklist` | Listagem com abas Ativos / Inativos |
| `/rh/checklist/novo` | Formulário de criação |
| `/rh/checklist/[id]/editar` | Formulário de edição |

### `/rh/checklist` — Listagem

**Aba Ativos:**
- Componente `ChecklistItemsTable` com `SortableContext` do `@dnd-kit/sortable`.
- Cada linha tem coluna de drag handle (`GripVertical`), `label`, `description` truncado, ações (Editar / Desativar).
- Ao soltar item após drag, dispara `reorderChecklistItemsAction` com atualização otimista (`useState` local com lista reordenada antes da resposta do server).

**Aba Inativos:**
- Tabela simples sem drag handle.
- Ação única: "Ativar" (chama `toggleChecklistItemActiveAction`).

### `/rh/checklist/novo` e `/rh/checklist/[id]/editar`

- Formulário com `react-hook-form` + Zod resolver (padrão dos forms de funcionário existentes).
- Campos: `label` (input, obrigatório) e `description` (textarea, opcional).
- Botão "Salvar" + link "Cancelar" → `/rh/checklist`.

### Sidebar

Adicionar entrada em `AppSidebar.tsx`:

```ts
{ href: '/rh/checklist', label: 'Checklist', icon: ListChecks, roles: ['RH', 'ADMIN'] }
```

---

## Proteção de Rotas

O layout do grupo `/rh` já deve verificar `role === 'RH' || role === 'ADMIN'` — mesmo padrão das outras rotas RH existentes. Nenhuma nova lógica de middleware necessária.

---

## Dependências Novas

| Pacote | Versão | Motivo |
|--------|--------|--------|
| `@dnd-kit/core` | latest | Drag-and-drop engine |
| `@dnd-kit/sortable` | latest | Abstração sortable sobre o core |
| `@dnd-kit/utilities` | latest | Helpers CSS transform para animações |

---

## Fora do Escopo

- Checklist por departamento, turno ou tipo de funcionário.
- Versionamento de itens (snapshot do label no momento da avaliação).
- Configuração de itens obrigatórios vs. opcionais.
- Ordenação de inativos.
