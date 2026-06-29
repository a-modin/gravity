import {
  initCrazyGamesAudioSettings as bindCrazyGamesAudioSettings,
} from './crazyGames/crazyGamesSdk';
import { pauseMusicPlayback, syncMusicPlayback, unlockMusicPlayback } from './music';
import { pauseRainSoundPlayback } from './rainSound';
import { resumeAudioContext, stopSlingPullSound, suspendAudioContext } from './sounds';

const MUSIC_STORAGE_KEY = 'gravity-music-enabled';

type MusicChangeListener = () => void;

let userMusicEnabled = readUserMusicEnabled();
let sdkMuteAudio = false;
let sdkAudioBound = false;
const listeners = new Set<MusicChangeListener>();

function readUserMusicEnabled(): boolean {
  try {
    const stored = localStorage.getItem(MUSIC_STORAGE_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function isUserMusicEnabled(): boolean {
  return userMusicEnabled;
}

export function isSdkMuteAudio(): boolean {
  return sdkMuteAudio;
}

export function isMusicAudible(): boolean {
  return userMusicEnabled && !sdkMuteAudio;
}

export function isGameAudioEnabled(): boolean {
  return !sdkMuteAudio;
}

export function setUserMusicEnabled(enabled: boolean): void {
  if (userMusicEnabled === enabled) return;

  userMusicEnabled = enabled;
  try {
    localStorage.setItem(MUSIC_STORAGE_KEY, String(enabled));
  } catch {
    // ignore storage errors
  }

  applyAudioState();
}

export function setSdkMuteAudio(muted: boolean): void {
  if (sdkMuteAudio === muted) return;
  sdkMuteAudio = muted;
  applyAudioState();
}

export function applyAudioState(): void {
  syncMusicPlayback();

  if (isGameAudioEnabled()) {
    resumeAudioContext();
  } else {
    stopSlingPullSound();
    pauseMusicPlayback();
    pauseRainSoundPlayback();
    suspendAudioContext();
  }

  notifyListeners();
}

export function onMusicEnabledChange(listener: MusicChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function unlockAudioPlayback(): void {
  unlockMusicPlayback();
  applyAudioState();
}

export function initAudioSettings(): void {
  applyAudioState();
}

export function initCrazyGamesAudioSettings(): void {
  if (sdkAudioBound) return;

  bindCrazyGamesAudioSettings(setSdkMuteAudio);
  sdkAudioBound = true;
}
