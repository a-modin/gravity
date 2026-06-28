import musicUrl from './music/music.mp3';

const MUSIC_STORAGE_KEY = 'gravity-music-enabled';
const MUSIC_VOLUME = 0.4;

let musicAudio: HTMLAudioElement | null = null;
let musicEnabled = readMusicEnabled();
let musicUnlocked = false;

function readMusicEnabled(): boolean {
  try {
    const stored = localStorage.getItem(MUSIC_STORAGE_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
}

function getMusicAudio(): HTMLAudioElement {
  if (!musicAudio) {
    musicAudio = new Audio(musicUrl);
    musicAudio.loop = true;
    musicAudio.volume = MUSIC_VOLUME;
    musicAudio.preload = 'auto';
    musicAudio.load();
  }
  return musicAudio;
}

export function isMusicEnabled(): boolean {
  return musicEnabled;
}

export function setMusicEnabled(enabled: boolean): void {
  musicEnabled = enabled;
  try {
    localStorage.setItem(MUSIC_STORAGE_KEY, String(enabled));
  } catch {
    // ignore storage errors
  }

  const audio = getMusicAudio();
  if (enabled && musicUnlocked) {
    void audio.play().catch(() => {});
    return;
  }

  audio.pause();
}

export function tryStartBackgroundMusic(): void {
  if (!musicEnabled) return;

  musicUnlocked = true;
  const audio = getMusicAudio();
  if (!audio.paused) return;

  void audio.play().catch(() => {
    musicUnlocked = false;
  });
}

export function preloadBackgroundMusic(): void {
  getMusicAudio().load();
}

preloadBackgroundMusic();
