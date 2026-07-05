import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
});

type PriceMap = Record<string, { usd: number; usd_24h_change: number }>;

let cache: { at: number; key: string; data: PriceMap } | null = null;
const TTL = 60_000;

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
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(key)}&vs_currencies=usd&include_24hr_change=true`;
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const json = (await res.json()) as PriceMap;
      cache = { at: Date.now(), key, data: json };
      return { data: json, cached: false };
    } catch (e) {
      console.error("[prices]", e);
      return { data: cache?.data ?? {}, cached: true, error: "unavailable" };
    }
  });
