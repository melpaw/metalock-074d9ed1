import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import pt from "./locales/pt.json";
import en from "./locales/en.json";
import de from "./locales/de.json";

export const LANG_STORAGE_KEY = "cv_lang";
export const SUPPORTED_LANGUAGES = ["pt", "en", "de"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function normalizeLanguageCode(value: string | null | undefined): SupportedLanguage | null {
  if (!value) return null;
  const code = value.slice(0, 2).toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code) ? (code as SupportedLanguage) : null;
}

export async function applyClientLanguage(value: string | null | undefined, persist = true) {
  const code = normalizeLanguageCode(value);
  if (!code) return;
  if (i18n.language.slice(0, 2) !== code) await i18n.changeLanguage(code);
  if (typeof document !== "undefined") document.documentElement.lang = code;
  if (persist && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, code);
      window.localStorage.removeItem("i18nextLng");
    } catch { /* ignore */ }
  }
}

// IMPORTANT: do NOT use a language detector here. The server always renders
// with the fallback language ("en"); if the client picks a different language
// from localStorage during the very first render, React fails hydration and
// regenerates the whole tree — which closes dialogs, resets <Select> state,
// and produces intermittent "try again" errors across the app.
//
// The client-side language switch happens in <I18nLanguageSync/> AFTER
// hydration (see src/routes/__root.tsx), so SSR and the first client render
// always match.
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        pt: { translation: pt },
        en: { translation: en },
        de: { translation: de },
      },
      lng: "en",
      fallbackLng: "en",
      supportedLngs: SUPPORTED_LANGUAGES,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
} else if (i18n.language.slice(0, 2) !== "en") {
  // In dev SSR/HMR and long-lived server workers, the module singleton can
  // survive between renders after a user changes language. Force the default
  // language back before any SSR/first-client render to keep hydration stable.
  void i18n.changeLanguage("en");
}

export default i18n;
