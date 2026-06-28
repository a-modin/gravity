import milestoneCrossUrl from './sounds/milestone-cross.mp3';
import obstacleDrop1Url from './sounds/obstacle-drop-1.mp3';
import obstacleDrop2Url from './sounds/obstacle-drop-2.mp3';
import obstacleDrop3Url from './sounds/obstacle-drop-3.mp3';
import obstacleHitUrl from './sounds/obstacle-hit.mp3';
import obstacleLavaBurnUrl from './sounds/obstacle-lava-burn.mp3';
import platformHitUrl from './sounds/platform-hit.mp3';
import playerLavaBurnUrl from './sounds/player-lava-burn.mp3';
import slingPullUrl from './sounds/sling-pull.mp3';
import slingReleaseUrl from './sounds/sling-release.mp3';

interface GameSoundConfigInterface {
  id: string;
  url: string;
  volume: number;
}

const GAME_SOUNDS: GameSoundConfigInterface[] = [
  { id: 'sling-pull', url: slingPullUrl, volume: 0.55 },
  { id: 'sling-release', url: slingReleaseUrl, volume: 0.7 },
  { id: 'platform-hit', url: platformHitUrl, volume: 0.65 },
  { id: 'obstacle-hit', url: obstacleHitUrl, volume: 0.65 },
  { id: 'obstacle-drop-1', url: obstacleDrop1Url, volume: 0.62 },
  { id: 'obstacle-drop-2', url: obstacleDrop2Url, volume: 0.62 },
  { id: 'obstacle-drop-3', url: obstacleDrop3Url, volume: 0.62 },
  { id: 'player-lava-burn', url: playerLavaBurnUrl, volume: 0.72 },
  { id: 'obstacle-lava-burn', url: obstacleLavaBurnUrl, volume: 0.65 },
  { id: 'milestone-cross', url: milestoneCrossUrl, volume: 0.7 },
];

const OBSTACLE_DROP_SOUND_IDS = ['obstacle-drop-1', 'obstacle-drop-2', 'obstacle-drop-3'] as const;

const audioContext = new AudioContext();
const buffers = new Map<string, AudioBuffer>();
let preloadPromise: Promise<void> | null = null;
let activePullSource: AudioBufferSourceNode | null = null;

function getSoundConfig(id: string): GameSoundConfigInterface | undefined {
  return GAME_SOUNDS.find((sound) => sound.id === id);
}

async function decodeSound(url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  const data = await response.arrayBuffer();
  return audioContext.decodeAudioData(data);
}

export function preloadGameSounds(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = Promise.all(
      GAME_SOUNDS.map(async (sound) => {
        const buffer = await decodeSound(sound.url);
        buffers.set(sound.id, buffer);
      }),
    ).then(() => {});
  }
  return preloadPromise;
}

export function resumeAudioContext(): void {
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
}

function playSound(id: string, volumeScale = 1): AudioBufferSourceNode | null {
  const buffer = buffers.get(id);
  const config = getSoundConfig(id);
  if (!buffer || !config) return null;

  resumeAudioContext();

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  gain.gain.value = config.volume * Math.max(0, Math.min(1, volumeScale));
  source.connect(gain);
  gain.connect(audioContext.destination);
  source.start(0);
  return source;
}

function playSoundWhenReady(
  id: string,
  onPlay?: (source: AudioBufferSourceNode) => void,
  volumeScale = 1,
): void {
  if (buffers.has(id)) {
    const source = playSound(id, volumeScale);
    if (source && onPlay) onPlay(source);
    return;
  }

  void preloadGameSounds().then(() => {
    const source = playSound(id, volumeScale);
    if (source && onPlay) onPlay(source);
  });
}

export function playSlingPullSound(): void {
  stopSlingPullSound();
  playSoundWhenReady('sling-pull', (source) => {
    activePullSource = source;
  });
}

export function stopSlingPullSound(): void {
  if (!activePullSource) return;
  try {
    activePullSource.stop();
  } catch {
    // already stopped
  }
  activePullSource = null;
}

export function playSlingReleaseSound(): void {
  stopSlingPullSound();
  playSoundWhenReady('sling-release');
}

export function playPlatformHitSound(volumeScale = 1): void {
  playSoundWhenReady('platform-hit', undefined, volumeScale);
}

export function playObstacleHitSound(volumeScale = 1): void {
  playSoundWhenReady('obstacle-hit', undefined, volumeScale);
}

export function playObstacleDropSound(volumeScale = 1): void {
  const id = OBSTACLE_DROP_SOUND_IDS[Math.floor(Math.random() * OBSTACLE_DROP_SOUND_IDS.length)];
  playSoundWhenReady(id, undefined, volumeScale);
}

export function playPlayerLavaBurnSound(): void {
  playSoundWhenReady('player-lava-burn');
}

export function playObstacleLavaBurnSound(): void {
  playSoundWhenReady('obstacle-lava-burn');
}

export function playMilestoneCrossSound(): void {
  playSoundWhenReady('milestone-cross');
}

void preloadGameSounds();
