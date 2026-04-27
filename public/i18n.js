/**
 * i18n - Internationalisierung / Übersetzungsmodul
 * Bietet t(), initI18n(), setLocale(), getLocale(), getSupportedLocales(),
 * formatDate(), formatTime() für die gesamte App.
 * Dependencies: none (vanilla JS, Fetch API, Intl API)
 */

const SUPPORTED_LOCALES = ['de', 'en', 'es', 'fr', 'it', 'sv', 'el', 'ru', 'tr', 'zh', 'ja', 'ar', 'hi', 'pt', 'uk'];
const DEFAULT_LOCALE = 'de';
const STORAGE_KEY = 'oikos-locale';
const DATE_FORMAT_KEY = 'oikos-date-format';
const DEFAULT_DATE_FORMAT = 'mdy';

let currentLocale = DEFAULT_LOCALE;
let translations = {};
let fallbackTranslations = {};

/** Resolve locale: manual override > navigator.language > English > default */
function resolveLocale() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;

  const browserLocales = navigator.languages || [navigator.language];
  for (const tag of browserLocales) {
    const base = tag.split('-')[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(base)) return base;
  }
  return 'en';
}

/** Lade eine Locale-JSON-Datei */
async function loadLocale(locale) {
  const resp = await fetch(`/locales/${locale}.json`);
  if (!resp.ok) throw new Error(`Failed to load locale: ${locale}`);
  return resp.json();
}

/** Initialisierung - einmal beim App-Start aufrufen */
export async function initI18n() {
  currentLocale = resolveLocale();
  fallbackTranslations = await loadLocale(DEFAULT_LOCALE);
  if (currentLocale !== DEFAULT_LOCALE) {
    try {
      translations = await loadLocale(currentLocale);
    } catch {
      translations = fallbackTranslations;
      currentLocale = DEFAULT_LOCALE;
    }
  } else {
    translations = fallbackTranslations;
  }
  document.documentElement.lang = currentLocale;
}

/** Sprache wechseln - löst 'locale-changed' Event aus */
export async function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  localStorage.setItem(STORAGE_KEY, locale);
  currentLocale = locale;
  const loaded = locale === DEFAULT_LOCALE
    ? fallbackTranslations
    : await loadLocale(locale);
  if (currentLocale !== locale) return;
  translations = loaded;
  document.documentElement.lang = locale;
  window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
}

/** Hilfsfunktion: Dot-Notation in verschachteltem Objekt auflösen */
function resolve(obj, key) {
  return key.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

/** Übersetzungsfunktion mit Platzhalter-Unterstützung {{variable}} */
export function t(key, params = {}) {
  let str = resolve(translations, key) ?? resolve(fallbackTranslations, key) ?? key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replaceAll(`{{${k}}}`, String(v));
  }
  return str;
}

function isDateOnlyString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getDateFormatPreference() {
  const stored = localStorage.getItem(DATE_FORMAT_KEY);
  return ['mdy', 'dmy', 'ymd'].includes(stored) ? stored : DEFAULT_DATE_FORMAT;
}

function formatDateParts(date, useUtc = false) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = useUtc ? d.getUTCFullYear() : d.getFullYear();
  const month = String((useUtc ? d.getUTCMonth() : d.getMonth()) + 1).padStart(2, '0');
  const day = String(useUtc ? d.getUTCDate() : d.getDate()).padStart(2, '0');
  switch (getDateFormatPreference()) {
    case 'dmy': return `${day}/${month}/${year}`;
    case 'ymd': return `${year}-${month}-${day}`;
    default: return `${month}/${day}/${year}`;
  }
}

/** Aktuelle Locale abfragen */
export function getLocale() {
  return currentLocale;
}

/** Liste der unterstützten Locales */
export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

/** Datum locale-aware formatieren */
export function formatDate(date) {
  if (date == null) return '';
  if (isDateOnlyString(date)) {
    return formatDateParts(new Date(`${date}T00:00:00Z`), true);
  }
  return formatDateParts(date);
}

/** Uhrzeit locale-aware formatieren */
export function formatTime(date) {
  if (date == null) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(currentLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}
