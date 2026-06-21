import { gameConfig } from './config';
import type { PlatformInterface } from './platforms';

export function platformCenterX(platform: PlatformInterface): number {
  return platform.x + platform.width / 2;
}

export function applyPlatformMotionX(platform: PlatformInterface, time: number): number {
  if (!platform.motion) return platform.x;

  const centerX = platform.motion.anchorX
    + Math.sin(time * platform.motion.speed + platform.motion.phase) * platform.motion.amplitude;
  platform.x = centerX - platform.width / 2;
  return platform.x;
}

export function maybeAssignPlatformMotion(platform: PlatformInterface): void {
  if (platform.motion) return;

  const config = gameConfig.movingPlatforms;
  if (Math.random() > config.spawnChance) return;

  const centerX = platformCenterX(platform);
  const maxAmplitude = Math.min(
    centerX - platform.width / 2 - config.boundsMinX,
    config.boundsMaxX - (centerX + platform.width / 2),
  );

  if (maxAmplitude < config.minAmplitude) return;

  const amplitude = Math.min(
    maxAmplitude,
    config.minAmplitude + Math.random() * (config.maxAmplitude - config.minAmplitude),
  );

  platform.motion = {
    anchorX: centerX,
    amplitude,
    speed: config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed),
    phase: Math.random() * Math.PI * 2,
  };
}

export function updateMovingPlatforms(
  platformList: PlatformInterface[],
  time: number,
): Map<number, number> {
  if (!gameConfig.platformGenerator.movingPlatformsEnabled) {
    return new Map();
  }

  const deltas = new Map<number, number>();

  for (const platform of platformList) {
    if (!platform.motion || platform.id === undefined) continue;

    const oldX = platform.x;
    applyPlatformMotionX(platform, time);
    const deltaX = platform.x - oldX;

    if (deltaX !== 0) {
      deltas.set(platform.id, deltaX);
    }
  }

  return deltas;
}
