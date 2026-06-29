import { ApiError, apiRequest } from './httpClient';
import {
  clearSession,
  getAccessToken,
  getStoredPlayer,
  isAuthenticated,
  setSession,
  setStoredPlayer,
} from './session';
import type {
  AuthDtoInterface,
  AuthResponseDtoInterface,
  PlayerProfileDtoInterface,
} from './types';

const profileListeners = new Set<(player: PlayerProfileDtoInterface | null) => void>();

export function onPlayerProfileChange(
  listener: (player: PlayerProfileDtoInterface | null) => void,
): () => void {
  profileListeners.add(listener);
  listener(getStoredPlayer());
  return () => profileListeners.delete(listener);
}

function notifyProfileListeners(nextPlayer: PlayerProfileDtoInterface | null): void {
  for (const listener of profileListeners) {
    listener(nextPlayer);
  }
}

export function updatePlayerProfile(nextPlayer: PlayerProfileDtoInterface): void {
  setStoredPlayer(nextPlayer);
  notifyProfileListeners(nextPlayer);
}

export function getPlayerProfile(): PlayerProfileDtoInterface | null {
  return getStoredPlayer();
}

export async function authenticate(payload: AuthDtoInterface): Promise<AuthResponseDtoInterface> {
  const response = await apiRequest<AuthResponseDtoInterface>('/auth', {
    method: 'POST',
    body: payload,
  });

  setSession(response.accessToken, response.player);
  notifyProfileListeners(response.player);
  return response;
}

export async function authenticateWithCrazyGamesToken(
  crazyGamesToken: string,
): Promise<PlayerProfileDtoInterface> {
  const response = await authenticate({ crazyGamesToken });
  return response.player;
}

export async function fetchCurrentPlayer(): Promise<PlayerProfileDtoInterface> {
  const nextPlayer = await apiRequest<PlayerProfileDtoInterface>('/me', {
    method: 'GET',
    auth: true,
  });

  setStoredPlayer(nextPlayer);
  notifyProfileListeners(nextPlayer);
  return nextPlayer;
}

export async function ensureAuthenticated(
  resolveCrazyGamesToken: () => Promise<string>,
): Promise<PlayerProfileDtoInterface> {
  if (isAuthenticated() && getAccessToken()) {
    try {
      return await fetchCurrentPlayer();
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
      clearSession();
    }
  }

  const crazyGamesToken = await resolveCrazyGamesToken();
  return authenticateWithCrazyGamesToken(crazyGamesToken);
}
