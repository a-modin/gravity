import { apiRequest } from './httpClient';
import type { LeaderboardPlayerDtoInterface } from './types';

export async function fetchLeaderboard(): Promise<LeaderboardPlayerDtoInterface[]> {
  return apiRequest<LeaderboardPlayerDtoInterface[]>('/leaderboard', {
    method: 'GET',
  });
}
