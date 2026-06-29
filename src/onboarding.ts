import handIconUrl from './assets/hand-icon.png';
import { setLavaRiseEnabled } from './lava';
import { onLocaleChange, t } from './i18n';

const ONBOARDING_STORAGE_KEY = 'gravity-onboarding-done';

let overlayEl: HTMLDivElement | null = null;
let handEl: HTMLImageElement | null = null;
let hintEl: HTMLParagraphElement | null = null;
let dismissBtn: HTMLButtonElement | null = null;

let active = false;
let onCompleteCallback: (() => void) | null = null;

function bindElements(): void {
  overlayEl = document.getElementById('onboarding-overlay') as HTMLDivElement | null;
  handEl = document.getElementById('onboarding-hand') as HTMLImageElement | null;
  if (handEl) {
    handEl.src = handIconUrl;
  }
  hintEl = document.getElementById('onboarding-hint') as HTMLParagraphElement | null;
  dismissBtn = document.getElementById('onboarding-dismiss') as HTMLButtonElement | null;
}

function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch {
    // ignore storage errors
  }
}

function applyStaticTexts(): void {
  if (hintEl) hintEl.textContent = t('onboardingHint');
  if (dismissBtn) dismissBtn.textContent = t('onboardingDismiss');
}

function showOverlay(): void {
  if (!overlayEl) return;
  overlayEl.hidden = false;
  overlayEl.classList.remove('is-gesture-hidden');
}

function hideOverlay(): void {
  if (!overlayEl) return;
  overlayEl.hidden = true;
  overlayEl.classList.remove('is-gesture-hidden');
}

function finishOnboarding(markDone: boolean): void {
  if (!active) return;

  active = false;
  if (markDone) {
    markOnboardingDone();
  }

  setLavaRiseEnabled(true);
  hideOverlay();

  const callback = onCompleteCallback;
  onCompleteCallback = null;
  callback?.();
}

export function isOnboardingActive(): boolean {
  return active;
}

export function initOnboarding(): void {
  bindElements();
  applyStaticTexts();
  onLocaleChange(applyStaticTexts);

  dismissBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    finishOnboarding(true);
  });
}

export function beginOnboardingIfNeeded(onComplete: () => void): void {
  if (isOnboardingDone()) {
    onComplete();
    return;
  }

  onCompleteCallback = onComplete;
  active = true;
  setLavaRiseEnabled(false);
  showOverlay();
}

export function onOnboardingPointerDown(): void {
  if (!active || !overlayEl) return;
  overlayEl.classList.add('is-gesture-hidden');
}

export function onOnboardingLaunch(): void {
  if (!active) return;
  finishOnboarding(true);
}
