# Plano de correção — 5 áreas

## 1. Saldo do Cliente nunca zerar

Sintoma: Total Balance oscila entre valor correto e 0. Causas prováveis:
- `useQuery` sem `placeholderData: keepPreviousData` → durante refetch o `wallets` fica `undefined` e o total cai para 0.
- Preços vindos de `getMarketPrices` podem retornar `{}` em cold start / rate‑limit e zerar `priceUsd` de moedas sem `usd_price` fallback.
- Nenhuma subscription realtime em `wallets`.

Correções:
- Adicionar `placeholderData: (prev) => prev` em `my-wallets`, `currencies-active`, `my-transactions` e `prices-overview` para preservar dados durante refetch.
- Fallback robusto de preço: se `livePrice` ausente, usar `currencies.usd_price`; se ainda `0` e símbolo estável (USDT/USDC/DAI/BUSD/USD/EUR), assumir 1 (ou taxa EUR).
- Subscrição Supabase Realtime em `wallets` filtrada por `user_id = auth.uid()` que dispara `invalidateQueries(["my-wallets"])`.
- Salvaguarda: se `wallets === undefined`, mostrar skeleton em vez de renderizar `Total Balance = 0`.

## 2. Erro ao criar transação (Admin/Agent)

Investigar: a RPC `admin_add_transaction` tem duas assinaturas — uma com `_fee_waived` e outra sem. Se `AddClientDialog`/tela chama com argumentos que não batem exatamente, o Postgres levanta `function ... does not exist`. Ver mensagem exata do erro (peço para você me passar o texto se possível) e:
- Padronizar chamada em TS para a versão nova (com `_fee_waived boolean`).
- Dropar a assinatura antiga via migração para evitar ambiguidade.
- Garantir que `_tx_date` aceita `null` (default `now()`).
- Testar deposit, withdrawal, swap, adjustment.

## 3. Página Team em formato de cards (como Clients)

Reescrever `admin.team.tsx`:
- Grid de cards (2/3/4 colunas responsivo), cada card mostra: avatar iniciais, nome, email, cargo atual (badge), data de registro, indicadores (nº de clientes atendidos se `agent`, nº de tickets abertos).
- Ações por card (dropdown "..."):
  - Editar dados (abre dialog reaproveitando os campos de `admin_update_profile`).
  - Alterar cargo (Admin / Agent / Client).
  - Permissões (abre `AgentPermissionsDialog` já existente — expandido: `can_add_wallets`, `can_approve_kyc`, `can_process_tx`).
  - Remover (rebaixa para `client`).
- Filtro por cargo + busca por nome/email.
- Botão "Adicionar agente" mantém `admin_register_client + admin_set_role`.

Migração leve: adicionar colunas `can_approve_kyc`, `can_process_tx` em `agent_permissions` (default false).

## 4. Página Wallets completa

Reescrever `app.wallets.tsx`:
- Lista de carteiras em cards (mantém tabela como fallback), agora cada card é clicável.
- Ao clicar → nova rota `_authenticated/app.wallets.$currencyId.tsx` (detalhe) OU dialog em tela cheia. Vou usar rota para permitir link direto.
- Detalhe contém:
  - Header com ícone, nome/símbolo, saldo grande + valor USD/EUR.
  - Botões primários: **Enviar** (abre SendPanel filtrado), **Receber** (mostra endereço + QR), **Copiar endereço**.
  - Card com endereço completo + QR code (usa `qrcode.react` — já uso `<img>` gerado via `api.qrserver.com` para evitar dependência).
  - Se sem endereço → CTA "Solicitar endereço".
  - Histórico da carteira: `transactions` filtradas por `currency_id` com paginação (últimas 50), status colorido, click abre detalhe.
- Mantém design premium: bordas retas, gradient sutil no header, tabular-nums.

## 5. Cashback escalonado

Alterar `staff_process_swap` (RPC):
- Regra baseada em `tx.usd_value`:
  - `<= 10_000` → 1%
  - `> 10_000 && <= 50_000` → 3%
  - `> 50_000` → 5%
- Aplicar em `cashback_usd = usd_value * rate`.
- Atualizar UI da página Market para mostrar tabela de faixas em vez de "0.5%".
- Manter cashback creditado em USDT via `transactions type='adjustment' metadata.kind='cashback'`.

## Ordem de execução

1. Migração única: dropar `admin_add_transaction` antiga sem `_fee_waived`; ajustar `staff_process_swap` (cashback escalonado); adicionar colunas em `agent_permissions`.
2. Página Wallets nova (`app.wallets.tsx` + `app.wallets.$currencyId.tsx`).
3. Página Team nova em formato de cards.
4. Correções de saldo (queries + realtime + fallbacks).
5. UI Market atualizada.
6. QA via Playwright: login admin → adicionar transação; login client → ver saldo + navegar wallets → detalhe.

## Perguntas rápidas antes de começar

1. **Detalhe da Wallet**: prefere **rota nova** (`/app/wallets/BTC`) — permite link direto — ou **dialog em tela cheia**?
2. **Erro ao criar transação**: você tem a mensagem exata do erro (do toast ou console)? Se não, eu reproduzo via Playwright.
3. **Permissões extras de agente** (aprovar KYC, processar transações) — quer que eu adicione agora ou mantenho só `can_add_wallets`?

Confirme (ou responda "toca ficha") e eu executo tudo em sequência.
