import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import pt from "./locales/pt.json";
import en from "./locales/en.json";
import de from "./locales/de.json";

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
      supportedLngs: ["pt", "en", "de"],
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
}

export const LANG_STORAGE_KEY = "cv_lang";

export default i18n;
