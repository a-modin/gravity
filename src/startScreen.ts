import { initCrazyGamesSdk } from './crazyGames/crazyGamesSdk';
import {
  notifyLoadingPhaseBegin,
  notifyLoadingPhaseComplete,
  requestGameplaySessionSync,
} from './gameplaySession';
import { onLocaleChange, t } from './i18n';
import { preloadBackgroundMusic } from './music';
import { hasPendingInitialPlatformBands } from './platformGenerator';
import { preloadGameSounds } from './sounds';

type StartScreenPhaseEnum = 'loading' | 'ready' | 'hidden';

let overlayEl: HTMLDivElement | null = null;
let loadingEl: HTMLParagraphElement | null = null;
let startBtn: HTMLButtonElement | null = null;
let titleEl: HTMLHeadingElement | null = null;

let phase: StartScreenPhaseEnum = 'loading';
let soundsReady = false;
let onStartCallback: (() => void) | null = null;

function bindElements(): void {
  overlayEl = document.getElementById('start-overlay') as HTMLDivElement | null;
  loadingEl = document.getElementById('start-loading') as HTMLParagraphElement | null;
  startBtn = document.getElementById('start-play') as HTMLButtonElement | null;
  titleEl = document.getElementById('start-title') as HTMLHeadingElement | null;
}

function applyStaticTexts(): void {
  if (titleEl) titleEl.textContent = t('appTitle');
  if (loadingEl && phase === 'loading') loadingEl.textContent = t('startLoading');
  if (startBtn) startBtn.textContent = t('startPlay');
}

function showLoadingState(): void {
  if (loadingEl) {
    loadingEl.hidden = false;
    loadingEl.textContent = t('startLoading');
  }
  if (startBtn) startBtn.hidden = true;
}

function showReadyState(): void {
  if (loadingEl) loadingEl.hidden = true;
  if (startBtn) startBtn.hidden = false;
}

function hideOverlay(): void {
  if (!overlayEl) return;
  overlayEl.hidden = true;
}

function tryAdvanceToReady(): void {
  if (phase !== 'loading') return;
  if (!soundsReady || hasPendingInitialPlatformBands()) return;

  phase = 'ready';
  showReadyState();
  notifyLoadingPhaseComplete();
}

function handleStart(): void {
  if (phase !== 'ready' || !startBtn) return;

  phase = 'hidden';
  hideOverlay();
  onStartCallback?.();
  requestGameplaySessionSync();
}

export function isGameStarted(): boolean {
  return phase === 'hidden';
}

export function isStartScreenVisible(): boolean {
  return phase !== 'hidden';
}

export function tickStartScreenLoad(): void {
  tryAdvanceToReady();
}

export function initStartScreen(onStart: () => void): void {
  onStartCallback = onStart;
  bindElements();
  applyStaticTexts();
  onLocaleChange(applyStaticTexts);

  startBtn?.addEventListener('click', () => {
    handleStart();
  });

  showLoadingState();
  preloadBackgroundMusic();
  notifyLoadingPhaseBegin();
  void initCrazyGamesSdk();

  void preloadGameSounds()
    .then(() => {
      soundsReady = true;
      tryAdvanceToReady();
    })
    .catch(() => {
      soundsReady = true;
      tryAdvanceToReady();
    });
}
