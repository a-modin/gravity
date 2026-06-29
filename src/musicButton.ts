import './musicButton.css';
import {
  isMusicAudible,
  isUserMusicEnabled,
  onMusicEnabledChange,
  setUserMusicEnabled,
  unlockAudioPlayback,
} from './audioSettings';
import { onLocaleChange, t } from './i18n';

let buttonEl: HTMLButtonElement | null = null;

function refreshButton(): void {
  if (!buttonEl) return;

  const enabled = isMusicAudible();
  buttonEl.setAttribute('aria-pressed', String(isUserMusicEnabled()));
  buttonEl.setAttribute('aria-label', enabled ? t('musicToggleOn') : t('musicToggleOff'));
  buttonEl.title = enabled ? t('musicToggleOn') : t('musicToggleOff');
  buttonEl.textContent = t('musicToggle');
  buttonEl.classList.toggle('is-muted', !isUserMusicEnabled());
  buttonEl.classList.toggle('is-sdk-muted', isUserMusicEnabled() && !enabled);
}

export function initMusicButton(): void {
  buttonEl = document.getElementById('music-toggle') as HTMLButtonElement | null;
  if (!buttonEl) return;

  buttonEl.addEventListener('click', (event) => {
    event.stopPropagation();
    const next = !isUserMusicEnabled();
    setUserMusicEnabled(next);
    if (next) {
      unlockAudioPlayback();
    }
    refreshButton();
  });

  onLocaleChange(refreshButton);
  onMusicEnabledChange(refreshButton);
  refreshButton();
}
