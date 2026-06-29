import { rainConfig } from './config/rain.config';
import rainUrl from './sounds/rain.mp3';

let rainAudio: HTMLAudioElement | null = null;
let rainSoundUnlocked = false;

function getRainAudio(): HTMLAudioElement {
  if (!rainAudio) {
    rainAudio = new Audio(rainUrl);
    rainAudio.loop = true;
    rainAudio.volume = rainConfig.soundVolume;
    rainAudio.preload = 'auto';
    rainAudio.load();
  }
  return rainAudio;
}

export function syncRainSound(enabled: boolean): void {
  const audio = getRainAudio();
  audio.volume = rainConfig.soundVolume;

  if (!enabled || !rainSoundUnlocked) {
    audio.pause();
    return;
  }

  if (audio.paused) {
    void audio.play().catch(() => {
      rainSoundUnlocked = false;
    });
  }
}

export function tryUnlockRainSound(enabled: boolean): void {
  rainSoundUnlocked = true;
  syncRainSound(enabled);
}

export function preloadRainSound(): void {
  getRainAudio().load();
}
