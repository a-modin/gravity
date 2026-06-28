import Matter from 'matter-js';
import { gameConfig } from './config';
import type { ObstacleInterface } from './obstacles';
import { getObstacles, removeObstacleIds } from './obstacles';
import { isCubeFullySubmerged, isPlayerInLava } from './lava';
import { cubeLavaContactPoint } from './lavaSplash';
import { getPlatformType, platformTypeSkipsSettle } from './platformTypes';
import { playObstacleDropSound, playObstacleHitSound, playPlatformHitSound } from './sounds';
import { startPlatform, type PlatformInterface } from './platforms';

const { Bodies, Body, Engine, Events, Query, World } = Matter;

const MATTER_BASE_DELTA_MS = 1000 / 60;
const MATTER_GRAVITY_SCALE = 0.001;

export interface Vec2Interface {
  x: number;
  y: number;
}

function toMatterVelocity(velocity: Vec2Interface): Vec2Interface {
  const scale = MATTER_BASE_DELTA_MS / 1000;
  return {
    x: velocity.x * scale,
    y: velocity.y * scale,
  };
}

function matterSpeedThreshold(pxPerSecond: number): number {
  return pxPerSecond * (MATTER_BASE_DELTA_MS / 1000);
}

function toMatterAngularVelocity(radPerSecond: number): number {
  return radPerSecond * (MATTER_BASE_DELTA_MS / 1000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function playerSize(): number {
  return gameConfig.ballRadius * 2;
}

function matterEngineGravity(): Matter.Gravity {
  return {
    x: 0,
    y: gameConfig.gravity * MATTER_GRAVITY_SCALE,
    scale: MATTER_GRAVITY_SCALE,
  };
}

interface PhysicsContextInterface {
  engine: Matter.Engine;
  ball: Matter.Body;
  platforms: Matter.Body[];
  obstacles: Matter.Body[];
}

function platformBody(platform: PlatformInterface): Matter.Body {
  const type = getPlatformType(platform.typeId);

  return Bodies.rectangle(
    platform.x + platform.width / 2,
    platform.y + platform.height / 2,
    platform.width,
    platform.height,
    {
      isStatic: true,
      friction: type.friction,
      frictionStatic: type.frictionStatic,
      restitution: gameConfig.restitution,
      label: `platform-${type.id}`,
    },
  );
}

const DEFAULT_COLLISION_FILTER = {
  category: 0x0001,
  mask: 0xffffffff,
  group: 0,
};

const NO_COLLISION_FILTER = {
  category: 0x0001,
  mask: 0,
  group: 0,
};

export function disablePlayerCollisions(): void {
  gameContext.ball.collisionFilter = { ...NO_COLLISION_FILTER };
}

export function enablePlayerCollisions(): void {
  gameContext.ball.collisionFilter = { ...DEFAULT_COLLISION_FILTER };
}

function createPlayerBody(x: number, y: number): Matter.Body {
  const size = playerSize();
  return Bodies.rectangle(x, y, size, size, {
    restitution: gameConfig.restitution,
    friction: 0.35,
    frictionAir: 0.012,
    density: 0.002,
    chamfer: { radius: 1 },
    label: 'player',
  });
}

function createObstacleBody(obstacle: ObstacleInterface): Matter.Body {
  const body = Bodies.rectangle(obstacle.x, obstacle.y, obstacle.size, obstacle.size, {
    restitution: gameConfig.obstacles.restitution,
    friction: gameConfig.obstacles.friction,
    frictionAir: gameConfig.obstacles.frictionAir,
    density: gameConfig.obstacles.density,
    chamfer: { radius: 1 },
    label: 'obstacle',
    sleepThreshold: Infinity,
  });
  return body;
}

const obstacleBodyById = new Map<number, Matter.Body>();
const obstacleSizeById = new Map<number, number>();
const obstaclesInLava = new Set<number>();

const MATTER_VELOCITY_SCALE = 1000 / MATTER_BASE_DELTA_MS;

function addObstacleToWorld(
  context: PhysicsContextInterface,
  obstacle: ObstacleInterface,
): void {
  const body = createObstacleBody(obstacle);
  obstacleBodyById.set(obstacle.id, body);
  obstacleSizeById.set(obstacle.id, obstacle.size);
  context.obstacles.push(body);
  World.add(context.engine.world, body);
}

function isPlatformBody(body: Matter.Body): boolean {
  return body.label.startsWith('platform-');
}

function isObstacleBody(body: Matter.Body): boolean {
  return body.label === 'obstacle';
}

const HIT_SOUND_COOLDOWN_MS = 45;
let lastPlatformHitSoundAt = 0;
let lastObstacleHitSoundAt = 0;
let lastObstacleDropSoundAt = 0;

function getPairImpactSpeed(pair: Matter.Pair, movingBody: Matter.Body): number {
  const { bodyA, bodyB, collision } = pair;
  const other = movingBody === bodyA ? bodyB : bodyA;
  const relativeVx = movingBody.velocity.x - other.velocity.x;
  const relativeVy = movingBody.velocity.y - other.velocity.y;

  if (collision.normal) {
    const normalImpact = Math.abs(
      relativeVx * collision.normal.x + relativeVy * collision.normal.y,
    );
    return normalImpact * MATTER_VELOCITY_SCALE;
  }

  return Body.getSpeed(movingBody) * MATTER_VELOCITY_SCALE;
}

function getCollisionImpactSpeed(pair: Matter.Pair): number {
  return getPairImpactSpeed(pair, gameContext.ball);
}

function hitVolumeScale(
  impactSpeed: number,
  config: typeof gameConfig.platformHitSound,
): number | null {
  const { minImpactSpeed, maxImpactSpeed, minVolumeRatio } = config;
  if (impactSpeed < minImpactSpeed) return null;

  const linear = clamp(
    (impactSpeed - minImpactSpeed) / (maxImpactSpeed - minImpactSpeed),
    0,
    1,
  );
  return minVolumeRatio + linear * (1 - minVolumeRatio);
}

function canPlayHitSound(lastPlayedAt: number): boolean {
  return performance.now() - lastPlayedAt >= HIT_SOUND_COOLDOWN_MS;
}

function tryPlayObstacleDropSound(pair: Matter.Pair, bodyA: Matter.Body, bodyB: Matter.Body): void {
  const aObstacle = isObstacleBody(bodyA);
  const bObstacle = isObstacleBody(bodyB);
  const aPlatform = isPlatformBody(bodyA);
  const bPlatform = isPlatformBody(bodyB);

  let movingBody: Matter.Body | null = null;
  if (aObstacle && bPlatform) movingBody = bodyA;
  else if (bObstacle && aPlatform) movingBody = bodyB;
  else if (aObstacle && bObstacle) {
    movingBody = Body.getSpeed(bodyA) >= Body.getSpeed(bodyB) ? bodyA : bodyB;
  }
  if (!movingBody) return;

  const impactSpeed = getPairImpactSpeed(pair, movingBody);
  const volumeScale = hitVolumeScale(impactSpeed, gameConfig.obstacleDropSound);
  if (volumeScale === null || !canPlayHitSound(lastObstacleDropSoundAt)) return;

  lastObstacleDropSoundAt = performance.now();
  playObstacleDropSound(volumeScale);
}

function bindCollisionSounds(engine: Matter.Engine): void {
  Events.on(engine, 'collisionStart', (event) => {
    const ball = gameContext.ball;

    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;

      if (bodyA === ball || bodyB === ball) {
        const other = bodyA === ball ? bodyB : bodyA;
        const impactSpeed = getCollisionImpactSpeed(pair);

        if (isPlatformBody(other)) {
          const volumeScale = hitVolumeScale(impactSpeed, gameConfig.platformHitSound);
          if (volumeScale !== null && canPlayHitSound(lastPlatformHitSoundAt)) {
            lastPlatformHitSoundAt = performance.now();
            playPlatformHitSound(volumeScale);
          }
          continue;
        }

        if (isObstacleBody(other)) {
          const volumeScale = hitVolumeScale(impactSpeed, gameConfig.obstacleHitSound);
          if (volumeScale !== null && canPlayHitSound(lastObstacleHitSoundAt)) {
            lastObstacleHitSoundAt = performance.now();
            playObstacleHitSound(volumeScale);
          }
        }
        continue;
      }

      tryPlayObstacleDropSound(pair, bodyA, bodyB);
    }
  });
}

function createContext(
  platformList: PlatformInterface[],
  obstacleList: ObstacleInterface[] = [],
): PhysicsContextInterface {
  const engine = Engine.create({
    gravity: matterEngineGravity(),
  });

  const platformBodies = platformList.map(platformBody);
  const spawn = {
    x: startPlatform.x + startPlatform.width / 2,
    y: startPlatform.y - gameConfig.ballRadius,
  };
  const ball = createPlayerBody(spawn.x, spawn.y);

  const context: PhysicsContextInterface = {
    engine,
    ball,
    platforms: platformBodies,
    obstacles: [],
  };

  World.add(engine.world, [...platformBodies, ball]);

  for (const obstacle of obstacleList) {
    addObstacleToWorld(context, obstacle);
  }

  bindCollisionSounds(engine);

  return context;
}

let gameContext = createContext([startPlatform]);

export function getBallBody(): Matter.Body {
  return gameContext.ball;
}

export function getBallAngle(): number {
  return gameContext.ball.angle;
}

export function getBallVelocity(): Vec2Interface {
  const scale = 1000 / MATTER_BASE_DELTA_MS;
  return {
    x: gameContext.ball.velocity.x * scale,
    y: gameContext.ball.velocity.y * scale,
  };
}

export function getBallPosition(): Vec2Interface {
  const { x, y } = gameContext.ball.position;
  return { x, y };
}

export function resetBallPosition(pos: Vec2Interface): void {
  Body.setPosition(gameContext.ball, pos);
  Body.setVelocity(gameContext.ball, { x: 0, y: 0 });
  Body.setAngularVelocity(gameContext.ball, 0);
  Body.setAngle(gameContext.ball, 0);
  Body.setStatic(gameContext.ball, true);
}

export function setBallFlying(velocity: Vec2Interface): void {
  Body.setStatic(gameContext.ball, false);
  Body.setVelocity(gameContext.ball, toMatterVelocity(velocity));
  const spin = clamp(
    velocity.x * gameConfig.playerLaunchSpin,
    -gameConfig.playerMaxAngularVelocity,
    gameConfig.playerMaxAngularVelocity,
  );
  Body.setAngularVelocity(gameContext.ball, toMatterAngularVelocity(spin));
}

export function setBallAtRest(pos: Vec2Interface, angle = 0): void {
  Body.setPosition(gameContext.ball, pos);
  Body.setVelocity(gameContext.ball, { x: 0, y: 0 });
  Body.setAngularVelocity(gameContext.ball, 0);
  Body.setAngle(gameContext.ball, angle);
  Body.setStatic(gameContext.ball, true);
}

export function stepGamePhysics(dt: number): void {
  Engine.update(gameContext.engine, dt * 1000);
}

const ACTIVE_OBSTACLE_SPEED = 0.08;
const ACTIVE_OBSTACLE_SPIN = 0.02;

export function shouldStepPhysics(): boolean {
  const ball = gameContext.ball;

  if (!ball.isStatic) return true;
  if (Body.getSpeed(ball) > ACTIVE_OBSTACLE_SPEED) return true;
  if (Math.abs(Body.getAngularVelocity(ball)) > ACTIVE_OBSTACLE_SPIN) return true;

  if (obstaclesInLava.size > 0) return true;

  return gameContext.obstacles.some((body) => (
    Body.getSpeed(body) > ACTIVE_OBSTACLE_SPEED
    || Math.abs(Body.getAngularVelocity(body)) > ACTIVE_OBSTACLE_SPIN
  ));
}

export function isBallGrounded(
  body: Matter.Body = gameContext.ball,
  platformBodies: Matter.Body[] = gameContext.platforms,
): boolean {
  return Query.collides(body, [...platformBodies, ...gameContext.obstacles]).length > 0;
}

export interface ObstacleRenderStateInterface {
  id: number;
  x: number;
  y: number;
  angle: number;
  size: number;
  inLava: boolean;
}

export interface ObstacleLavaEventInterface {
  x: number;
  y: number;
  contact: Vec2Interface;
  impactSpeed: number;
}

function disableObstacleCollisions(body: Matter.Body): void {
  body.collisionFilter = { ...NO_COLLISION_FILTER };
}

function removeObstacleBodies(ids: number[]): void {
  if (ids.length === 0) return;

  removeObstacleIds(ids);

  for (const id of ids) {
    obstaclesInLava.delete(id);
    const body = obstacleBodyById.get(id);
    if (body) {
      World.remove(gameContext.engine.world, body);
    }
    obstacleBodyById.delete(id);
    obstacleSizeById.delete(id);
  }

  gameContext.obstacles = [...obstacleBodyById.values()];
}

export interface ObstaclePhysicsSnapshotInterface {
  id: number;
  x: number;
  y: number;
  angle: number;
  size: number;
  platformY: number;
  platformId?: number;
}

export function getObstaclePhysicsSnapshots(): ObstaclePhysicsSnapshotInterface[] {
  return getObstacles().flatMap((obstacle) => {
    const body = obstacleBodyById.get(obstacle.id);
    if (!body) return [];

    return [{
      id: obstacle.id,
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      size: obstacleSizeById.get(obstacle.id) ?? obstacle.size,
      platformY: obstacle.platformY,
      platformId: obstacle.platformId,
    }];
  });
}

export function applyObstaclePhysicsSnapshots(snapshots: ObstaclePhysicsSnapshotInterface[]): void {
  for (const snapshot of snapshots) {
    const body = obstacleBodyById.get(snapshot.id);
    if (!body) continue;

    Body.setPosition(body, { x: snapshot.x, y: snapshot.y });
    Body.setAngle(body, snapshot.angle);
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
  }
}

export function getObstacleRenderStates(): ObstacleRenderStateInterface[] {
  return getObstacles().flatMap((obstacle) => {
    const body = obstacleBodyById.get(obstacle.id);
    if (!body) return [];

    const size = obstacleSizeById.get(obstacle.id) ?? obstacle.size;

    return [{
      id: obstacle.id,
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      size,
      inLava: obstaclesInLava.has(obstacle.id),
    }];
  });
}

export function hasObstaclesInLava(): boolean {
  return obstaclesInLava.size > 0;
}

export function updateObstaclesInLava(): ObstacleLavaEventInterface[] {
  const events: ObstacleLavaEventInterface[] = [];
  const toRemove: number[] = [];

  for (const obstacle of getObstacles()) {
    const body = obstacleBodyById.get(obstacle.id);
    if (!body) continue;

    const half = obstacle.size / 2;
    const { x, y } = body.position;
    const angle = body.angle;

    if (obstaclesInLava.has(obstacle.id)) {
      if (isCubeFullySubmerged(x, y, half, angle)) {
        toRemove.push(obstacle.id);
      }
      continue;
    }

    if (!isPlayerInLava(x, y, half, angle)) continue;

    obstaclesInLava.add(obstacle.id);
    disableObstacleCollisions(body);

    const velocity = {
      x: body.velocity.x * MATTER_VELOCITY_SCALE,
      y: body.velocity.y * MATTER_VELOCITY_SCALE,
    };

    events.push({
      x,
      y,
      contact: cubeLavaContactPoint(x, y, half, angle),
      impactSpeed: Math.hypot(velocity.x, velocity.y),
    });
  }

  removeObstacleBodies(toRemove);
  return events;
}

export function playerGrabRadius(): number {
  const half = gameConfig.ballRadius;
  const angle = gameContext.ball.angle;
  const extent = half * (Math.abs(Math.sin(angle)) + Math.abs(Math.cos(angle)));
  return extent * gameConfig.grabRadiusMultiplier;
}

function playerBottomExtent(angle: number): number {
  const half = gameConfig.ballRadius;
  return half * (Math.abs(Math.sin(angle)) + Math.abs(Math.cos(angle)));
}

function findSupportPlatform(
  platformList: PlatformInterface[],
  centerX: number,
  centerY: number,
  angle: number,
  maxDistance = 18,
): PlatformInterface | null {
  const half = gameConfig.ballRadius;
  const bottom = centerY + playerBottomExtent(angle);
  let best: PlatformInterface | null = null;
  let bestDistance = Infinity;

  for (const platform of platformList) {
    const landingMinX = platform.x + half;
    const landingMaxX = platform.x + platform.width - half;
    if (centerX < landingMinX || centerX > landingMaxX) continue;

    const distance = Math.abs(bottom - platform.y);
    if (distance < maxDistance && distance < bestDistance) {
      best = platform;
      bestDistance = distance;
    }
  }

  return best;
}

export function isBallTouchingPlatform(): boolean {
  return Query.collides(gameContext.ball, gameContext.platforms).length > 0;
}

export function isBallOnPlatformSurface(platformList: PlatformInterface[]): boolean {
  const body = gameContext.ball;
  return findSupportPlatform(platformList, body.position.x, body.position.y, body.angle) !== null;
}

function isBallOnStableObstacleTop(): boolean {
  const body = gameContext.ball;
  const angle = body.angle;
  if (!isStableOrientation(angle)) return false;

  const config = gameConfig.obstacles;
  const playerBottom = body.position.y + playerBottomExtent(angle);

  for (const obstacleBody of gameContext.obstacles) {
    const obstacleHalf = (obstacleBody.bounds.max.x - obstacleBody.bounds.min.x) / 2;
    const obstacleTop = obstacleBody.bounds.min.y;

    if (Math.abs(playerBottom - obstacleTop) > config.supportSurfaceTolerance) continue;

    const offsetX = Math.abs(body.position.x - obstacleBody.position.x);
    if (offsetX <= obstacleHalf * config.stableSupportCenterRatio) {
      return true;
    }
  }

  return false;
}

export function canSettleOnCurrentSupport(platformList: PlatformInterface[]): boolean {
  return isBallOnPlatformSurface(platformList) || isBallOnStableObstacleTop();
}

export function setBallPosition(pos: Vec2Interface): void {
  Body.setPosition(gameContext.ball, pos);
  Body.setVelocity(gameContext.ball, { x: 0, y: 0 });
  Body.setAngularVelocity(gameContext.ball, 0);
  Body.setStatic(gameContext.ball, true);
}

export function isStableOrientation(angle: number): boolean {
  const quarter = Math.PI / 2;
  const remainder = Math.abs(((angle % quarter) + quarter) % quarter);
  const eps = gameConfig.playerStableAngleEpsilon;
  return remainder < eps || remainder > quarter - eps;
}

function nearestStableAngle(angle: number): number {
  const quarter = Math.PI / 2;
  return Math.round(angle / quarter) * quarter;
}

export function nudgeUnstablePlayer(): void {
  const body = gameContext.ball;
  if (body.isStatic || isStableOrientation(body.angle)) return;

  const target = nearestStableAngle(body.angle);
  let diff = target - body.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) < 0.02) return;

  Body.setAngularVelocity(body, toMatterAngularVelocity(Math.sign(diff) * gameConfig.playerTipTorque));
}

