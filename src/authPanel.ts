import { authenticateWithCrazyGamesToken } from './api/auth';
import { isAuthenticated } from './api/session';
import {
  addCrazyGamesAuthListener,
  getCrazyGamesUser,
  getCrazyGamesUserToken,
  initCrazyGamesSdk,
  isCrazyGamesAuthSupported,
  isCrazyGamesHostedGame,
  isCrazyGamesSdkReady,
  showCrazyGamesAuthPrompt,
} from './crazyGames/crazyGamesSdk';
import { requestGameplaySessionSync } from './gameplaySession';
import { onLocaleChange, t } from './i18n';

let authOverlayEl: HTMLDivElement | null = null;
let authErrorEl: HTMLParagraphElement | null = null;
let authSignInBtn: HTMLButtonElement | null = null;
let authContinueBtn: HTMLButtonElement | null = null;

let uiBound = false;
let authListenerBound = false;
let pendingResolve: (() => void) | null = null;
let authFlowCompleted = false;
let authInitInFlight: Promise<void> | null = null;

function bindElements(): void {
  authOverlayEl = document.getElementById('auth-overlay') as HTMLDivElement | null;
  authErrorEl = document.getElementById('auth-error') as HTMLParagraphElement | null;
  authSignInBtn = document.getElementById('auth-sign-in') as HTMLButtonElement | null;
  authContinueBtn = document.getElementById('auth-continue') as HTMLButtonElement | null;
}

function bindUiOnce(): void {
  if (uiBound) return;
  uiBound = true;
  bindElements();
  applyStaticTexts();
  onLocaleChange(applyStaticTexts);

  authSignInBtn?.addEventListener('click', () => {
    void handleAuthSignIn();
  });

  authContinueBtn?.addEventListener('click', () => {
    handleAuthContinue();
  });
}

function setAuthError(message: string): void {
  if (!authErrorEl) return;
  authErrorEl.textContent = message;
  authErrorEl.hidden = message.length === 0;
}

function updateAuthContinueVisibility(): void {
  if (!authContinueBtn) return;
  authContinueBtn.hidden = isCrazyGamesHostedGame();
}

function openAuthOverlay(): void {
  if (!authOverlayEl) return;
  updateAuthContinueVisibility();
  authOverlayEl.hidden = false;
  setAuthError('');
  requestGameplaySessionSync();
}

function closeAuthOverlay(): void {
  if (!authOverlayEl) return;
  authOverlayEl.hidden = true;
  setAuthError('');
  requestGameplaySessionSync();
}

function finishAuthFlow(): void {
  if (authFlowCompleted) return;
  authFlowCompleted = true;
  closeAuthOverlay();
  pendingResolve?.();
  pendingResolve = null;
}

function waitForAuthDecision(): Promise<void> {
  return new Promise((resolve) => {
    pendingResolve = resolve;
    openAuthOverlay();
  });
}

async function completeBackendAuth(): Promise<void> {
  const token = await getCrazyGamesUserToken();
  await authenticateWithCrazyGamesToken(token);
}

async function tryAuthenticateFromSdk(): Promise<boolean> {
  try {
    const user = await getCrazyGamesUser();
    if (!user) return false;

    await completeBackendAuth();
    return true;
  } catch (error) {
    console.warn('CrazyGames auto auth failed', error);
    return false;
  }
}

async function handleAuthSignIn(): Promise<void> {
  if (!authSignInBtn || !authContinueBtn) return;

  authSignInBtn.disabled = true;
  authContinueBtn.disabled = true;
  setAuthError('');

  try {
    await showCrazyGamesAuthPrompt();
    await completeBackendAuth();
    finishAuthFlow();
  } catch (error) {
    const message = error instanceof Error ? error.message : t('authErrorGeneric');
    if (!message.includes('userCancelled')) {
      setAuthError(message);
    }
  } finally {
    authSignInBtn.disabled = false;
    authContinueBtn.disabled = false;
  }
}

function handleAuthContinue(): void {
  finishAuthFlow();
}

function applyStaticTexts(): void {
  const authTitle = document.getElementById('auth-title');
  const authHint = document.getElementById('auth-hint');

  if (authTitle) authTitle.textContent = t('authTitle');
  if (authHint) authHint.textContent = t('authHint');
  if (authSignInBtn) authSignInBtn.textContent = t('authSignIn');
  if (authContinueBtn) authContinueBtn.textContent = t('authContinue');
  updateAuthContinueVisibility();
}

export function isAuthOverlayOpen(): boolean {
  return authOverlayEl !== null && !authOverlayEl.hidden;
}

export function isAuthFlowCompleted(): boolean {
  return authFlowCompleted;
}

async function runAuthPanel(): Promise<void> {
  bindUiOnce();

  const sdkLoaded = await initCrazyGamesSdk();
  if (!sdkLoaded || !isCrazyGamesSdkReady()) {
    return;
  }

  if (!(await isCrazyGamesAuthSupported())) {
    authFlowCompleted = true;
    return;
  }

  if (!authListenerBound) {
    authListenerBound = true;
    addCrazyGamesAuthListener(() => {
      void tryAuthenticateFromSdk().then((authed) => {
        if (authed) finishAuthFlow();
      });
    });
  }

  const authed = await tryAuthenticateFromSdk();
  if (authed) {
    finishAuthFlow();
    return;
  }

  if (authFlowCompleted || isAuthenticated()) return;

  await waitForAuthDecision();
}

export async function initAuthPanel(): Promise<void> {
  if (authFlowCompleted || isAuthenticated()) return;
  if (authInitInFlight) {
    await authInitInFlight;
    return;
  }

  authInitInFlight = runAuthPanel();
  try {
    await authInitInFlight;
  } finally {
    authInitInFlight = null;
  }
}

export async function ensurePlayerAuthenticated(): Promise<boolean> {
  if (isAuthenticated()) return true;
  if (authFlowCompleted) return false;

  await initAuthPanel();
  return isAuthenticated();
}

let authRetryTimer = 0;

export function tickAuthPanel(frameDt: number, retryIntervalS = 2): void {
  if (isAuthenticated() || authFlowCompleted || isAuthOverlayOpen()) return;

  authRetryTimer += frameDt;
  if (authRetryTimer < retryIntervalS) return;

  authRetryTimer = 0;
  void initAuthPanel();
}
