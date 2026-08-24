import { useEffect } from "react";
import { applyClientLanguage, getStoredLanguage } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

/**
 * Applies the user's chosen language AFTER hydration (SSR always renders "en").
 *
 * Priority:
 *  1. Explicit choice saved in localStorage (wins always — it is what the user clicked)
 *  2. profiles.locale of the signed-in user (only when there is no local choice)
 *  3. "en" (default)
 *
 * Mounted once in __root so every route — public, client area and admin —
 * keeps the same language instead of falling back to the default.
 */
export function I18nLanguageSync() {
  useEffect(() => {
    let cancelled = false;

    const stored = getStoredLanguage();
    if (stored) {
      void applyClientLanguage(stored, false);
      return () => { cancelled = true; };
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled || !data.user) return;
      const { data: p } = await supabase
        .from("profiles").select("locale").eq("id", data.user.id).maybeSingle();
      if (cancelled) return;
      // Persist so the choice survives sign-out and public pages.
      await applyClientLanguage((p as any)?.locale ?? "en");
    }).catch(() => { /* ignore */ });

    return () => { cancelled = true; };
  }, []);

  return null;
}
