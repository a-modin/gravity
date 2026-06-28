import { gameConfig } from './config';

let lavaLevelY = 0;
let wavePhase = 0;
let lavaRiseEnabled = true;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lavaRiseSpeedAtHeight(climbHeightM: number): number {
  const { minRiseSpeed, maxRiseSpeed, fullSpeedAtHeightM } = gameConfig.lava;
  if (fullSpeedAtHeightM <= 0) return maxRiseSpeed;

  const progress = clamp(climbHeightM / fullSpeedAtHeightM, 0, 1);
  return minRiseSpeed + (maxRiseSpeed - minRiseSpeed) * progress;
}

export interface LavaStateInterface {
  levelY: number;
  wavePhase: number;
}

export function getLavaState(): LavaStateInterface {
  return { levelY: lavaLevelY, wavePhase };
}

export function setLavaState(state: LavaStateInterface): void {
  lavaLevelY = state.levelY;
  wavePhase = state.wavePhase;
}

export function resetLava(visibleWorldBottomY: number): void {
  lavaLevelY = visibleWorldBottomY - gameConfig.lava.startVisibleHeight;
  wavePhase = 0;
}

export function setLavaRiseEnabled(enabled: boolean): void {
  lavaRiseEnabled = enabled;
}

export function isLavaRiseEnabled(): boolean {
  return lavaRiseEnabled;
}

export function updateLava(dt: number, climbHeightM: number): void {
  if (lavaRiseEnabled) {
    lavaLevelY -= lavaRiseSpeedAtHeight(climbHeightM) * dt;
  }
  wavePhase += gameConfig.lava.waveSpeed * dt;
}

export function getLavaLevelY(): number {
  return lavaLevelY;
}

export function lavaSurfaceYAt(worldX: number): number {
  const { waveAmplitude, waveFrequency } = gameConfig.lava;
  return lavaLevelY + Math.sin(worldX * waveFrequency + wavePhase) * waveAmplitude;
}

function cubeCorners(
  centerX: number,
  centerY: number,
  halfSize: number,
  angle: number,
): Array<{ x: number; y: number }> {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const localCorners = [
    { x: -halfSize, y: -halfSize },
    { x: halfSize, y: -halfSize },
    { x: halfSize, y: halfSize },
    { x: -halfSize, y: halfSize },
  ];

  return localCorners.map(({ x, y }) => ({
    x: centerX + x * cos - y * sin,
    y: centerY + x * sin + y * cos,
  }));
}

export function isPlayerInLava(
  centerX: number,
  centerY: number,
  halfSize: number,
  angle: number,
): boolean {
  return cubeCorners(centerX, centerY, halfSize, angle).some(({ x, y }) => (
    y >= lavaSurfaceYAt(x)
  ));
}

export function isCubeFullySubmerged(
  centerX: number,
  centerY: number,
  halfSize: number,
  angle: number,
): boolean {
  return cubeCorners(centerX, centerY, halfSize, angle).every(({ x, y }) => (
    y > lavaSurfaceYAt(x)
  ));
}
