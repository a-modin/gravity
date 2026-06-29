import type {
  CrazyGamesEnvironmentEnum,
  CrazyGamesGlobalInterface,
  CrazyGamesUserInterface,
} from './crazyGames.types';

const SDK_SCRIPT_SRC = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

let sdkReady = false;
let sdkInitPromise: Promise<boolean> | null = null;

function getCrazyGamesGlobal(): CrazyGamesGlobalInterface | null {
  const global = window as Window & { CrazyGames?: CrazyGamesGlobalInterface };
  return global.CrazyGames ?? null;
}

function loadSdkScript(): Promise<void> {
  const existing = document.querySelector(`script[src="${SDK_SCRIPT_SRC}"]`);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load CrazyGames SDK'));
    document.head.append(script);
  });
}

export async function initCrazyGamesSdk(): Promise<boolean> {
  if (sdkInitPromise) return sdkInitPromise;

  sdkInitPromise = (async () => {
    try {
      await loadSdkScript();
      const crazyGames = getCrazyGamesGlobal();
      if (!crazyGames?.SDK) return false;

      await crazyGames.SDK.init();
      sdkReady = true;
      return true;
    } catch (error) {
      console.warn('CrazyGames SDK init failed', error);
      return false;
    }
  })();

  return sdkInitPromise;
}

export function isCrazyGamesSdkReady(): boolean {
  return sdkReady && getCrazyGamesGlobal()?.SDK !== undefined;
}

export async function getCrazyGamesEnvironment(): Promise<CrazyGamesEnvironmentEnum> {
  if (!isCrazyGamesSdkReady()) return 'disabled';

  try {
    return await getCrazyGamesGlobal()!.SDK.getEnvironment();
  } catch {
    return 'disabled';
  }
}

export async function isCrazyGamesUserAccountAvailable(): Promise<boolean> {
  if (!isCrazyGamesSdkReady()) return false;

  const environment = await getCrazyGamesEnvironment();
  if (environment === 'disabled') return false;

  return getCrazyGamesGlobal()!.SDK.user.isUserAccountAvailable;
}

export async function getCrazyGamesUser(): Promise<CrazyGamesUserInterface | null> {
  if (!isCrazyGamesSdkReady()) return null;
  return getCrazyGamesGlobal()!.SDK.user.getUser();
}

export async function getCrazyGamesUserToken(): Promise<string> {
  if (!isCrazyGamesSdkReady()) {
    throw new Error('CrazyGames SDK is not ready');
  }

  return getCrazyGamesGlobal()!.SDK.user.getUserToken();
}

export async function showCrazyGamesAuthPrompt(): Promise<CrazyGamesUserInterface> {
  if (!isCrazyGamesSdkReady()) {
    throw new Error('CrazyGames SDK is not ready');
  }

  return getCrazyGamesGlobal()!.SDK.user.showAuthPrompt();
}

export function addCrazyGamesAuthListener(
  listener: (user: CrazyGamesUserInterface) => void,
): () => void {
  if (!isCrazyGamesSdkReady()) return () => undefined;

  const userModule = getCrazyGamesGlobal()!.SDK.user;
  userModule.addAuthListener(listener);
  return () => userModule.removeAuthListener(listener);
}
