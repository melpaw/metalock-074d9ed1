## Objetivo

Fechar os três pontos pendentes: fluxo de seguro completo em saques, transferência interna entre carteiras próprias, e polimento final de `admin.clients.$userId`.

## Migrações

**Já aprovadas e executadas** nesta rodada:
- `client_request_withdrawal_v2(_currency_id, _amount, _bank_id, _insurance_requested)` — saque com fee 3,5% servidor-side, bank_id e flag de seguro no metadata; notifica staff quando pede cotação.
- `admin_set_insurance_quote(_tx_id, _percent)` — admin/agente define %, notifica cliente.
- `client_respond_insurance(_tx_id, _approve, _payment_note)` — aprovar cria ticket `insurance_payment` com a forma de pagamento; recusar mantém saque sem seguro; ambos notificam staff.
- `client_internal_transfer(_from_currency, _to_currency, _amount)` — debita/credita carteiras do mesmo usuário usando preço vigente, sem fee.
- Enum `tx_type` ganhou valor `transfer`.

## Frontend

### `src/components/wallet/WalletActions.tsx`
- `WithdrawPanel`: chamar `client_request_withdrawal_v2` passando `_bank_id` e `_insurance_requested`. Remover o hack `BANK:<id>` no address.
- `SendPanel`: reescrever como **transferência interna** (de carteira → carteira do próprio cliente) via `client_internal_transfer`, com aviso de que envio para terceiros vai pela aba Sacar. Passa a receber `currencies` como prop.
- Atualizar `WalletActions` para repassar `currencies` ao `SendPanel`.

### `src/routes/_authenticated/app.index.tsx` — `TransactionDetailsDialog`
- Quando `tx.metadata.insurance_status === 'quoted'` e o viewer é o dono da transação, adicionar bloco com "% cotado" + textarea de forma de pagamento + botões Aprovar / Recusar (chamam `client_respond_insurance`).
- Quando `insurance_status === 'approved'` mostrar link para o ticket (`insurance_ticket_id`).

### Filas de transações (admin + agent)
- `src/components/queues/TransactionsQueue.tsx` (e/ou `admin.transactions.tsx` / `agent.transactions.tsx`): quando `metadata.insurance_requested && !metadata.insurance_percent`, mostrar botão "Cotar seguro" que abre um dialog com input de % e chama `admin_set_insurance_quote`.

### i18n
Adicionar em pt/en/de:
- `wallet.internalTransferHint`, `wallet.fromWallet`, `wallet.toWallet`, `wallet.confirmTransfer`, `wallet.transferDone`
- `tx.insuranceQuoted`, `tx.insuranceApprove`, `tx.insuranceReject`, `tx.insurancePaymentNote`, `tx.insurancePaymentPlaceholder`, `tx.insuranceTicketOpen`, `tx.insurancePercentLabel`
- `admin.quoteInsurance`, `admin.quoteInsuranceTitle`, `admin.percentLabel`, `admin.saveQuote`

### Polimento `admin.clients.$userId.tsx`
- Varredura para trocar quaisquer strings PT hardcoded residuais por `t()`.
- Garantir `rounded-sm`/sem `rounded-lg` nos cards/badges/inputs.
- Padronizar cores de status (verde/amarelo/vermelho) nas seções de KYC, transações e tickets.

## QA final
- Rodar Playwright headless: cliente → pede saque com seguro; admin → cotar 5%; cliente → aprovar com nota; verificar que o ticket aparece em `/app/support`.
- Cliente → aba Enviar → transferir 1 USDT para BTC → verificar wallets atualizadas e 2 linhas em transações.

Confirma para eu implementar? (as migrações já foram aplicadas)