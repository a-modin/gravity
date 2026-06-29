import { isGameAudioEnabled } from './audioSettings';
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
  const shouldPlay = enabled && isGameAudioEnabled() && rainSoundUnlocked;

  if (!shouldPlay) {
    audio.pause();
    return;
  }

  if (audio.paused) {
    void audio.play().catch(() => {
      rainSoundUnlocked = false;
    });
  }
}

export function pauseRainSoundPlayback(): void {
  getRainAudio().pause();
}

export function tryUnlockRainSound(enabled: boolean): void {
  rainSoundUnlocked = true;
  syncRainSound(enabled);
}

export function preloadRainSound(): void {
  getRainAudio().load();
}
