# Wallets and Financial Flow

## Wallet lifecycle

1. A `wallet` row is created lazily the first time a user holds a
   non-zero balance in a currency. The row is uniquely keyed by
   `(user_id, currency_id)`.
2. Balances are split into `available` and `locked` amounts.
   `locked` reflects funds tied up in an investment or a pending
   withdrawal.
3. Wallet totals are always derived from `transactions`, never
   edited directly. Any adjustment must produce a matching
   `transaction` row so the audit log stays complete.

## Transaction state machine

`transactions.status` values:

- `pending` — created, awaiting admin/agent review.
- `approved` — accepted; balance mutation trigger fires.
- `rejected` — declined; no balance change.
- `completed` — terminal state for approved rows.

Only `approved`/`completed` rows affect wallet balances.

## Price calculation

The dashboard evaluates each wallet at:

```
livePrice   := prices[currency.coingecko_id]?.usd
dbPrice     := currency.usd_price
stableGuess := currency.symbol in {USDT, USDC, DAI, BUSD, TUSD, USD} ? 1 : 0
price       := livePrice > 0 ? livePrice
             : dbPrice   > 0 ? dbPrice
             : stableGuess
```

This tiered fallback prevents transient CoinGecko outages from
zeroing user portfolios. The same logic is mirrored on the admin
client detail page so admin and user totals never disagree.

## Investments

`investments` rows carry `amount`, `plan_id`, `lock_end_at`,
`accrued`. When created, they move `amount` from `available` to
`locked`; when unlocked, funds return to `available` plus accrued
interest.
