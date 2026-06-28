import { enLocale } from './locales/en';
import { ruLocale } from './locales/ru';
import type { LocaleStringsInterface } from './locales/en';

export type { LocaleStringsInterface } from './locales/en';

export type LocaleIdEnum = 'en' | 'ru';

const LOCALE_STORAGE_KEY = 'gravity-locale';

const LOCALES: Record<LocaleIdEnum, LocaleStringsInterface> = {
  en: enLocale,
  ru: ruLocale,
};

let activeLocale: LocaleIdEnum = detectInitialLocale();
const localeListeners = new Set<() => void>();

function detectBrowserLocale(): LocaleIdEnum {
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const language of languages) {
    if (language.toLowerCase().startsWith('ru')) return 'ru';
  }

  return 'en';
}

function detectInitialLocale(): LocaleIdEnum {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'ru') return stored;
  } catch {
    // ignore storage errors
  }

  return detectBrowserLocale();
}

export function getLocale(): LocaleIdEnum {
  return activeLocale;
}

export function getLocaleStrings(): LocaleStringsInterface {
  return LOCALES[activeLocale];
}

export function t<K extends keyof LocaleStringsInterface>(key: K): LocaleStringsInterface[K] {
  return LOCALES[activeLocale][key];
}

export function formatHeightMeters(meters: number): string {
  if (activeLocale === 'ru') return `${meters} м`;
  return `${meters} m`;
}

export function formatDayNightPhaseLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5) return t('dayPhaseNight');
  if (h < 7) return t('dayPhaseDawn');
  if (h < 11) return t('dayPhaseMorning');
  if (h < 16) return t('dayPhaseDay');
  if (h < 19) return t('dayPhaseAfternoon');
  if (h < 21) return t('dayPhaseDusk');
  return t('dayPhaseNight');
}

export function setLocale(locale: LocaleIdEnum): void {
  if (activeLocale === locale) return;
  activeLocale = locale;

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore storage errors
  }

  document.documentElement.lang = locale;
  for (const listener of localeListeners) listener();
}

export function onLocaleChange(listener: () => void): () => void {
  localeListeners.add(listener);
  return () => localeListeners.delete(listener);
}

const STATIC_TEXT_BINDINGS: Array<{ id: string; key: keyof LocaleStringsInterface }> = [
  { id: 'pause-title', key: 'pauseTitle' },
  { id: 'pause-resume', key: 'pauseResume' },
  { id: 'pause-hint', key: 'pauseHint' },
  { id: 'game-over-title', key: 'gameOverTitle' },
  { id: 'game-over-label', key: 'gameOverDistance' },
  { id: 'game-over-rewind', key: 'gameOverRewind' },
  { id: 'game-over-restart', key: 'gameOverRestart' },
];

export function applyStaticTexts(): void {
  document.title = t('appTitle');
  document.documentElement.lang = activeLocale;

  for (const { id, key } of STATIC_TEXT_BINDINGS) {
    const element = document.getElementById(id);
    if (!element) continue;
    element.textContent = String(t(key));
  }
}

export function initI18n(): void {
  applyStaticTexts();
  onLocaleChange(applyStaticTexts);
}

if (typeof document !== 'undefined') {
  initI18n();
}
