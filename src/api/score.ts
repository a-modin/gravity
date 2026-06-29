import { getCrazyGamesUserToken } from '../crazyGames/crazyGamesSdk';
import { ApiError, apiRequest } from './httpClient';
import {
  authenticateWithCrazyGamesToken,
  updatePlayerProfile,
} from './auth';
import { clearSession, isAuthenticated } from './session';
import type { PlayerProfileDtoInterface } from './types';

async function postScore(score: number): Promise<PlayerProfileDtoInterface> {
  const player = await apiRequest<PlayerProfileDtoInterface>('/score', {
    method: 'POST',
    auth: true,
    body: { score: Math.max(0, Math.round(score)) },
  });

  updatePlayerProfile(player);
  return player;
}

export async function submitScore(score: number): Promise<PlayerProfileDtoInterface> {
  if (!isAuthenticated()) {
    throw new Error('Not authenticated');
  }

  try {
    return await postScore(score);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    clearSession();
    const crazyGamesToken = await getCrazyGamesUserToken();
    await authenticateWithCrazyGamesToken(crazyGamesToken);
    return postScore(score);
  }
}
