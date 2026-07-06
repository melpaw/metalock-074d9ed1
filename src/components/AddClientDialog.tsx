import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function AddClientDialog() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      if (!email.trim()) throw new Error(t("admin.enterEmail"));
      const { error } = await supabase.rpc("admin_register_client", { _email: email.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("admin.clientLinked"));
      setOpen(false);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-clients"] });
    },
    onError: (e: any) => {
      const msg = e.message || t("common.error");
      if (msg.includes("user_not_found")) toast.error(t("admin.userNotFound"));
      else toast.error(msg);
    },
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" /> {t("admin.addClient")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.linkClient")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("admin.linkClientHint")}
            </p>
            <Input
              type="email"
              placeholder={t("admin.clientEmailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add.mutate()}
            />
            <Button className="w-full" onClick={() => add.mutate()} disabled={add.isPending}>
              {add.isPending ? t("admin.adding") : t("common.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
