import { gameConfig } from './config';
import type { PlatformInterface } from './platforms';

export function platformCenterX(platform: PlatformInterface): number {
  return platform.x + platform.width / 2;
}

export function platformVerticalOverlap(
  a: PlatformInterface,
  b: PlatformInterface,
  margin: number,
): boolean {
  return a.y < b.y + b.height + margin && a.y + a.height > b.y - margin;
}

export function sweptHorizontalExtents(platform: PlatformInterface): { left: number; right: number } {
  const centerX = platform.motion?.anchorX ?? platformCenterX(platform);
  const amplitude = platform.motion?.amplitude ?? 0;
  const half = platform.width / 2;

  return {
    left: centerX - half - amplitude,
    right: centerX + half + amplitude,
  };
}

export function maxSafeMotionAmplitude(
  platform: PlatformInterface,
  others: PlatformInterface[],
  margin: number,
): number {
  const config = gameConfig.movingPlatforms;
  const centerX = platformCenterX(platform);
  const half = platform.width / 2;
  const restLeft = centerX - half;
  const restRight = centerX + half;

  let maxAmp = Math.min(
    restLeft - config.boundsMinX,
    config.boundsMaxX - restRight,
  );

  for (const other of others) {
    if (other === platform) continue;
    if (other.id !== undefined && other.id === platform.id) continue;
    if (!platformVerticalOverlap(platform, other, margin)) continue;

    const { left: otherLeft, right: otherRight } = sweptHorizontalExtents(other);

    if (otherRight <= restLeft) {
      maxAmp = Math.min(maxAmp, restLeft - otherRight - margin);
    } else if (otherLeft >= restRight) {
      maxAmp = Math.min(maxAmp, otherLeft - restRight - margin);
    } else {
      return 0;
    }
  }

  return Math.max(0, maxAmp);
}

export function applyPlatformMotionX(platform: PlatformInterface, time: number): number {
  if (!platform.motion) return platform.x;

  const centerX = platform.motion.anchorX
    + Math.sin(time * platform.motion.speed + platform.motion.phase) * platform.motion.amplitude;
  platform.x = centerX - platform.width / 2;
  return platform.x;
}

export function maybeAssignPlatformMotion(
  platform: PlatformInterface,
  allPlatforms: PlatformInterface[],
): void {
  if (platform.motion) return;

  const config = gameConfig.movingPlatforms;
  if (Math.random() > config.spawnChance) return;

  const margin = gameConfig.platformGenerator.overlapMargin;
  const maxAmp = maxSafeMotionAmplitude(platform, allPlatforms, margin);
  if (maxAmp < config.minAmplitude) return;

  const amplitude = Math.min(
    maxAmp,
    config.minAmplitude + Math.random() * (config.maxAmplitude - config.minAmplitude),
  );

  platform.motion = {
    anchorX: platformCenterX(platform),
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