export function settlePlayerOnPlatform(platformList: PlatformInterface[]): void {
  const body = gameContext.ball;
  const angle = nearestStableAngle(body.angle);
  const centerX = body.position.x;
  const support = findSupportPlatform(platformList, centerX, body.position.y, angle);
  const centerY = support ? support.y - playerBottomExtent(angle) : body.position.y;

  Body.setAngle(body, angle);
  Body.setVelocity(body, { x: 0, y: 0 });
  Body.setAngularVelocity(body, 0);
  Body.setPosition(body, { x: centerX, y: centerY });
  Body.setStatic(body, true);
}

export function isBallSettled(body: Matter.Body = gameContext.ball): boolean {
  const speed = Body.getSpeed(body);
  const angularSpeed = Math.abs(Body.getAngularVelocity(body));
  return (
    speed < matterSpeedThreshold(gameConfig.settleVelocityX)
    && Math.abs(body.velocity.y) < matterSpeedThreshold(gameConfig.settleVelocityY)
    && angularSpeed < matterSpeedThreshold(gameConfig.settleAngularVelocity)
  );
}

export function resetGamePhysics(
  platformList: PlatformInterface[],
  obstacleList: ObstacleInterface[] = [],
): void {
  obstacleBodyById.clear();
  obstacleSizeById.clear();
  obstaclesInLava.clear();
  lastPlatformHitSoundAt = 0;
  lastObstacleHitSoundAt = 0;
  lastObstacleDropSoundAt = 0;
  gameContext = createContext(platformList, obstacleList);
}

