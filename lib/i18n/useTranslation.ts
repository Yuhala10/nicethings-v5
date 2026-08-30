"use client";

import { useLanguage } from "../../components/i18n/LanguageProvider";
import { getTranslations, type Language } from "./index";

/**
 * Custom hook to access translations with proper typing
 * Usage: const t = useTranslation();
 * Access: t.home.title, t.common.appName, etc.
 */
export function useTranslation() {
  const { language } = useLanguage();
  const translations = getTranslations(language);
  return translations;
}

/**
 * Get language-specific translations (server-side or when language is known)
 */
export function getTranslate(language: Language) {
  const translations = getTranslations(language);
  return translations;
}
