import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import pt from "./locales/pt.json";
import en from "./locales/en.json";
import de from "./locales/de.json";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        pt: { translation: pt },
        en: { translation: en },
        de: { translation: de },
      },
      fallbackLng: "en",
      supportedLngs: ["pt", "en", "de"],
      interpolation: { escapeValue: false },
      detection: {
        // Only remember the user's explicit choice. First visit → English.
        order: ["localStorage"],
        caches: ["localStorage"],
        lookupLocalStorage: "cv_lang",
      },
    });
}

export default i18n;
