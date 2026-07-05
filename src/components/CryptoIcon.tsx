import { cn } from "@/lib/utils";

const SYMBOLS: Record<string, string> = {
  bitcoin: "₿",
  btc: "₿",
  ethereum: "◆",
  eth: "◆",
  tether: "₮",
  usdt: "₮",
  binancecoin: "BNB",
  bnb: "BNB",
  solana: "◎",
  sol: "◎",
  ripple: "XRP",
  xrp: "XRP",
  cardano: "ADA",
  ada: "ADA",
  usd: "$",
  eur: "€",
};

type CryptoIconProps = {
  id?: string | null;
  symbol?: string | null;
  className?: string;
};

export function CryptoIcon({ id, symbol, className }: CryptoIconProps) {
  const key = (symbol || id || "?").toLowerCase();
  const label = SYMBOLS[key] ?? SYMBOLS[(id || "").toLowerCase()] ?? (symbol || id || "?").slice(0, 3).toUpperCase();
  const short = label.length > 2;

  return (
    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-sm", className)}>
      <span className={cn("font-black leading-none", short ? "text-[9px]" : "text-base")}>{label}</span>
    </span>
  );
}