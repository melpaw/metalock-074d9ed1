import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { applyClientLanguage } from "@/i18n";

export function ProfileInfoTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["me-profile-full"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const patch: any = {
        full_name: form.full_name,
        phone: form.phone,
        date_of_birth: form.date_of_birth || null,
        postal_code: form.postal_code,
        city: form.city,
        country: form.country,
        full_address: form.full_address,
        locale: form.locale,
        display_currency: form.display_currency,
      };
      const { error } = await supabase.from("profiles").update(patch).eq("id", form.id);
      if (error) throw error;
      await applyClientLanguage(form.locale);
    },
    onSuccess: () => { toast.success(t("profile.info.saved")); qc.invalidateQueries({ queryKey: ["me-profile-full"] }); qc.invalidateQueries({ queryKey: ["me-profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return <div className="text-muted-foreground text-sm">{t("common.loading")}</div>;

  return (
    <div className="rounded-sm border border-border bg-surface p-6 space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("profile.info.fullName")}>
          <Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label={t("profile.info.email")}>
          <Input value={form.email ?? ""} disabled />
        </Field>
        <Field label={t("profile.info.phone")}>
          <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label={t("profile.info.dob")}>
          <Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
        </Field>
        <Field label={t("profile.info.country")}>
          <Input value={form.country ?? ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </Field>
        <Field label={t("profile.info.city")}>
          <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field label={t("profile.info.postal")}>
          <Input value={form.postal_code ?? ""} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
        </Field>
        <Field label={t("profile.info.language")}>
          <Select value={form.locale ?? "pt"} onValueChange={(v) => setForm({ ...form, locale: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pt">🇧🇷 Português</SelectItem>
              <SelectItem value="en">🇺🇸 English</SelectItem>
              <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("profile.info.displayCurrency")}>
          <Select value={form.display_currency ?? "USD"} onValueChange={(v) => setForm({ ...form, display_currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD — US Dollar</SelectItem>
              <SelectItem value="EUR">EUR — Euro</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="md:col-span-2">
          <Field label={t("profile.info.address")}>
            <Textarea rows={2} value={form.full_address ?? ""} onChange={(e) => setForm({ ...form, full_address: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="h-4 w-4 mr-2" /> {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
