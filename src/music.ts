import musicUrl from './music/music.mp3';
import { isMusicAudible } from './audioSettings';

const MUSIC_VOLUME = 0.4;

let musicAudio: HTMLAudioElement | null = null;
let musicUnlocked = false;

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

export function syncMusicPlayback(): void {
  const audio = getMusicAudio();

  if (isMusicAudible() && musicUnlocked) {
    void audio.play().catch(() => {});
    return;
  }

  audio.pause();
}

export function pauseMusicPlayback(): void {
  getMusicAudio().pause();
}

export function unlockMusicPlayback(): void {
  musicUnlocked = true;
  syncMusicPlayback();
}

export function tryStartBackgroundMusic(): void {
  unlockMusicPlayback();
}

export function preloadBackgroundMusic(): void {
  getMusicAudio().load();
}
