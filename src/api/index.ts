import { getPlayerProfile } from './auth';
import { fetchLeaderboard } from './leaderboard';
import { submitScore } from './score';
import { isAuthenticated } from './session';

export {
  flushScoreSync,
  onClimbHeightChanged,
  resetScoreSyncTimer,
  tickScoreSync,
} from './scoreSync';

export type {
  AuthDtoInterface,
  AuthResponseDtoInterface,
  LeaderboardPlayerDtoInterface,
  PlayerProfileDtoInterface,
  UpdateScoreDtoInterface,
} from './types';

export { ApiError } from './httpClient';
export {
  authenticate,
  authenticateWithCrazyGamesToken,
  ensureAuthenticated,
  fetchCurrentPlayer,
  getPlayerProfile,
  onPlayerProfileChange,
} from './auth';
export { fetchLeaderboard } from './leaderboard';
export { submitScore } from './score';
export { clearSession, getAccessToken, isAuthenticated } from './session';

export async function submitRunScore(score: number): Promise<ReturnType<typeof getPlayerProfile>> {
  if (!isAuthenticated()) return null;

  try {
    return await submitScore(score);
  } catch (error) {
    console.warn('Failed to submit score', error);
    return getPlayerProfile();
  }
}

export async function loadLeaderboard(): Promise<Awaited<ReturnType<typeof fetchLeaderboard>>> {
  return fetchLeaderboard();
}
