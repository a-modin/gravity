import { gameConfig } from './config';
import { syncRainSound, tryUnlockRainSound as unlockRainSound } from './rainSound';
import { lavaSurfaceYAt } from './lava';
import { palette } from './pixelArt';
import { getBallAngle, getBallPosition } from './physics';
import type { PlatformInterface } from './platforms';

interface MainRainDropInterface {
  tipX: number;
  tipY: number;
  vx: number;
  vy: number;
  length: number;
}

interface SplashDropInterface {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

let rainSpawning = Math.random() < gameConfig.rain.activeTimeFraction;
let rainWeatherAutomatic = true;
let weatherStateTimer = 0;
const mainDrops: MainRainDropInterface[] = [];
const splashDrops: SplashDropInterface[] = [];
let spawnAccumulator = 0;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickActiveDuration(): number {
  const { activeDurationMin, activeDurationMax } = gameConfig.rain;
  return randomBetween(activeDurationMin, activeDurationMax);
}

function pickInactiveDuration(): number {
  const { inactiveDurationMin, inactiveDurationMax } = gameConfig.rain;
  return randomBetween(inactiveDurationMin, inactiveDurationMax);
}

function resetWeatherStateTimer(): void {
  weatherStateTimer = rainSpawning ? pickActiveDuration() : pickInactiveDuration();
}

resetWeatherStateTimer();

function hasRainParticles(): boolean {
  return mainDrops.length > 0 || splashDrops.length > 0;
}

function syncRainSoundState(): void {
  syncRainSound(rainSpawning || hasRainParticles());
}

function setRainSpawning(spawning: boolean): void {
  if (rainSpawning === spawning) return;
  rainSpawning = spawning;
  if (spawning) syncRainSoundState();
}

function updateRainWeather(frameDt: number): void {
  if (!rainWeatherAutomatic || frameDt <= 0) return;

  weatherStateTimer -= frameDt;
  if (weatherStateTimer > 0) return;

  setRainSpawning(!rainSpawning);
  weatherStateTimer = rainSpawning ? pickActiveDuration() : pickInactiveDuration();
}

function parseColor(color: string): { r: number; g: number; b: number } {
  if (color.startsWith('rgb')) {
    const parts = color.match(/\d+/g);
    if (!parts || parts.length < 3) return { r: 180, g: 200, b: 220 };
    return { r: Number(parts[0]), g: Number(parts[1]), b: Number(parts[2]) };
  }

  const n = Number.parseInt(color.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function skyLuminance(): number {
  const { r, g, b } = parseColor(palette.skyMid);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getRainDrawColors(): { outline: string; core: string; splash: string } {
  const lum = skyLuminance();

  if (lum > 0.52) {
    return {
      outline: 'rgba(34, 54, 82, 0.42)',
      core: 'rgba(88, 138, 186, 0.62)',
      splash: 'rgba(110, 160, 210, 0.58)',
    };
  }

  if (lum > 0.35) {
    return {
      outline: 'rgba(48, 70, 98, 0.38)',
      core: 'rgba(136, 184, 226, 0.58)',
      splash: 'rgba(156, 200, 238, 0.55)',
    };
  }

  return {
    outline: 'rgba(196, 220, 245, 0.28)',
    core: 'rgba(220, 238, 255, 0.52)',
    splash: 'rgba(230, 245, 255, 0.48)',
  };
}

function dropBack(drop: MainRainDropInterface): { x: number; y: number } {
  const speed = Math.hypot(drop.vx, drop.vy) || 1;
  return {
    x: drop.tipX - (drop.vx / speed) * drop.length,
    y: drop.tipY - (drop.vy / speed) * drop.length,
  };
}

function isBelowLavaSurface(x: number, y: number): boolean {
  return y >= lavaSurfaceYAt(x);
}

function dropTouchesLava(drop: MainRainDropInterface): boolean {
  const back = dropBack(drop);
  return isBelowLavaSurface(drop.tipX, drop.tipY) || isBelowLavaSurface(back.x, back.y);
}

function drawRainStreak(
  ctx: CanvasRenderingContext2D,
  drop: MainRainDropInterface,
  thickness: number,
  colors: { outline: string; core: string },
): void {
  const back = dropBack(drop);
  const steps = Math.max(2, Math.ceil(drop.length / 2));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(back.x + (drop.tipX - back.x) * t);
    const y = Math.round(back.y + (drop.tipY - back.y) * t);

    if (thickness > 1) {
      ctx.fillStyle = colors.outline;
      ctx.fillRect(x - 1, y, thickness + 1, thickness);
    }

    ctx.fillStyle = colors.core;
    ctx.fillRect(x, y, thickness, thickness);
  }
}

function visibleWorldBounds(
  cameraX: number,
  cameraY: number,
  viewWidth: number,
  viewHeight: number,
): { left: number; right: number; top: number; bottom: number } {
  return {
    left: cameraX - viewWidth / 2,
    right: cameraX + viewWidth / 2,
    top: cameraY - viewHeight * gameConfig.cameraFocusRatio,
    bottom: cameraY + viewHeight * (1 - gameConfig.cameraFocusRatio),
  };
}

function spawnSplash(x: number, y: number): void {
  const {
    splashCountMin,
    splashCountMax,
    splashUpSpeedMin,
    splashUpSpeedMax,
    splashHorizontalSpeed,
    splashLifetime,
    windSpeed,
  } = gameConfig.rain;

  const count = Math.floor(randomBetween(splashCountMin, splashCountMax + 1));
  for (let i = 0; i < count; i++) {
    splashDrops.push({
      x: x + randomBetween(-5, 5),
      y,
      vx: windSpeed * 0.35 + randomBetween(-splashHorizontalSpeed, splashHorizontalSpeed),
      vy: -randomBetween(splashUpSpeedMin, splashUpSpeedMax),
      life: splashLifetime,
    });
  }
}

function hitsHorizontalSurface(
  drop: MainRainDropInterface,
  surfaceLeft: number,
  surfaceRight: number,
  surfaceY: number,
  frameDt: number,
): boolean {
  const nextTipX = drop.tipX + drop.vx * frameDt;
  const nextTipY = drop.tipY + drop.vy * frameDt;

  if (nextTipX < surfaceLeft || nextTipX > surfaceRight) return false;
  if (drop.tipY > surfaceY + 4) return false;
  if (nextTipY < surfaceY) return false;

  return true;
}

function rainCandidatePlatforms(
  drop: MainRainDropInterface,
  frameDt: number,
  platforms: PlatformInterface[],
): PlatformInterface[] {
  const nextTipX = drop.tipX + drop.vx * frameDt;
  const nextTipY = drop.tipY + drop.vy * frameDt;
  const back = dropBack(drop);
  const minX = Math.min(drop.tipX, nextTipX, back.x) - 28;
  const maxX = Math.max(drop.tipX, nextTipX, back.x) + 28;
  const minY = Math.min(drop.tipY, nextTipY, back.y) - drop.length - 12;
  const maxY = Math.max(drop.tipY, nextTipY, back.y) + 12;

  return platforms.filter((platform) => {
    if (platform.x + platform.width < minX || platform.x > maxX) return false;
    return platform.y >= minY && platform.y <= maxY;
  });
}

function playerRainSurfaceBounds(
  centerX: number,
  centerY: number,
  halfSize: number,
  angle: number,
): { left: number; right: number; topY: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corners = [
    { x: -halfSize, y: -halfSize },
    { x: halfSize, y: -halfSize },
    { x: halfSize, y: halfSize },
    { x: -halfSize, y: halfSize },
  ].map(({ x, y }) => ({
    x: centerX + x * cos - y * sin,
    y: centerY + x * sin + y * cos,
  }));

  return {
    left: Math.min(...corners.map((corner) => corner.x)),
    right: Math.max(...corners.map((corner) => corner.x)),
    topY: Math.min(...corners.map((corner) => corner.y)),
  };
}

function hitsPlatformTop(
  drop: MainRainDropInterface,
  platform: PlatformInterface,
  frameDt: number,
): boolean {
  return hitsHorizontalSurface(
    drop,
    platform.x,
    platform.x + platform.width,
    platform.y,
    frameDt,
  );
}

function hitsPlayerTop(drop: MainRainDropInterface, frameDt: number): number | null {
  const { x, y } = getBallPosition();
  const { left, right, topY } = playerRainSurfaceBounds(
    x,
    y,
    gameConfig.ballRadius,
    getBallAngle(),
  );

  if (!hitsHorizontalSurface(drop, left, right, topY, frameDt)) return null;
  return topY;
}

export function isRainEnabled(): boolean {
  return rainSpawning;
}

export function isRainWet(): boolean {
  return rainSpawning || hasRainParticles();
}

export function isRainWeatherAutomatic(): boolean {
  return rainWeatherAutomatic;
}

export function setRainWeatherAutomatic(automatic: boolean): void {
  rainWeatherAutomatic = automatic;
  if (automatic) {
    resetWeatherStateTimer();
    return;
  }
  syncRainSoundState();
}

export function setRainForced(active: boolean): void {
  rainWeatherAutomatic = false;
  setRainSpawning(active);
}

export function tryUnlockRainSound(): void {
  unlockRainSound(rainSpawning || hasRainParticles());
}

export function updateRain(
  frameDt: number,
  cameraX: number,
  cameraY: number,
  viewWidth: number,
  viewHeight: number,
  platforms: PlatformInterface[],
): void {
  updateRainWeather(frameDt);
  if (frameDt <= 0) return;

  const hasParticles = hasRainParticles();
  if (!rainSpawning && !hasParticles) {
    syncRainSoundState();
    return;
  }

  const bounds = visibleWorldBounds(cameraX, cameraY, viewWidth, viewHeight);
  const {
    spawnRate,
    maxMainDrops,
    fallSpeed,
    windSpeed,
    dropLengthMin,
    dropLengthMax,
    gravity,
    splashLifetime,
  } = gameConfig.rain;

  if (rainSpawning) {
    const spawnLeft = bounds.left - windSpeed * 0.6;
    const spawnRight = bounds.right + windSpeed * 0.15;

    spawnAccumulator += frameDt * spawnRate;
    while (spawnAccumulator >= 1 && mainDrops.length < maxMainDrops) {
      spawnAccumulator -= 1;
      const length = randomBetween(dropLengthMin, dropLengthMax);
      const tipX = randomBetween(spawnLeft, spawnRight);
      const tipY = bounds.top - randomBetween(20, 180);

      mainDrops.push({
        tipX,
        tipY,
        vx: windSpeed,
        vy: fallSpeed,
        length,
      });
    }
  }

  for (let i = mainDrops.length - 1; i >= 0; i--) {
    const drop = mainDrops[i];
    let hit = false;

    const playerSurfaceY = hitsPlayerTop(drop, frameDt);
    if (playerSurfaceY !== null) {
      spawnSplash(drop.tipX, playerSurfaceY);
      hit = true;
    }

    if (!hit) {
      const nearbyPlatforms = rainCandidatePlatforms(drop, frameDt, platforms);
      for (const platform of nearbyPlatforms) {
        if (!hitsPlatformTop(drop, platform, frameDt)) continue;
        spawnSplash(drop.tipX, platform.y);
        hit = true;
        break;
      }
    }

    if (hit) {
      mainDrops.splice(i, 1);
      continue;
    }

    if (dropTouchesLava(drop)) {
      mainDrops.splice(i, 1);
      continue;
    }

    drop.tipX += drop.vx * frameDt;
    drop.tipY += drop.vy * frameDt;

    if (dropTouchesLava(drop)) {
      mainDrops.splice(i, 1);
      continue;
    }

    if (drop.tipY > bounds.bottom + 240 || drop.tipX < bounds.left - 200 || drop.tipX > bounds.right + 200) {
      mainDrops.splice(i, 1);
    }
  }

  const maxSplashes = maxMainDrops * 4;
  for (let i = splashDrops.length - 1; i >= 0; i--) {
    const splash = splashDrops[i];
    splash.vy += gravity * frameDt;
    splash.x += splash.vx * frameDt;
    splash.y += splash.vy * frameDt;
    splash.life -= frameDt;

    if (
      splash.life <= 0
      || isBelowLavaSurface(splash.x, splash.y)
      || splash.y > bounds.bottom + splashLifetime * 400
    ) {
      splashDrops.splice(i, 1);
    }
  }

  if (splashDrops.length > maxSplashes) {
    splashDrops.splice(0, splashDrops.length - maxSplashes);
  }

  syncRainSoundState();
}

export function drawRain(ctx: CanvasRenderingContext2D): void {
  if (!rainSpawning && !hasRainParticles()) return;

  const { splashSize } = gameConfig.rain;
  const colors = getRainDrawColors();
  const thickness = gameConfig.rain.dropThickness;

  ctx.save();

  for (const drop of mainDrops) {
    if (dropTouchesLava(drop)) continue;
    drawRainStreak(ctx, drop, thickness, colors);
  }

  for (const splash of splashDrops) {
    if (isBelowLavaSurface(splash.x, splash.y)) continue;
    const alpha = Math.max(0, Math.min(1, splash.life / gameConfig.rain.splashLifetime));
    ctx.globalAlpha = alpha;
    const size = splashSize;
    ctx.fillStyle = colors.splash;
    ctx.fillRect(
      Math.round(splash.x - size / 2),
      Math.round(splash.y - size / 2),
      size,
      size,
    );
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
