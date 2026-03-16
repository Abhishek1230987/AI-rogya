import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

console.log("Loading i18n configuration...");

import enTranslations from "./locales/en.json";
import hiTranslations from "./locales/hi.json";
import taTranslations from "./locales/ta.json";
import bnTranslations from "./locales/bn.json";
import teTranslations from "./locales/te.json";
import mrTranslations from "./locales/mr.json";
import guTranslations from "./locales/gu.json";
import knTranslations from "./locales/kn.json";
import orTranslations from "./locales/or.json";
import urTranslations from "./locales/ur.json";
import asTranslations from "./locales/as.json";
import maiTranslations from "./locales/mai.json";

console.log("Translation files loaded");

const resources = {
  en: {
    translation: enTranslations,
  },
  hi: {
    translation: hiTranslations,
  },
  ta: {
    translation: taTranslations,
  },
  bn: {
    translation: bnTranslations,
  },
  te: {
    translation: teTranslations,
  },
  mr: {
    translation: mrTranslations,
  },
  gu: {
    translation: guTranslations,
  },
  kn: {
    translation: knTranslations,
  },
  or: {
    translation: orTranslations,
  },
  ur: {
    translation: urTranslations,
  },
  as: {
    translation: asTranslations,
  },
  mai: {
    translation: maiTranslations,
  },
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: "en", // Default language
    lng: localStorage.getItem("selectedLanguage") || "en", // Load saved language or default to English

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  })
  .then(() => {
    // Debug: Log after initialization completes
    console.log("i18n initialized successfully");
    console.log("Current language:", i18n.language);
    console.log("Available languages:", Object.keys(resources));
    console.log("Sample translation test:", i18n.t("home.title"));

    // Expose to window for debugging
    if (typeof window !== "undefined") {
      window.i18n = i18n;
    }
  })
  .catch((error) => {
    console.error("i18n initialization failed:", error);
  });

export default i18n;
