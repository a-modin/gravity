import { gameConfig } from './config';
import { startPlatform, type PlatformInterface } from './platforms';

export interface ObstacleInterface {
  id: number;
  x: number;
  y: number;
  size: number;
  platformY: number;
  platformId?: number;
}

let obstacles: ObstacleInterface[] = [];
let nextId = 0;

function obstacleConfig() {
  return gameConfig.obstacles;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function obstacleSize(): number {
  return gameConfig.ballRadius * 2 * obstacleConfig().sizeScale;
}

function randomOffset(platformWidth: number): number {
  const spread = Math.min(platformWidth * 0.15, obstacleConfig().maxCenterOffset);
  return (Math.random() * 2 - 1) * spread;
}

function pickPyramidLayers(): number[] {
  const variants = obstacleConfig().pyramidVariants;
  return variants[Math.floor(Math.random() * variants.length)];
}

function pyramidFitsPlatform(platform: PlatformInterface, size: number, layers: number[]): boolean {
  const maxRow = Math.max(...layers);
  const half = size / 2;
  const inset = half + obstacleConfig().platformEdgeInset;
  return platform.width >= maxRow * size + inset * 2;
}

function addObstacle(
  x: number,
  y: number,
  size: number,
  platformY: number,
  platformId?: number,
): void {
  obstacles.push({
    id: nextId++,
    x,
    y,
    size,
    platformY,
    platformId,
  });
}

function spawnObstaclePyramid(platform: PlatformInterface, centerX: number): void {
  const size = obstacleSize();
  const half = size / 2;
  const layers = pickPyramidLayers();

  if (!pyramidFitsPlatform(platform, size, layers)) return;

  for (let layer = 0; layer < layers.length; layer++) {
    const count = layers[layer];
    const layerY = platform.y - half - layer * size;
    const rowWidth = (count - 1) * size;
    const startX = centerX - rowWidth / 2;

    for (let index = 0; index < count; index++) {
      const x = startX + index * size;
      const inset = half + obstacleConfig().platformEdgeInset;

      if (x - half < platform.x + inset || x + half > platform.x + platform.width - inset) {
        continue;
      }

      addObstacle(x, layerY, size, platform.y, platform.id);
    }
  }
}

export function trySpawnObstacleForPlatform(platform: PlatformInterface): void {
  if (!obstacleConfig().enabled) return;
  if (platform === startPlatform) return;
  if (Math.random() > obstacleConfig().spawnChance) return;

  const size = obstacleSize();
  const half = size / 2;
  const inset = half + obstacleConfig().platformEdgeInset;
  const minCenterX = platform.x + inset;
  const maxCenterX = platform.x + platform.width - inset;
  if (maxCenterX <= minCenterX) return;

  const centerX = clamp(
    platform.x + platform.width / 2 + randomOffset(platform.width),
    minCenterX,
    maxCenterX,
  );

  spawnObstaclePyramid(platform, centerX);
}

export function spawnObstaclesForPlatforms(platformList: PlatformInterface[]): void {
  for (const platform of platformList) {
    trySpawnObstacleForPlatform(platform);
  }
}

export function getObstacles(): ObstacleInterface[] {
  return obstacles;
}

export function resetObstacles(): void {
  obstacles = [];
  nextId = 0;
}

export function replaceObstacles(list: ObstacleInterface[], nextObstacleId: number): void {
  obstacles = list.map((obstacle) => ({ ...obstacle }));
  nextId = nextObstacleId;
}

export function getNextObstacleId(): number {
  return nextId;
}

export function removeObstaclesBelow(cutoffY: number): boolean {
  const next = obstacles.filter((obstacle) => obstacle.platformY <= cutoffY);
  const changed = next.length !== obstacles.length;
  obstacles = next;
  return changed;
}

export function removeObstacleIds(ids: number[]): boolean {
  if (ids.length === 0) return false;
  const remove = new Set(ids);
  const next = obstacles.filter((obstacle) => !remove.has(obstacle.id));
  const changed = next.length !== obstacles.length;
  obstacles = next;
  return changed;
}

export function translateObstaclesOnPlatforms(deltas: Map<number, number>): void {
  if (deltas.size === 0) return;

  for (const obstacle of obstacles) {
    if (obstacle.platformId === undefined) continue;
    const deltaX = deltas.get(obstacle.platformId);
    if (deltaX === undefined || deltaX === 0) continue;
    obstacle.x += deltaX;
  }
}

export function getObstacleSize(): number {
  return obstacleSize();
}
