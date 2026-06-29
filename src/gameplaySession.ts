import { isAuthOverlayOpen } from './authPanel';
import {
  notifyCrazyGamesGameplayStart,
  notifyCrazyGamesGameplayStop,
  notifyCrazyGamesLoadingStart,
  notifyCrazyGamesLoadingStop,
} from './crazyGames/crazyGamesSdk';
import { isLeaderboardOpen } from './leaderboardPanel';
import { isStartScreenVisible } from './startScreen';

let sdkGameplayActive = false;
let loadingReported = false;
let sessionStateProvider: (() => GameplaySessionStateInterface) | null = null;

export function registerGameplaySessionProvider(
  provider: () => GameplaySessionStateInterface,
): void {
  sessionStateProvider = provider;
}

export function requestGameplaySessionSync(): void {
  if (!sessionStateProvider) return;
  syncCrazyGamesGameplaySession(sessionStateProvider());
}

export function notifyLoadingPhaseBegin(): void {
  if (loadingReported) return;
  loadingReported = true;
  void notifyCrazyGamesLoadingStart();
}

export function notifyLoadingPhaseComplete(): void {
  if (!loadingReported) return;
  loadingReported = false;
  void notifyCrazyGamesLoadingStop();
}

export interface GameplaySessionStateInterface {
  gameStarted: boolean;
  paused: boolean;
  documentHidden: boolean;
  gameOver: boolean;
}

export function isGameplaySimulationPaused(state: GameplaySessionStateInterface): boolean {
  return state.paused || state.documentHidden;
}

export function shouldReportCrazyGamesGameplayActive(state: GameplaySessionStateInterface): boolean {
  if (!state.gameStarted) return false;
  if (state.paused || state.gameOver) return false;
  if (isStartScreenVisible() || isAuthOverlayOpen() || isLeaderboardOpen()) return false;
  return true;
}

export function syncCrazyGamesGameplaySession(state: GameplaySessionStateInterface): void {
  const shouldBeActive = shouldReportCrazyGamesGameplayActive(state);

  if (shouldBeActive === sdkGameplayActive) return;

  sdkGameplayActive = shouldBeActive;
  if (shouldBeActive) {
    void notifyCrazyGamesGameplayStart();
    return;
  }

  void notifyCrazyGamesGameplayStop();
}

export function resetCrazyGamesGameplaySession(): void {
  sdkGameplayActive = false;
}
