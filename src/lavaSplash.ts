import { gameConfig } from './config';
import { lavaSurfaceYAt } from './lava';
import { drawPixelSplash } from './pixelArt';

export interface Vec2Interface {
  x: number;
  y: number;
}

interface SplashDropletInterface {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  kind: 'main' | 'fine';
}

let droplets: SplashDropletInterface[] = [];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pushSplashDroplets(
  contact: Vec2Interface,
  speedBoost: number,
  kind: 'main' | 'fine',
  count: number,
  minRadius: number,
  maxRadius: number,
  minUpSpeed: number,
  maxUpSpeed: number,
  spreadAngle: number,
  lifetime: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + randomBetween(-spreadAngle, spreadAngle);
    const speed = randomBetween(
      minUpSpeed + speedBoost * 0.25,
      maxUpSpeed + speedBoost,
    );

    droplets.push({
      x: contact.x,
      y: contact.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: randomBetween(minRadius, maxRadius),
      life: lifetime,
      kind,
    });
  }
}

export function cubeLavaContactPoint(
  centerX: number,
  centerY: number,
  halfSize: number,
  angle: number,
): Vec2Interface {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corners: Vec2Interface[] = [
    { x: -halfSize, y: -halfSize },
    { x: halfSize, y: -halfSize },
    { x: halfSize, y: halfSize },
    { x: -halfSize, y: halfSize },
  ].map(({ x, y }) => ({
    x: centerX + x * cos - y * sin,
    y: centerY + x * sin + y * cos,
  }));

  const sorted = [...corners].sort((a, b) => b.y - a.y);
  const contactX = (sorted[0].x + sorted[1].x) / 2;
  return {
    x: contactX,
    y: lavaSurfaceYAt(contactX),
  };
}

export function spawnLavaSplash(contact: Vec2Interface, impactSpeed: number): void {
  const { splash } = gameConfig.lava;
  const speedBoost = Math.min(
    splash.maxImpactBoost,
    impactSpeed * splash.impactSpeedScale,
  );

  pushSplashDroplets(
    contact,
    speedBoost,
    'main',
    splash.dropletCount,
    splash.minRadius,
    splash.maxRadius,
    splash.minUpSpeed,
    splash.maxUpSpeed,
    splash.spreadAngle,
    splash.maxLifetime,
  );

  pushSplashDroplets(
    contact,
    speedBoost,
    'fine',
    splash.fineDropletCount,
    splash.fineMinRadius,
    splash.fineMaxRadius,
    splash.fineMinUpSpeed,
    splash.fineMaxUpSpeed,
    splash.fineSpreadAngle,
    splash.maxLifetime,
  );
}

export function resetLavaSplash(): void {
  droplets = [];
}

export function updateLavaSplash(dt: number): void {
  if (droplets.length === 0) return;

  const { splash } = gameConfig.lava;

  for (const droplet of droplets) {
    droplet.vy += splash.gravity * dt;
    droplet.vx *= splash.airDrag ** (dt * 60);
    droplet.vy *= splash.airDrag ** (dt * 60);
    droplet.x += droplet.vx * dt;
    droplet.y += droplet.vy * dt;
    droplet.life -= dt;

    const surfaceY = lavaSurfaceYAt(droplet.x);
    if (droplet.vy > 0 && droplet.y + droplet.radius * 0.7 >= surfaceY) {
      droplet.life = 0;
    }
  }

  droplets = droplets.filter((droplet) => droplet.life > 0);
}

export function drawLavaSplash(ctx: CanvasRenderingContext2D): void {
  if (droplets.length === 0) return;

  for (const droplet of droplets) {
    const t = droplet.life / gameConfig.lava.splash.maxLifetime;
    const alpha = Math.min(1, t * 1.2);
    const sizeScale = droplet.kind === 'fine' ? 1.15 : 1.6;
    drawPixelSplash(ctx, droplet.x, droplet.y, droplet.radius * sizeScale, alpha);
  }
}
