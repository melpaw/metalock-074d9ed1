import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { de, enUS, ptBR } from "date-fns/locale";
import { useTranslation } from "react-i18next";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const locale = i18n.language.startsWith("de") ? de : i18n.language.startsWith("pt") ? ptBR : enUS;

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    refetchInterval: 30_000,
  });

  const unread = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = notifications.filter((n) => !n.read_at).map((n) => n.id);
      if (ids.length === 0) return;
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-sm bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">{t("notifications.title")}</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} className="h-7 text-xs">
              <Check className="mr-1 h-3 w-3" /> {t("notifications.markAll")}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("notifications.empty")}</div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const inner = (
                  <div className={`p-3 hover:bg-accent/40 ${!n.read_at ? "bg-primary/5" : ""}`}>
                    <div className="flex items-start gap-2">
                      {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm bg-primary" />}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{n.title}</div>
                        {n.body && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} onClick={() => !n.read_at && markOne.mutate(n.id)}>
                    {n.link ? (
                      <Link to={n.link} className="block">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