export function syncPlatformBodies(platformList: PlatformInterface[]): void {
  World.remove(gameContext.engine.world, gameContext.platforms);
  gameContext.platforms = platformList.map(platformBody);
  World.add(gameContext.engine.world, gameContext.platforms);
}

export function syncObstacleBodies(obstacleList: ObstacleInterface[]): void {
  const activeIds = new Set(obstacleList.map((obstacle) => obstacle.id));

  for (const [id, body] of obstacleBodyById.entries()) {
    if (activeIds.has(id)) continue;
    obstaclesInLava.delete(id);
    World.remove(gameContext.engine.world, body);
    obstacleBodyById.delete(id);
    obstacleSizeById.delete(id);
  }

  for (const obstacle of obstacleList) {
    if (obstacleBodyById.has(obstacle.id)) continue;
    addObstacleToWorld(gameContext, obstacle);
  }

  gameContext.obstacles = [...obstacleBodyById.values()];
}

export function syncWorldBodies(
  platformList: PlatformInterface[],
  obstacleList: ObstacleInterface[],
): void {
  syncPlatformBodies(platformList);
  syncObstacleBodies(obstacleList);
}

export function updatePlatformBodyPositions(platformList: PlatformInterface[]): void {
  for (let i = 0; i < platformList.length && i < gameContext.platforms.length; i++) {
    const platform = platformList[i];
    const body = gameContext.platforms[i];
    Body.setPosition(body, {
      x: platform.x + platform.width / 2,
      y: platform.y + platform.height / 2,
    });
  }
}

