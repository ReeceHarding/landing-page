import Negotiator from "negotiator";

/**
 * i18n configuration
 */

export const locales = ["", "en", "en-US", "zh", "zh-CN", "zh-TW", 'zh-HK', 'ja', "ar", "es", "ru"];

export const localeNames: any = {
  en: "🇺🇸 English",
  "en-US": "🇺🇸 English (US)",
  zh: "🇨🇳 中文",
  "zh-CN": "🇨🇳 简体中文",
  "zh-TW": "🇹🇼 繁體中文",
  "zh-HK": "🇭🇰 繁體中文",
  ja: "🇯🇵 日本語",
  ar: "🇸🇦 العربية",
  es: "🇪🇸 Español",
  ru: "🇷🇺 Русский",
};

export const defaultLocale = "en";

// If you wish to automatically redirect users to a URL that matches their browser's language setting,
// you can use the following code:
export function getLocaleFromHeaders(headers: Headers): string {
  const negotiator = new Negotiator({ headers: Object.fromEntries(headers.entries()) });
  return negotiator.language(locales) || defaultLocale;
}

export type Locale = typeof locales[number];

export const isValidLocale = (locale: string): locale is Locale => {
  return locales.includes(locale as Locale);
};

const dictionaries: any = {
  en: () => import("@/locales/en.json").then((module) => module.default),
  zh: () => import("@/locales/zh.json").then((module) => module.default),
  ja: () => import("@/locales/ja.json").then((module) => module.default),
  ar: () => import("@/locales/ar.json").then((module) => module.default),
  es: () => import("@/locales/es.json").then((module) => module.default),
  ru: () => import("@/locales/ru.json").then((module) => module.default),
};

export const getDictionary = async (locale: string) => {
  if (["zh-CN", "zh-TW", "zh-HK"].includes(locale)) {
    locale = "zh";
  }

  if (!Object.keys(dictionaries).includes(locale)) {
    locale = "en";
  }

  return dictionaries[locale]();
};
