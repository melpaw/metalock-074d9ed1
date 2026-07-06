# Plano de execução

Pedido grande — vou dividir em blocos e implementar todos na mesma leva. Confirme antes de eu começar.

## 1. Marca e visual
- Adicionar a logo enviada como `public/favicon.png` + remover `favicon.ico` padrão, atualizar `__root.tsx` para usar o novo ícone. Também vou usar a logo no header/sidebar do app onde hoje aparece só texto.
- Ajuste sutil do amarelo primário para um tom **mostarda mais vibrante** (via token OKLCH em `src/styles.css`).
- Tema "mais quadrado / premium": reduzir `--radius` global (cards, botões, inputs, badges) para um raio bem menor (≈4px), aplicado no site inteiro (marketing + app + admin + agente).

## 2. Bug do dashboard cliente (`/app`)
- "Balanço total" aparecendo duplicado e zerado → voltar ao cálculo que somava carteiras + investimentos como estava antes; consertar a duplicação da ilha.

## 3. Dashboard cliente — extras
- **Extratos recentes**: adicionar um pequeno indicador colorido por tipo (deposit = seta verde, withdrawal = seta vermelha, swap = ícone roxo, etc.), minimalista.
- **Coluna lateral "Market"**: lista das moedas do sistema com preço, variação 24h e botão **Comprar**. Fluxo funcional só no lado do cliente: abre modal, cliente escolhe moeda de origem (carteira dele) e quantidade → cria uma `transaction` do tipo `swap` com status `pending` (fica aguardando aprovação admin/agente).
- **Área de cashback**: card mostrando cashback acumulado do cliente (somatório sobre swaps aprovados, % configurável — vou usar 0.5% padrão via coluna já existente em plans, ou uma constante se não existir).

## 4. Dashboards admin e agente
- Remover as duas ilhas grandes "Clientes" e "Suporte".
- Colocar **3 ilhas menores lado a lado**:
  1. **Transações pendentes** → leva para uma nova página no estilo da imagem enviada (tabs: All / Pending / Processing / Approved / Completed / On Hold / Rejected / Canceled, linhas com ícone da moeda, usuário, valor, status, data, botão "Detalhes"), mantendo nosso tema escuro/mostarda.
  2. **KYC pendentes** → página lista clientes com KYC pendente + botão para abrir perfil e aprovar/rejeitar.
  3. **Chats pendentes** → página lista tickets abertos de todos os clientes.

## 5. Aprovação de compras (swaps)
- Admin e agente veem as novas solicitações de compra na aba de "Transações pendentes" e podem **Aprovar / Rejeitar**. Aprovação debita a carteira de origem e credita a de destino do cliente + registra o cashback.

## 6. Escopo dos agentes
- Agentes têm as **mesmas permissões do admin**, exceto **adicionar carteira em conta de cliente** — bloqueado por padrão.
- Admin ganha, em `/admin/team`, um botão **"Permissões"** por agente com toggle "Pode adicionar carteiras aos clientes".
- Agentes só veem **clientes que eles registraram**. Admin vê todos.
- Adicionar cliente: na página `/admin/clients` (e equivalente do agente), botão **"Adicionar cliente"** que recebe email → cria conta/vincula e marca `registered_by = auth.uid()`.

## Detalhes técnicos

### Banco (migração)
- `profiles`: adicionar `registered_by uuid references auth.users(id)`.
- `client_permissions` (já existe): garantir campo `can_add_wallets boolean default false` para agentes.
- `transactions`: reutilizar tipos existentes; adicionar `cashback_amount numeric default 0` se ainda não existir.
- Ajustar RLS/policies:
  - Agente lê `profiles` e `transactions` só onde `registered_by = auth.uid()` ou é dono do ticket.
  - Admin continua vendo tudo.
  - Só admin pode `insert` em `wallets` quando o dono é cliente, exceto se `client_permissions.can_add_wallets` do agente = true.

### Frontend
- Novo componente `TransactionsTable` reutilizado em cliente, admin, agente.
- Novo `MarketPanel` (coluna direita do dashboard cliente) + `BuyCryptoDialog`.
- Novo `CashbackCard`.
- Nova rota `_authenticated/admin.transactions.tsx` (+ redirecionamento equivalente para agente).
- Nova rota `_authenticated/admin.kyc.tsx` (KYC pendentes).
- Refactor `admin.index.tsx` e `agent.index.tsx` para as 3 ilhas.
- `admin.team.tsx`: adicionar dialog de permissões por agente.
- `admin.clients.index.tsx` (e agente): botão "Adicionar cliente" com dialog de email.

### Design tokens
- `src/styles.css`: `--primary` → mostarda vibrante (ex.: `oklch(0.78 0.17 85)`), `--radius` → `0.25rem`. Todos os componentes shadcn herdam.

---

**Escopo é grande (~15 arquivos + 1 migração)**. Se quiser priorizar, posso começar por:
- **A** Bug do balanço + logo/tema (rápido)
- **B** Refactor dashboards admin/agente + 3 novas páginas
- **C** Market/cashback/compra no cliente
- **D** Escopo agentes + adicionar cliente

Posso ir tudo de uma vez, ou quer que eu faça em ondas A→D para você já validar cada parte?