export function getPlayerSupportPlatform(platformList: PlatformInterface[]): PlatformInterface | null {
  const body = gameContext.ball;
  return findSupportPlatform(platformList, body.position.x, body.position.y, body.angle);
}

export function isStandingOnIce(platformList: PlatformInterface[]): boolean {
  const support = getCarrySupportPlatform(platformList) ?? getPlayerSupportPlatform(platformList);
  return platformTypeSkipsSettle(support?.typeId);
}

export function updatePlayerSurfaceFriction(platformList: PlatformInterface[]): void {
  const support = getCarrySupportPlatform(platformList) ?? getPlayerSupportPlatform(platformList);
  const friction = getPlatformType(support?.typeId).playerFriction;
  if (gameContext.ball.friction === friction) return;
  Body.set(gameContext.ball, { friction });
}

export function isBallStatic(): boolean {
  return gameContext.ball.isStatic;
}

function settledBallRestsOnPlatform(platform: PlatformInterface): boolean {
  const body = gameContext.ball;
  const half = gameConfig.ballRadius;
  const bottom = body.position.y + playerBottomExtent(body.angle);

  if (bottom < platform.y - 6) return false;
  if (bottom > platform.y + half + 8) return false;

  const footLeft = body.position.x - half;
  const footRight = body.position.x + half;
  return footRight > platform.x && footLeft < platform.x + platform.width;
}

