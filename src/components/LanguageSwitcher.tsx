import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import i18nInstance from "@/i18n";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const langs = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const activeLanguage = (i18n?.language || i18nInstance.language || "en").slice(0, 2);
  const current = langs.find((l) => l.code === activeLanguage) ?? langs[1];

  async function change(code: string) {
    await (i18n?.changeLanguage ?? i18nInstance.changeLanguage.bind(i18nInstance))(code);
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) await supabase.from("profiles").update({ locale: code }).eq("id", data.user.id);
    } catch { /* ignore */ }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} className="gap-2">
          <Globe className="h-4 w-4" />
          {!compact && <span className="text-sm">{current.flag} {current.label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {langs.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => change(l.code)}
            className={l.code === current.code ? "font-semibold" : ""}>
            <span className="mr-2">{l.flag}</span> {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
