import './debugPanel.css';
import {
  dayNightPhaseLabel,
  formatDayNightHour,
  saveStoredDayHour,
} from './dayNight';
import {
  getLocale,
  onLocaleChange,
  setLocale,
  t,
} from './i18n';
import {
  isUserMusicEnabled,
  setUserMusicEnabled,
  unlockAudioPlayback,
} from './audioSettings';
import { isLavaRiseEnabled, setLavaRiseEnabled } from './lava';
import {
  isRainEnabled,
  isRainWeatherAutomatic,
  setRainForced,
  setRainWeatherAutomatic,
  tryUnlockRainSound,
} from './rain';

export interface DebugPanelContextInterface {
  getDayNightHour: () => number;
  setDayNightHour: (hour: number) => void;
  getDayNightManual: () => boolean;
  setDayNightManual: (manual: boolean) => void;
  refreshDayNight: () => void;
}

export interface DebugPanelInterface {
  updateDayNightDisplay: (hour: number, manual: boolean) => void;
}

export function initDebugPanel(context: DebugPanelContextInterface): DebugPanelInterface {
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'debug-toggle';
  toggleBtn.type = 'button';
  toggleBtn.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.hidden = true;

  const title = document.createElement('div');
  title.className = 'debug-panel__title';
  panel.appendChild(title);

  const localeRow = createRow();
  const localeLabel = localeRow.label;
  const localeEnBtn = createSmallButton('EN');
  const localeRuBtn = createSmallButton('RU');
  localeEnBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    setLocale('en');
  });
  localeRuBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    setLocale('ru');
  });
  localeRow.controls.appendChild(localeEnBtn);
  localeRow.controls.appendChild(localeRuBtn);
  panel.appendChild(localeRow.row);

  const musicRow = createRow();
  const musicLabel = musicRow.label;
  const musicBtn = createToggleButton();
  musicBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const next = !isUserMusicEnabled();
    setUserMusicEnabled(next);
    refreshMusicButton();
    if (next) unlockAudioPlayback();
  });
  musicRow.controls.appendChild(musicBtn);
  panel.appendChild(musicRow.row);

  const rainRow = createRow();
  const rainLabel = rainRow.label;
  const rainBtn = createToggleButton();
  const rainAutoBtn = createSmallButton('');
  rainBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    setRainWeatherAutomatic(false);
    setRainForced(!isRainEnabled());
    tryUnlockRainSound();
    refreshRainButtons();
  });
  rainAutoBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    setRainWeatherAutomatic(true);
    refreshRainButtons();
  });
  rainRow.controls.appendChild(rainBtn);
  rainRow.controls.appendChild(rainAutoBtn);
  panel.appendChild(rainRow.row);

  const timeRow = createRow();
  const timeLabel = timeRow.label;
  const timeValue = document.createElement('span');
  timeValue.className = 'debug-panel__value';
  const timeSlider = document.createElement('input');
  timeSlider.className = 'debug-panel__slider';
  timeSlider.type = 'range';
  timeSlider.min = '0';
  timeSlider.max = '24';
  timeSlider.step = '0.05';
  const timeAutoBtn = createSmallButton('');
  timeSlider.addEventListener('input', () => {
    context.setDayNightManual(true);
    context.setDayNightHour(Number(timeSlider.value));
    saveStoredDayHour(context.getDayNightHour());
    context.refreshDayNight();
    refreshTimeDisplay();
  });
  timeAutoBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    context.setDayNightManual(false);
    context.refreshDayNight();
    refreshTimeDisplay();
  });
  timeRow.controls.appendChild(timeValue);
  timeRow.controls.appendChild(timeSlider);
  timeRow.controls.appendChild(timeAutoBtn);
  panel.appendChild(timeRow.row);

  const lavaRow = createRow();
  const lavaLabel = lavaRow.label;
  const lavaBtn = createToggleButton();
  lavaBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    setLavaRiseEnabled(!isLavaRiseEnabled());
    refreshLavaButton();
  });
  lavaRow.controls.appendChild(lavaBtn);
  panel.appendChild(lavaRow.row);

  toggleBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    toggleBtn.setAttribute('aria-expanded', String(open));
  });

  document.body.appendChild(toggleBtn);
  document.body.appendChild(panel);

  function refreshLocaleButtons(): void {
    const locale = getLocale();
    localeEnBtn.setAttribute('aria-pressed', String(locale === 'en'));
    localeRuBtn.setAttribute('aria-pressed', String(locale === 'ru'));
  }

  function refreshMusicButton(): void {
    const enabled = isUserMusicEnabled();
    musicBtn.setAttribute('aria-pressed', String(enabled));
    musicBtn.textContent = enabled ? t('debugMusicOn') : t('debugMusicOff');
  }

  function refreshRainButtons(): void {
    const automatic = isRainWeatherAutomatic();
    const active = isRainEnabled();
    rainBtn.setAttribute('aria-pressed', String(active));
    rainBtn.textContent = active ? t('debugRainOn') : t('debugRainOff');
    rainAutoBtn.textContent = t('debugRainAuto');
    rainAutoBtn.setAttribute('aria-pressed', String(automatic));
  }

  function refreshLavaButton(): void {
    const enabled = isLavaRiseEnabled();
    lavaBtn.setAttribute('aria-pressed', String(enabled));
    lavaBtn.textContent = enabled ? t('debugLavaOn') : t('debugLavaOff');
  }

  function refreshTimeDisplay(hour = context.getDayNightHour(), manual = context.getDayNightManual()): void {
    if (!manual) {
      timeSlider.value = String(hour);
    }
    timeValue.textContent = `${formatDayNightHour(hour)} ${dayNightPhaseLabel(hour)}`;
    timeAutoBtn.textContent = t('debugTimeAuto');
    timeAutoBtn.setAttribute('aria-pressed', String(!manual));
  }

  function refreshStaticLabels(): void {
    toggleBtn.textContent = t('debugToggle');
    title.textContent = t('debugTitle');
    localeLabel.textContent = t('debugLocale');
    musicLabel.textContent = t('debugMusic');
    rainLabel.textContent = t('debugRain');
    timeLabel.textContent = t('debugTime');
    lavaLabel.textContent = t('debugLava');
    localeEnBtn.textContent = 'EN';
    localeRuBtn.textContent = 'RU';
    refreshLocaleButtons();
    refreshMusicButton();
    refreshRainButtons();
    refreshLavaButton();
    refreshTimeDisplay();
  }

  refreshStaticLabels();
  onLocaleChange(refreshStaticLabels);

  return {
    updateDayNightDisplay: (hour, manual) => {
      refreshTimeDisplay(hour, manual);
      if (!isRainWeatherAutomatic()) {
        refreshRainButtons();
      }
    },
  };
}

function createRow(): {
  row: HTMLDivElement;
  label: HTMLSpanElement;
  controls: HTMLDivElement;
} {
  const row = document.createElement('div');
  row.className = 'debug-panel__row';

  const labelEl = document.createElement('span');
  labelEl.className = 'debug-panel__label';

  const controls = document.createElement('div');
  controls.className = 'debug-panel__controls';

  row.appendChild(labelEl);
  row.appendChild(controls);

  return { row, label: labelEl, controls };
}

function createToggleButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'debug-panel__btn';
  button.setAttribute('aria-pressed', 'false');
  return button;
}

function createSmallButton(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'debug-panel__btn debug-panel__btn--small';
  button.textContent = label;
  return button;
}
