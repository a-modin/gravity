import { apiConfig } from '../config/api.config';
import { getPlayerProfile } from './auth';
import { submitScore } from './score';
import { isAuthenticated } from './session';

let syncTimer = 0;
let syncInFlight = false;
let lastSyncedScore = -1;
let pendingScore = 0;

function canSyncScore(score: number, force: boolean): boolean {
  if (!isAuthenticated() || score <= 0) return false;
  if (force) return score > lastSyncedScore || score > (getPlayerProfile()?.bestScore ?? 0);
  return score > (getPlayerProfile()?.bestScore ?? 0) && score > lastSyncedScore;
}

async function trySyncScore(score: number, force = false): Promise<void> {
  if (!isAuthenticated()) return;

  if (!canSyncScore(score, force)) return;

  if (syncInFlight) {
    pendingScore = Math.max(pendingScore, score);
    return;
  }

  syncInFlight = true;
  const scoreToSend = Math.max(score, pendingScore);
  pendingScore = 0;

  try {
    const player = await submitScore(scoreToSend);
    lastSyncedScore = Math.max(lastSyncedScore, player.bestScore);
  } catch (error) {
    console.warn('Failed to sync score', error);
  } finally {
    syncInFlight = false;

    if (pendingScore > lastSyncedScore) {
      const nextScore = pendingScore;
      pendingScore = 0;
      void trySyncScore(nextScore, force);
    }
  }
}

export function resetScoreSyncTimer(): void {
  syncTimer = 0;
}

export function onClimbHeightChanged(score: number): void {
  pendingScore = Math.max(pendingScore, score);
}

export function tickScoreSync(frameDt: number, score: number): void {
  if (score <= 0) return;

  pendingScore = Math.max(pendingScore, score);

  if (!isAuthenticated()) return;

  if (!canSyncScore(score, false)) {
    syncTimer = 0;
    return;
  }

  syncTimer += frameDt;
  if (syncTimer < apiConfig.scoreSyncIntervalS) return;

  syncTimer = 0;
  void trySyncScore(score);
}

export function flushScoreSync(score: number, force = false): void {
  pendingScore = Math.max(pendingScore, score);
  void trySyncScore(score, force);
}
