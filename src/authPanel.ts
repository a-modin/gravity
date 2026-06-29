import { authenticateWithCrazyGamesToken } from './api';
import {
  addCrazyGamesAuthListener,
  getCrazyGamesUser,
  getCrazyGamesUserToken,
  initCrazyGamesSdk,
  isCrazyGamesSdkReady,
  isCrazyGamesUserAccountAvailable,
  showCrazyGamesAuthPrompt,
} from './crazyGames/crazyGamesSdk';
import { requestGameplaySessionSync } from './gameplaySession';
import { onLocaleChange, t } from './i18n';

let authOverlayEl: HTMLDivElement | null = null;
let authErrorEl: HTMLParagraphElement | null = null;
let authSignInBtn: HTMLButtonElement | null = null;
let authContinueBtn: HTMLButtonElement | null = null;

let pendingResolve: (() => void) | null = null;
let authFlowCompleted = false;

function bindElements(): void {
  authOverlayEl = document.getElementById('auth-overlay') as HTMLDivElement | null;
  authErrorEl = document.getElementById('auth-error') as HTMLParagraphElement | null;
  authSignInBtn = document.getElementById('auth-sign-in') as HTMLButtonElement | null;
  authContinueBtn = document.getElementById('auth-continue') as HTMLButtonElement | null;
}

function setAuthError(message: string): void {
  if (!authErrorEl) return;
  authErrorEl.textContent = message;
  authErrorEl.hidden = message.length === 0;
}

function openAuthOverlay(): void {
  if (!authOverlayEl) return;
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
}

export function isAuthOverlayOpen(): boolean {
  return authOverlayEl !== null && !authOverlayEl.hidden;
}

export async function initAuthPanel(): Promise<void> {
  bindElements();
  applyStaticTexts();
  onLocaleChange(applyStaticTexts);

  authSignInBtn?.addEventListener('click', () => {
    void handleAuthSignIn();
  });

  authContinueBtn?.addEventListener('click', () => {
    handleAuthContinue();
  });

  const sdkLoaded = await initCrazyGamesSdk();
  if (!sdkLoaded || !isCrazyGamesSdkReady()) {
    return;
  }

  const accountAvailable = await isCrazyGamesUserAccountAvailable();
  if (!accountAvailable) {
    return;
  }

  addCrazyGamesAuthListener(() => {
    void tryAuthenticateFromSdk();
  });

  const authed = await tryAuthenticateFromSdk();
  if (authed) {
    finishAuthFlow();
    return;
  }

  await waitForAuthDecision();
}