export function getCarrySupportPlatform(platformList: PlatformInterface[]): PlatformInterface | null {
  const body = gameContext.ball;
  const direct = findSupportPlatform(
    platformList,
    body.position.x,
    body.position.y,
    body.angle,
    26,
  );
  if (direct) return direct;

  if (!body.isStatic) return null;

  let best: PlatformInterface | null = null;
  let bestDistance = Infinity;
  for (const platform of platformList) {
    if (!settledBallRestsOnPlatform(platform)) continue;

    const distance = Math.abs(body.position.y + playerBottomExtent(body.angle) - platform.y);
    if (distance < bestDistance) {
      best = platform;
      bestDistance = distance;
    }
  }

  return best;
}

export function translatePlayerHorizontal(dx: number): void {
  if (dx === 0) return;
  const body = gameContext.ball;
  Body.setPosition(body, { x: body.position.x + dx, y: body.position.y });
}

export function translateObstacleBodies(deltas: Map<number, number>): void {
  for (const obstacle of getObstacles()) {
    if (obstacle.platformId === undefined) continue;
    const dx = deltas.get(obstacle.platformId);
    if (!dx) continue;

    const body = obstacleBodyById.get(obstacle.id);
    if (!body) continue;

    Body.setPosition(body, { x: body.position.x + dx, y: body.position.y });
  }
}

export function simulateTrajectory(
  origin: Vec2Interface,
  velocity: Vec2Interface,
  platformList: PlatformInterface[],
): Vec2Interface[] {
  const engine = Engine.create({
    gravity: matterEngineGravity(),
  });

  const platformBodies = platformList.map(platformBody);
  const ball = createPlayerBody(origin.x, origin.y);
  Body.setVelocity(ball, toMatterVelocity(velocity));

  World.add(engine.world, [...platformBodies, ball]);

  let collided = false;
  const onCollision = (): void => {
    collided = true;
  };
  Events.on(engine, 'collisionStart', onCollision);

  const points: Vec2Interface[] = [{ ...origin }];
  const dtMs = gameConfig.physicsStep * 1000;

  for (let i = 0; i < gameConfig.trajectoryMaxSteps; i++) {
    Engine.update(engine, dtMs);
    points.push({ x: ball.position.x, y: ball.position.y });

    if (gameConfig.trajectoryUntilFirstCollision && collided) break;
    if (!gameConfig.trajectoryUntilFirstCollision && isBallSettled(ball) && isBallGrounded(ball, platformBodies)) break;
  }

  Events.off(engine, 'collisionStart', onCollision);

  return points;
}
