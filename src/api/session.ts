import type { PlayerProfileDtoInterface } from './types';

let accessToken: string | null = null;
let player: PlayerProfileDtoInterface | null = null;

export function isAuthenticated(): boolean {
  return accessToken !== null && player !== null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getStoredPlayer(): PlayerProfileDtoInterface | null {
  return player;
}

export function setSession(nextAccessToken: string, nextPlayer: PlayerProfileDtoInterface): void {
  accessToken = nextAccessToken;
  player = { ...nextPlayer };
}

export function setStoredPlayer(nextPlayer: PlayerProfileDtoInterface): void {
  player = { ...nextPlayer };
}

export function clearSession(): void {
  accessToken = null;
  player = null;
}
