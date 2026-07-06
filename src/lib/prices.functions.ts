import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
});

type PriceMap = Record<string, { usd: number; eur?: number; usd_24h_change: number }>;

let cache: { at: number; key: string; data: PriceMap } | null = null;
const TTL = 60_000;

const FALLBACK_PRICES: PriceMap = {
  bitcoin: { usd: 62581, eur: 57574, usd_24h_change: 0.19 },
  ethereum: { usd: 1755.71, eur: 1615.25, usd_24h_change: 0.22 },
  tether: { usd: 1, eur: 0.92, usd_24h_change: 0 },
  "usd-coin": { usd: 1, eur: 0.92, usd_24h_change: 0 },
  binancecoin: { usd: 576.6, eur: 530.47, usd_24h_change: 0.63 },
  solana: { usd: 134.8, eur: 124.02, usd_24h_change: 1.14 },
  cardano: { usd: 0.1828, eur: 0.1682, usd_24h_change: -3.71 },
  ripple: { usd: 0.519, eur: 0.477, usd_24h_change: 0.41 },
  dogecoin: { usd: 0.0766, eur: 0.0705, usd_24h_change: 1.33 },
  litecoin: { usd: 68.2, eur: 62.74, usd_24h_change: 0.28 },
  tron: { usd: 0.123, eur: 0.113, usd_24h_change: 0.18 },
  "matic-network": { usd: 0.49, eur: 0.45, usd_24h_change: -0.34 },
  "avalanche-2": { usd: 6.83, eur: 6.28, usd_24h_change: 0.4 },
};

function withFallback(ids: string[], data: PriceMap): PriceMap {
  return Object.fromEntries(ids.map((id) => [id, data[id] ?? FALLBACK_PRICES[id] ?? { usd: 0, eur: 0, usd_24h_change: 0 }]));
}

/**
 * Public server fn — fetches spot prices from CoinGecko.
 * Cached in-memory 60s to respect rate limits.
 */
export const getMarketPrices = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const key = data.ids.slice().sort().join(",");
    if (cache && cache.key === key && Date.now() - cache.at < TTL) {
      return { data: cache.data, cached: true };
    }
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(key)}&vs_currencies=usd,eur&include_24hr_change=true`;
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const json = withFallback(data.ids, (await res.json()) as PriceMap);
      cache = { at: Date.now(), key, data: json };
      return { data: json, cached: false };
    } catch (e) {
      console.error("[prices]", e);
      return { data: cache?.data ?? withFallback(data.ids, {}), cached: true, error: "unavailable" };
    }
  });
