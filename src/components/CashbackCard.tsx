import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

export function CashbackCard() {
  const { data } = useQuery({
    queryKey: ["my-cashback"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { total: 0, count: 0 };
      const { data: rows } = await supabase
        .from("transactions")
        .select("cashback_amount")
        .eq("user_id", u.user.id)
        .gt("cashback_amount", 0);
      const total = (rows ?? []).reduce((s: number, r: any) => s + Number(r.cashback_amount || 0), 0);
      return { total, count: rows?.length ?? 0 };
    },
  });

  return (
    <div className="rounded-sm border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Cashback acumulado
      </div>
      <div className="mt-2 text-2xl font-black tabular-nums">${(data?.total ?? 0).toFixed(2)}</div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        0,5% de volta em USDT a cada compra aprovada. {data?.count ?? 0} recompensas até agora.
      </p>
    </div>
  );
}
