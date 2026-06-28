import { gameConfig } from './config';
import { maybeAssignPlatformMotion, platformVerticalOverlap, sweptHorizontalExtents } from './platformMotion';
import { simulateTrajectory, type Vec2Interface } from './physics';
import { removeObstaclesBelow, resetObstacles, spawnObstaclesForPlatforms } from './obstacles';
import { rollPlatformTypeId } from './platformTypes';
import { startPlatform, type PlatformInterface } from './platforms';

let platforms: PlatformInterface[] = [startPlatform];
let highestBallY = 0;
let nextPlatformId = 1;
let reachableFromStart = new Set<PlatformInterface>([startPlatform]);

function generatorConfig() {
  return gameConfig.platformGenerator;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizePlatformHeight(height: number): number {
  const config = generatorConfig();
  const tile = gameConfig.pixelArt.tileSize;
  const minHeight = config.minHeight;
  const snapped = Math.ceil(Math.max(height, minHeight) / tile) * tile;
  return clamp(snapped, minHeight, config.maxHeight);
}

function platformCenterX(platform: PlatformInterface): number {
  return platform.x + platform.width / 2;
}

function verticalAirGap(from: PlatformInterface, to: PlatformInterface): number {
  return from.y - (to.y + to.height);
}

function verticalJumpGap(from: PlatformInterface, to: PlatformInterface): number {
  return from.y - to.y;
}

function hasValidVerticalSpacing(from: PlatformInterface, to: PlatformInterface): boolean {
  const config = generatorConfig();
  const jumpGap = verticalJumpGap(from, to);
  const airGap = verticalAirGap(from, to);

  return (
    jumpGap >= config.minJumpGap
    && jumpGap <= config.maxJumpGap
    && airGap >= config.minClearance
  );
}

function launchPoints(platform: PlatformInterface): Vec2Interface[] {
  const config = generatorConfig();
  const radius = gameConfig.ballRadius;
  const y = platform.y - radius;
  const left = platform.x + radius + config.launchPointInset;
  const right = platform.x + platform.width - radius - config.launchPointInset;
  const center = platformCenterX(platform);

  if (right <= left) {
    return [{ x: center, y }];
  }

  return [
    { x: left, y },
    { x: (left + center) / 2, y },
    { x: center, y },
    { x: (center + right) / 2, y },
    { x: right, y },
  ];
}

function trajectoryLandsOnPlatform(trajectory: Vec2Interface[], platform: PlatformInterface): boolean {
  const config = generatorConfig();
  const radius = gameConfig.ballRadius;
  const surfaceY = platform.y - radius;
  const landingMinX = platform.x + radius;
  const landingMaxX = platform.x + platform.width - radius;

  for (let i = trajectory.length - 1; i >= 0; i--) {
    const point = trajectory[i];
    if (Math.abs(point.y - surfaceY) > config.landingSurfaceTolerance) continue;
    if (point.x >= landingMinX && point.x <= landingMaxX) {
      return true;
    }
  }

  return false;
}

function isReachable(
  from: PlatformInterface,
  to: PlatformInterface,
  angleSteps = generatorConfig().reachabilityAngleSteps,
): boolean {
  const config = generatorConfig();
  const launchPlatforms = [from, to];
  const maxSpeed = gameConfig.maxPull * gameConfig.launchPower;

  for (const anchor of launchPoints(from)) {
    for (let step = 0; step < angleSteps; step++) {
      const angle = (Math.PI * 2 * step) / angleSteps;

      for (const ratio of config.reachabilityPowerRatios) {
        const speed = maxSpeed * ratio;
        const velocity = {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        };
        const trajectory = simulateTrajectory(anchor, velocity, launchPlatforms);

        if (trajectoryLandsOnPlatform(trajectory, to)) {
          return true;
        }
      }
    }
  }

  return false;
}

function overlapsExisting(candidate: PlatformInterface): boolean {
  const margin = generatorConfig().overlapMargin;
  const candidateLeft = candidate.x;
  const candidateRight = candidate.x + candidate.width;

  return platforms.some((platform) => {
    if (!platformVerticalOverlap(candidate, platform, margin)) return false;

    const { left, right } = sweptHorizontalExtents(platform);
    return candidateLeft < right + margin && candidateRight > left - margin;
  });
}

function tooCloseHorizontally(
  candidate: PlatformInterface,
  others: PlatformInterface[],
): boolean {
  const minSeparation = generatorConfig().minHorizontalSeparation;

  return others.some((other) => (
    Math.abs(platformCenterX(candidate) - platformCenterX(other)) < minSeparation
  ));
}

function assignPlatformIdentity(platform: PlatformInterface): PlatformInterface {
  platform.id = nextPlatformId++;
  platform.height = normalizePlatformHeight(platform.height);
  return platform;
}

function maybeAssignPlatformType(platform: PlatformInterface): void {
  if (platform.id === startPlatform.id) return;
  platform.typeId = rollPlatformTypeId();
}

function buildCandidateAtY(
  y: number,
  centerX: number,
  width: number,
  height: number,
): PlatformInterface {
  const config = generatorConfig();

  return {
    x: clamp(centerX - width / 2, config.minX, config.maxX - width),
    y,
    width,
    height: normalizePlatformHeight(height),
  };
}

function horizontalOverlapWidth(a: PlatformInterface, b: PlatformInterface): number {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  return Math.max(0, right - left);
}

function previousBandPlatforms(bandY: number): PlatformInterface[] {
  const config = generatorConfig();
  return platforms.filter((platform) => {
    const jumpGap = platform.y - bandY;
    return jumpGap >= config.minJumpGap && jumpGap <= config.maxJumpGap;
  });
}

function isVerticallyStacked(candidate: PlatformInterface): boolean {
  const maxRatio = generatorConfig().maxVerticalOverlapRatio;

  return platforms.some((platform) => {
    if (platform.y <= candidate.y) return false;
    if (!hasValidVerticalSpacing(platform, candidate)) return false;

    const overlap = horizontalOverlapWidth(platform, candidate);
    const minWidth = Math.min(platform.width, candidate.width);
    return overlap >= minWidth * maxRatio;
  });
}

function isReachableFromPreviousBand(candidate: PlatformInterface): boolean {
  const parents = previousBandPlatforms(candidate.y);
  if (parents.length === 0) return true;
  const angleSteps = generatorConfig().placementReachabilityAngleSteps;

  return parents.some((parent) => (
    hasValidVerticalSpacing(parent, candidate)
    && isReachable(parent, candidate, angleSteps)
  ));
}

function isReachableFromStart(candidate: PlatformInterface): boolean {
  const angleSteps = generatorConfig().placementReachabilityAngleSteps;

  for (const parent of reachableFromStart) {
    if (parent.y <= candidate.y) continue;
    if (!hasValidVerticalSpacing(parent, candidate)) continue;
    if (isReachable(parent, candidate, angleSteps)) return true;
  }
  return false;
}

function registerReachablePlatforms(added: PlatformInterface[]): void {
  for (const platform of added) {
    reachableFromStart.add(platform);
  }
}

function reachablePreviousBandParents(bandY: number): PlatformInterface[] {
  return previousBandPlatforms(bandY).filter((platform) => reachableFromStart.has(platform));
}

function pickBandParent(bandY: number): PlatformInterface {
  const reachableParents = reachablePreviousBandParents(bandY);
  if (reachableParents.length > 0) {
    return reachableParents[Math.floor(Math.random() * reachableParents.length)];
  }

  const fallback = [...reachableFromStart].filter((platform) => platform.y > bandY);
  if (fallback.length > 0) {
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return platforms.reduce((top, platform) => (platform.y < top.y ? platform : top));
}

function isValidCandidate(
  candidate: PlatformInterface,
  bandCandidates: PlatformInterface[],
): boolean {
  if (overlapsExisting(candidate)) return false;
  if (tooCloseHorizontally(candidate, bandCandidates)) return false;
  if (isVerticallyStacked(candidate)) return false;
  if (!isReachableFromPreviousBand(candidate)) return false;
  if (!isReachableFromStart(candidate)) return false;
  return true;
}

function tryPlaceBranch(
  bandY: number,
  direction: number,
  bandCandidates: PlatformInterface[],
): PlatformInterface | null {
  const config = generatorConfig();
  const attempts = Math.ceil(config.placementAttempts / config.branchesPerBand);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const width = randomRange(config.minWidth, config.maxWidth);
    const height = randomRange(config.minHeight, config.maxHeight);
    const parent = pickBandParent(bandY);
    const offset = direction * randomRange(config.minHorizontalOffset, config.maxHorizontalReach);
    const candidate = buildCandidateAtY(
      bandY,
      platformCenterX(parent) + offset,
      width,
      height,
    );

    if (isValidCandidate(candidate, bandCandidates)) {
      return candidate;
    }
  }

  return null;
}

function tryPlaceRandomBranch(
  bandY: number,
  bandCandidates: PlatformInterface[],
): PlatformInterface | null {
  const config = generatorConfig();

  for (let attempt = 0; attempt < config.placementAttempts; attempt++) {
    const width = randomRange(config.minWidth, config.maxWidth);
    const height = randomRange(config.minHeight, config.maxHeight);
    const parent = pickBandParent(bandY);
    const direction = Math.random() < 0.5 ? -1 : 1;
    const offset = direction * randomRange(config.minHorizontalOffset, config.maxHorizontalReach);
    const candidate = buildCandidateAtY(
      bandY,
      platformCenterX(parent) + offset,
      width,
      height,
    );

    if (isValidCandidate(candidate, bandCandidates)) {
      return candidate;
    }
  }

  return null;
}

function createFallbackPlatform(from: PlatformInterface, bandY?: number): PlatformInterface | null {
  const config = generatorConfig();
  const angleSteps = config.placementReachabilityAngleSteps;

  for (
    let jumpGap = config.minJumpGap;
    jumpGap <= config.maxJumpGap;
    jumpGap += config.fallbackJumpGapStep
  ) {
    const y = bandY ?? from.y - jumpGap;
    for (const dx of [-config.maxHorizontalReach, -config.minHorizontalOffset, config.minHorizontalOffset, config.maxHorizontalReach]) {
      const candidate = buildCandidateAtY(
        y,
        platformCenterX(from) + dx,
        config.maxWidth,
        config.minHeight,
      );

      if (overlapsExisting(candidate)) continue;
      if (isVerticallyStacked(candidate)) continue;
      if (!isReachableFromPreviousBand(candidate)) continue;
      if (!isReachableFromStart(candidate)) continue;
      return candidate;
    }
  }

  return createEmergencyPlatform(bandY ?? from.y - config.minJumpGap, angleSteps);
}

function createEmergencyPlatform(bandY: number, angleSteps: number): PlatformInterface | null {
  const config = generatorConfig();
  const parents = reachablePreviousBandParents(bandY);
  const width = config.maxWidth;
  const height = config.minHeight;

  for (const parent of parents) {
    for (const dx of [-config.maxHorizontalReach, -config.minHorizontalOffset, 0, config.minHorizontalOffset, config.maxHorizontalReach]) {
      const candidate = buildCandidateAtY(
        bandY,
        platformCenterX(parent) + dx,
        width,
        height,
      );

      if (overlapsExisting(candidate)) continue;
      if (isVerticallyStacked(candidate)) continue;
      if (!hasValidVerticalSpacing(parent, candidate)) continue;
      if (!isReachable(parent, candidate, angleSteps)) continue;
      return candidate;
    }
  }

  return null;
}

function addBandPlatforms(bandPlatforms: PlatformInterface[]): void {
  if (bandPlatforms.length === 0) return;
  const prepared = bandPlatforms.map(assignPlatformIdentity);
  platforms.push(...prepared);

  for (const platform of prepared) {
    maybeAssignPlatformType(platform);
  }

  if (generatorConfig().movingPlatformsEnabled) {
    for (const platform of prepared) {
      maybeAssignPlatformMotion(platform, platforms);
    }
  }

  registerReachablePlatforms(prepared);
  spawnObstaclesForPlatforms(prepared);
}

function topmostPlatformY(): number {
  return Math.min(...platforms.map((platform) => platform.y));
}

function spawnBand(): boolean {
  const config = generatorConfig();
  const topY = topmostPlatformY();
  const jumpGap = randomRange(config.minJumpGap, config.maxJumpGap);
  const bandY = topY - jumpGap;
  const bandCandidates: PlatformInterface[] = [];

  for (let branch = 0; branch < config.branchesPerBand; branch++) {
    const direction = branch % 2 === 0 ? -1 : 1;
    const candidate = tryPlaceBranch(bandY, direction, bandCandidates);
    if (candidate) {
      bandCandidates.push(candidate);
    }
  }

  while (bandCandidates.length < config.branchesPerBand) {
    const candidate = tryPlaceRandomBranch(bandY, bandCandidates);
    if (!candidate) break;
    bandCandidates.push(candidate);
  }

  if (bandCandidates.length === 0) {
    const from = pickBandParent(bandY);
    const fallback = createFallbackPlatform(from, bandY);
    if (!fallback) return false;
    addBandPlatforms([fallback]);
    return true;
  }

  addBandPlatforms(bandCandidates);
  return true;
}

function removeDistantPlatforms(ballY: number): boolean {
  const cutoff = ballY + generatorConfig().cleanupBelow;
  const next = platforms.filter((platform) => platform === startPlatform || platform.y <= cutoff);
  let changed = next.length !== platforms.length;
  platforms = next;
  if (removeObstaclesBelow(cutoff)) {
    changed = true;
  }
  return changed;
}

function clonePlatform(platform: PlatformInterface): PlatformInterface {
  const copy = { ...platform };
  if (platform.motion) {
    copy.motion = { ...platform.motion };
  }
  return copy;
}

function platformKey(platform: PlatformInterface): string {
  return `${platform.id}|${platform.y}|${platform.width}|${platform.height}`;
}

export interface PlatformGeneratorSnapshotInterface {
  platforms: PlatformInterface[];
  highestBallY: number;
  reachablePlatformKeys: string[];
  nextPlatformId: number;
}

export function snapshotPlatformGenerator(): PlatformGeneratorSnapshotInterface {
  return {
    platforms: platforms.map(clonePlatform),
    highestBallY,
    reachablePlatformKeys: [...reachableFromStart].map(platformKey),
    nextPlatformId,
  };
}

export function restorePlatformGenerator(snapshot: PlatformGeneratorSnapshotInterface): void {
  platforms = snapshot.platforms.map((platform) => {
    const copy = clonePlatform(platform);
    copy.height = normalizePlatformHeight(copy.height);
    return copy;
  });
  highestBallY = snapshot.highestBallY;
  nextPlatformId = snapshot.nextPlatformId;

  const reachableKeys = new Set(snapshot.reachablePlatformKeys);
  reachableFromStart = new Set(
    platforms.filter((platform) => reachableKeys.has(platformKey(platform))),
  );
}

export function getPlatforms(): PlatformInterface[] {
  return platforms;
}

export function resetPlatformGenerator(): void {
  const config = generatorConfig();
  startPlatform.height = normalizePlatformHeight(startPlatform.height);
  platforms = [startPlatform];
  highestBallY = startPlatform.y;
  nextPlatformId = 1;
  reachableFromStart = new Set<PlatformInterface>([startPlatform]);
  resetObstacles();

  for (let i = 0; i < config.initialCount; i++) {
    spawnBand();
  }
}

export function trackPlatformGeneratorHeight(ballY: number): void {
  if (ballY < highestBallY) {
    highestBallY = ballY;
  }
}

export function updatePlatformGenerator(ballY: number): boolean {
  let changed = false;

  trackPlatformGeneratorHeight(ballY);

  const targetY = highestBallY - generatorConfig().lookAhead;
  let stallAttempts = 0;

  while (topmostPlatformY() > targetY && stallAttempts < 16) {
    const beforeTopY = topmostPlatformY();
    spawnBand();

    if (topmostPlatformY() < beforeTopY) {
      changed = true;
      stallAttempts = 0;
      continue;
    }

    const bandY = beforeTopY - generatorConfig().minJumpGap;
    const emergency = createEmergencyPlatform(bandY, generatorConfig().placementReachabilityAngleSteps);
    if (emergency) {
      addBandPlatforms([emergency]);
      changed = true;
      stallAttempts = 0;
      continue;
    }

    stallAttempts += 1;
  }

  if (removeDistantPlatforms(ballY)) {
    changed = true;
  }

  return changed;
}
