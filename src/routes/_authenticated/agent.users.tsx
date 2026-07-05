import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/agent/users")({
  component: AgentUsersPage,
});

function AgentUsersPage() {
  const [search, setSearch] = useState("");

  const { data: users } = useQuery({
    queryKey: ["agent-users", search],
    queryFn: async () => {
      const q = supabase.from("profiles").select("id, email, full_name, status, created_at").order("created_at",{ascending:false}).limit(50);
      const { data } = search ? await q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`) : await q;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultar cliente</h1>
          <p className="text-sm text-muted-foreground">Busque e veja saldos e histórico</p>
        </div>
        <Input placeholder="Buscar por email ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <div className="grid gap-3">
        {users?.map((u: any) => (
          <details key={u.id} className="rounded-xl border border-border bg-surface p-4">
            <summary className="cursor-pointer flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium">{u.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded border border-border capitalize">{u.status}</span>
            </summary>
            <UserDetail userId={u.id} />
          </details>
        ))}
        {users?.length === 0 && <div className="text-center text-muted-foreground py-8">Nenhum usuário.</div>}
      </div>
    </div>
  );
}

function UserDetail({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["agent-user-detail", userId],
    queryFn: async () => {
      const [w, t] = await Promise.all([
        supabase.from("wallets").select("available,locked, currencies(symbol)").eq("user_id", userId),
        supabase.from("transactions").select("type,status,amount,created_at, currencies(symbol)").eq("user_id", userId).order("created_at",{ascending:false}).limit(15),
      ]);
      return { wallets: w.data ?? [], transactions: t.data ?? [] };
    },
  });

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <h4 className="text-xs uppercase text-muted-foreground mb-2">Carteiras</h4>
        <div className="space-y-1 text-sm">
          {data?.wallets.map((w: any, i: number) => (
            <div key={i} className="flex justify-between border-b border-border/50 py-1">
              <span>{w.currencies?.symbol}</span>
              <span className="font-mono">{Number(w.available).toFixed(6)} {Number(w.locked) > 0 && <span className="text-warning ml-1">({Number(w.locked).toFixed(4)} bloq)</span>}</span>
            </div>
          ))}
          {data?.wallets.length === 0 && <div className="text-muted-foreground">Nenhuma.</div>}
        </div>
      </div>
      <div>
        <h4 className="text-xs uppercase text-muted-foreground mb-2">Últimas transações</h4>
        <div className="space-y-1 text-sm">
          {data?.transactions.map((t: any, i: number) => (
            <div key={i} className="flex justify-between border-b border-border/50 py-1">
              <span className="capitalize">{t.type} <span className="text-xs text-muted-foreground">({t.status})</span></span>
              <span className="font-mono">{Number(t.amount).toFixed(6)} {t.currencies?.symbol}</span>
            </div>
          ))}
          {data?.transactions.length === 0 && <div className="text-muted-foreground">Sem transações.</div>}
        </div>
      </div>
    </div>
  );
}
