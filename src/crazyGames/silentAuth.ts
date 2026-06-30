import { authenticateWithCrazyGamesToken } from '../api/auth';
import { isAuthenticated } from '../api/session';
import {
  addCrazyGamesAuthListener,
  getCrazyGamesUser,
  getCrazyGamesUserToken,
  initCrazyGamesSdk,
  isCrazyGamesAuthSupported,
  isCrazyGamesSdkReady,
} from './crazyGamesSdk';

let initialized = false;

async function trySilentAuth(): Promise<void> {
  if (isAuthenticated()) return;

  try {
    const user = await getCrazyGamesUser();
    if (!user) return;

    await authenticateWithCrazyGamesToken(await getCrazyGamesUserToken());
  } catch (error) {
    console.warn('Silent CrazyGames auth failed', error);
  }
}

export async function initSilentAuth(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const sdkLoaded = await initCrazyGamesSdk();
  if (!sdkLoaded || !isCrazyGamesSdkReady()) return;
  if (!(await isCrazyGamesAuthSupported())) return;

  addCrazyGamesAuthListener(() => {
    void trySilentAuth();
  });

  await trySilentAuth();
}
