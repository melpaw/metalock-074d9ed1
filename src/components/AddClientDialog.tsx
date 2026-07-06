import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

export function AddClientDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      if (!email.trim()) throw new Error("Informe o email");
      const { error } = await supabase.rpc("admin_register_client", { _email: email.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente vinculado com sucesso");
      setOpen(false);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-clients"] });
    },
    onError: (e: any) => {
      const msg = e.message || "Erro";
      if (msg.includes("user_not_found")) toast.error("Usuário com esse email não encontrado. Peça para ele criar a conta primeiro.");
      else toast.error(msg);
    },
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" /> Adicionar cliente
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Informe o email de um usuário já cadastrado. Ele passará a ser seu cliente e você poderá gerenciá-lo.
            </p>
            <Input
              type="email"
              placeholder="cliente@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add.mutate()}
            />
            <Button className="w-full" onClick={() => add.mutate()} disabled={add.isPending}>
              {add.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
