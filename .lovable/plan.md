## Fase 1 — Painel Admin (agora)

Vou entregar uma fatia funcional e bonita, pronta para crescer nas próximas fases. Stack adaptada ao Lovable: **TanStack Start + React + TypeScript + Tailwind v4 + Shadcn + Lovable Cloud (Postgres + Auth + Storage + Edge)**. Isto substitui Next.js/NestJS separados mas cobre os mesmos requisitos (Postgres, JWT/sessão via cookies, RLS no lugar do RBAC em código, Edge Functions em vez de rotas Nest).

### O que entra nesta fase

1. **Design system Binance-dark**
   - Tokens em `src/styles.css`: `#0B0E11` bg, `#181A20` surface, `#F0B90B` primary (amarelo Binance), `#EAECEF` text, verde/vermelho para up/down.
   - Fonte: Inter. Tema escuro por padrão, claro disponível.
   - Variantes shadcn (button `primary`/`ghost`/`danger`, card `surface`), tabela densa estilo exchange.

2. **Autenticação + RBAC**
   - Lovable Cloud (email+senha, confirmação de email desligada para agilizar testes).
   - Tabelas: `profiles`, `user_roles` (enum `admin` | `agent` | `client`), função `has_role()` security-definer.
   - Rota `/auth` (login/signup) e layout `_authenticated` gerenciado.
   - Gate `_admin` que exige role `admin` via `beforeLoad`.
   - Trigger: primeiro usuário criado vira `admin`; demais viram `client`.

3. **Schema base (migrations)**
   - `profiles`, `user_roles`
   - `currencies` (symbol, name, network, decimals, active)
   - `plans` (name, min, max, daily_rate, duration_days, active)
   - `wallets` (user_id, currency_id, available, locked)
   - `transactions` (type: deposit/withdraw/investment/profit, amount, status)
   - `audit_logs` (actor_id, action, target, metadata)
   - RLS em todas; grants explícitos; policies via `has_role`.

4. **Rotas Admin** (`/admin/*`)
   - **Dashboard**: KPIs (total usuários, depósitos, saques, volume), gráfico de novos cadastros (Recharts).
   - **Usuários**: listar, filtrar, ver detalhes, congelar/liberar, atribuir role, ajustar saldo (registra em `audit_logs`).
   - **Moedas**: CRUD; preços ao vivo via CoinGecko (`/api/v3/simple/price`) com cache 60s.
   - **Planos**: CRUD.
   - **Logs de auditoria**: tabela paginada.

5. **Rota pública `/`**
   - Landing curta estilo Binance com CTA "Entrar no app".

### Fora desta fase (fases seguintes)

- Dashboard Cliente completo, KYC, staking, chat suporte, 2FA, integrações Stripe/CoinPayments, notificações push/SMS, exports PDF/Excel, painel do Agente.
- Estas ficam pré-preparadas no schema/roles mas sem UI ainda.

### Detalhes técnicos

- Server functions (`createServerFn` + `requireSupabaseAuth`) para ações admin; RLS + checagem de role no handler (defesa em profundidade).
- CoinGecko em Edge Function pública (`/api/public/prices`) com cache in-memory 60s.
- Auditoria: toda mutação admin insere em `audit_logs`.
- Todos os ajustes de saldo passam por RPC `admin_adjust_balance(user_id, currency_id, delta, reason)` — atômica, valida role, grava log.

### Confirmação

Depois desta fase entrego a Fase 2 (área Cliente: wallet, depósito/saque, investimentos). Ok seguir?