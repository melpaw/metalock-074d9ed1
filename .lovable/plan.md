# Plano de correção completa do MetaLock

Escopo grande — vou executar em ondas, na ordem abaixo. Antes de começar preciso confirmar um ponto para não gastar créditos à toa.

## Ondas de execução

### Onda 1 — Estrutura & Layout
- Reordenar sidebar Admin: Dashboard → Clients → Transações → KYC → Team → Tickets → Currencies.
- Aplicar novo tema (cantos retos `--radius: 0.25rem`, cor mustard, cards `bg-surface`, badges quadrados) em **todas** as páginas legadas identificadas:
  - `admin.clients.$userId.tsx`, `admin.clients.index.tsx`, `admin.currencies.tsx`, `admin.logs.tsx`, `admin.plans.tsx`, `admin.tickets.*`, `admin.index.tsx`
  - `app.invest.tsx`, `app.profile.tsx`, `app.support.*`, `dashboard.tsx`, `reset-password.tsx`
  - Componentes: `WalletActions`, `TicketConversation`, `profile/*`, `NotificationBell`, `queues/*`
- Padronizar cores de status (badge + texto): Completed=verde, Pending/On Hold=amarelo, Cancelled/Rejected=vermelho.

### Onda 2 — Gráfico + Home do cliente
- Corrigir gráfico circular de alocação: usar `wallets.available * (live price ?? currencies.usd_price)` com fallback e recalcular quando prices carregarem. Adicionar estado de loading e mensagem "sem saldo" quando total=0.
- Remover ilhas `MarketPanel` e `CashbackCard` da Home.
- Reintroduzir ilha **Minhas Carteiras** ao lado de **Ações da Carteira**, grid `lg:grid-cols-2` simétrico.
- Manter "Recent Statements" com ícones coloridos por tipo já existentes.

### Onda 3 — Novas páginas Cliente
- `/app/market` — lista de moedas com preço, variação 24h, botão comprar → `client_request_buy`. Bloco de Cashback (disponível/acumulado/histórico) usando `transactions` com `metadata->>kind = 'cashback'`.
- `/app/wallets` — tabela completa (nome, símbolo, saldo, valor USD, endereço, status do endereço).
- Menu lateral cliente: Home → Market → Wallets → Plans → Support.

### Onda 4 — Ações da carteira
- `WalletActions`: revisar 4 abas.
  - **Depositar**: pedir endereço (`client_request_deposit_address`) + registrar depósito (`request_deposit`).
  - **Enviar**: transferência entre carteiras do próprio cliente (nova RPC `client_internal_transfer`) ou aviso de que precisa ir por Sacar.
  - **Swap**: usa `client_request_buy` (pending → aprovação).
  - **Sacar**:
    1. Se moeda ≠ USDT/USD/EUR obriga swap prévio (aviso + botão que abre a aba Swap).
    2. Checkbox "Solicitar orçamento de seguro" antes de confirmar.
    3. Cria transação `withdrawal` pending com `metadata.insurance_requested=true`. Agente/Admin define % de seguro → cliente aprova/recusa via notificação, e ticket automático é aberto no suporte para método de pagamento.
    4. Taxa de conversão cripto→fiat = 3,5% (armazenada em `fee`).

### Onda 5 — Transações & taxas
- Padronizar criação (`admin_add_transaction` já tem `_fee_waived`): expor toggle **No Fee** em toda UI de criação/edição para Admin e Agent. Fee padrão 3% já implementada.
- Modal **Details** dos extratos com ordem exata: Type → Amount (cripto + convertido) → Fee → Status (colorido) → Hash ID → Reference → Date → Note.

### Onda 6 — Team & permissões
- Botão **Adicionar Agente** em `/admin/team` com modal de e-mail → RPC `admin_promote_to_agent(email)` (cria/atualiza role para `agent`).
- `AgentPermissionsDialog` já existe; adicionar mais toggles (`can_add_wallets`, `can_waive_fees`, `can_approve_withdrawals`).

### Onda 7 — i18n
- Auditar todos os arquivos por strings hardcoded em PT e migrar para `t()`.
- Completar `en.json` e `de.json` com todas as chaves de `pt.json`. Padronizar chaves faltantes.
- Corrigir bug de hidratação do `LanguageSwitcher` (bandeira SSR ≠ client) — renderizar bandeira apenas depois de montar.

### Onda 8 — QA final
- Rodar Playwright headless: login como admin de teste, percorrer Dashboard, Clients, Team, Client profile, Market, Wallets, Ações. Screenshot de cada tela. Corrigir o que aparecer.

## Migrações de banco necessárias
1. `client_internal_transfer(_from_wallet, _to_currency, _amount)` — transfere entre carteiras do mesmo user.
2. `admin_promote_to_agent(_email)` — resolve user por e-mail e faz `admin_set_role` para `agent`.
3. `client_request_withdrawal_v2` — versão que aceita `insurance_requested`, aplica fee 3,5%, cria ticket automático.
4. `admin_set_insurance_quote(_tx_id, _percent)` + `client_respond_insurance(_tx_id, _approve, _method)`.
5. Colunas em `agent_permissions`: `can_waive_fees bool`, `can_approve_withdrawals bool`.

## Confirmação antes de começar

Isso é ~2h de trabalho e várias migrações. Antes de eu iniciar:

**Confirma que posso executar tudo de uma vez, criando as 5 migrações listadas acima?** Se preferir enxugar (por ex. pular o fluxo de seguro complexo ou o transfer interno), me diga agora — caso contrário sigo com o plano completo, onda por onda, sem parar.
