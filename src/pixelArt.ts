import { gameConfig } from './config';
import type { PlatformInterface } from './platforms';
import type { Vec2Interface } from './physics';

export const palette = {
  skyTop: '#1a1238',
  skyMid: '#5a2868',
  skyHorizon: '#b8434a',
  skyBottom: '#e86a28',
  star: '#ffd4a8',
  starDim: '#c98a72',
  platformTop: '#c9a87a',
  platformTopMoving: '#e8c898',
  platformFace: '#7a5a48',
  platformFaceAlt: '#5a4038',
  platformShadow: '#3d2a24',
  platformEdge: '#a88462',
  platformChecker: '#4a342c',
  player: '#36d9ff',
  playerShadow: '#1a8fb8',
  playerHighlight: '#9ef0ff',
  playerEyes: '#1a1238',
  playerDim: '#248eb0',
  obstacle: '#8b8078',
  obstacleShadow: '#5c554f',
  obstacleHighlight: '#a8a098',
  lavaBright: '#ffb830',
  lavaMid: '#ff8820',
  lavaDark: '#d43818',
  lavaDeep: '#8a2010',
  lavaOutline: '#ffe860',
  slingshot: '#ff4060',
  slingshotAnchor: '#8b6078',
  trajectory: '#ffe860',
  white: '#fff8ee',
  milestone: '#fff8ee',
} as const;

export function snap(value: number, unit = gameConfig.pixelArt.snapUnit): number {
  return Math.round(value / unit) * unit;
}

function hash2(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

function drawSkyGradient(
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, viewHeight);
  grad.addColorStop(0, palette.skyTop);
  grad.addColorStop(0.38, palette.skyMid);
  grad.addColorStop(0.68, palette.skyHorizon);
  grad.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewWidth, viewHeight);
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  viewWidth: number,
  viewHeight: number,
  animTime: number,
): void {
  const { starParallax, starCell, starTwinkleSpeed } = gameConfig.pixelArt;
  const parallax = starParallax;
  const cell = starCell;
  const focusY = viewHeight * gameConfig.cameraFocusRatio;
  const scrollX = cameraX * parallax;
  const scrollY = cameraY * parallax;

  ctx.save();
  ctx.translate(viewWidth / 2 - scrollX, focusY - scrollY);

  const left = scrollX - viewWidth;
  const right = scrollX + viewWidth * 2;
  const top = scrollY - viewHeight;
  const bottom = scrollY + viewHeight * 0.25;
  const startX = Math.floor(left / cell) * cell;
  const startY = Math.floor(top / cell) * cell;

  for (let y = startY; y <= bottom; y += cell) {
    for (let x = startX; x <= right; x += cell) {
      const h = hash2(x, y);
      if (h % 7 !== 0) continue;

      const phase = animTime * starTwinkleSpeed + (h % 1000) * 0.006;
      const twinkle = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(phase));
      const size = h % 13 === 0 ? 3 : 2;

      ctx.globalAlpha = twinkle;
      ctx.fillStyle = twinkle > 0.72 ? palette.star : palette.starDim;
      ctx.fillRect(snap(x), snap(y), size, size);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

export function isPlayerEyesOpen(animTime: number): boolean {
  const { playerBlinkIntervalS, playerBlinkDurationS } = gameConfig.pixelArt;
  const cycleT = animTime % playerBlinkIntervalS;
  return cycleT >= playerBlinkDurationS;
}

export function drawPixelBackground(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  viewWidth: number,
  viewHeight: number,
  animTime: number,
): void {
  drawSkyGradient(ctx, viewWidth, viewHeight);
  drawStars(ctx, cameraX, cameraY, viewWidth, viewHeight, animTime);
}

export function drawPixelPlatforms(
  ctx: CanvasRenderingContext2D,
  platforms: PlatformInterface[],
): void {
  const tile = gameConfig.pixelArt.tileSize;

  for (const platform of platforms) {
    const x = snap(platform.x);
    const y = snap(platform.y);
    const w = snap(platform.width);
    const h = snap(platform.height);

    ctx.fillStyle = palette.platformShadow;
    ctx.fillRect(x + 2, y + 2, w, h);

    for (let ty = y; ty < y + h; ty += tile) {
      for (let tx = x; tx < x + w; tx += tile) {
        const tw = Math.min(tile, x + w - tx);
        const th = Math.min(tile, y + h - ty);
        const row = Math.floor((ty - y) / tile);
        const col = Math.floor((tx - x) / tile);
        const isTop = ty === y;
        const isBottom = ty + th >= y + h;

        if (isTop) {
          ctx.fillStyle = platform.motion ? palette.platformTopMoving : palette.platformTop;
        } else if (isBottom) {
          ctx.fillStyle = palette.platformShadow;
        } else if ((row + col) % 2 === 0) {
          ctx.fillStyle = palette.platformFace;
        } else {
          ctx.fillStyle = palette.platformChecker;
        }

        ctx.fillRect(tx, ty, tw, th);
      }
    }

    ctx.fillStyle = platform.motion ? palette.platformTopMoving : palette.platformEdge;
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = platform.motion ? palette.platformTopMoving : palette.platformTop;
    ctx.fillRect(x + 2, y + 1, w - 4, 2);
  }
}

interface PixelCubeStyleInterface {
  fill: string;
  shadow: string;
  highlight: string;
  outline: string;
  withFace: boolean;
  dimmed: boolean;
}

function cubeStyle(kind: 'player' | 'obstacle' | 'lava', dimmed: boolean): PixelCubeStyleInterface {
  if (kind === 'lava') {
    return {
      fill: palette.lavaBright,
      shadow: palette.lavaDark,
      highlight: palette.lavaOutline,
      outline: palette.lavaOutline,
      withFace: false,
      dimmed: false,
    };
  }

  if (kind === 'obstacle') {
    return {
      fill: palette.obstacle,
      shadow: palette.obstacleShadow,
      highlight: palette.obstacleHighlight,
      outline: palette.obstacleShadow,
      withFace: false,
      dimmed: false,
    };
  }

  return {
    fill: dimmed ? palette.playerDim : palette.player,
    shadow: palette.playerShadow,
    highlight: palette.playerHighlight,
    outline: palette.playerShadow,
    withFace: !dimmed,
    dimmed,
  };
}

export function drawPixelCube(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  kind: 'player' | 'obstacle' | 'lava',
  dimmed = false,
  eyesOpen = true,
): void {
  const half = size / 2;
  const style = cubeStyle(kind, dimmed);
  const px = snap(size, 2);

  ctx.save();
  ctx.translate(snap(x), snap(y));
  ctx.rotate(angle);

  const inset = Math.max(2, Math.floor(px * 0.12));

  ctx.fillStyle = style.shadow;
  ctx.fillRect(-half + 2, -half + 2, px, px);

  ctx.fillStyle = style.fill;
  ctx.fillRect(-half, -half, px, px);

  ctx.fillStyle = style.highlight;
  ctx.fillRect(-half, -half, px, inset);
  ctx.fillRect(-half, -half, inset, px);

  ctx.fillStyle = style.outline;
  ctx.fillRect(-half, half - 2, px, 2);
  ctx.fillRect(half - 2, -half, 2, px);

  if (style.withFace && eyesOpen) {
    const eye = Math.max(2, Math.floor(px * 0.14));
    const eyeY = -Math.floor(px * 0.12);
    const eyeGap = Math.max(3, Math.floor(px * 0.22));
    ctx.fillStyle = palette.playerEyes;
    ctx.fillRect(-eyeGap - eye, eyeY, eye, eye);
    ctx.fillRect(eyeGap, eyeY, eye, eye);
  } else if (style.withFace && !eyesOpen) {
    const eyeY = -Math.floor(px * 0.1);
    ctx.fillStyle = palette.playerShadow;
    ctx.fillRect(-Math.floor(px * 0.32), eyeY, Math.floor(px * 0.64), 2);
  }

  ctx.restore();
}

export function drawPixelLava(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  viewWidth: number,
  bottomY: number,
  surfaceYAt: (worldX: number) => number,
): void {
  const left = snap(cameraX - viewWidth * 2);
  const right = snap(cameraX + viewWidth * 2);
  const step = gameConfig.pixelArt.lavaStep;

  for (let x = left; x <= right; x += step) {
    const surface = snap(surfaceYAt(x));
    const columnW = Math.min(step, right - x + step);

    ctx.fillStyle = palette.lavaBright;
    ctx.fillRect(x, surface, columnW, 8);
    ctx.fillStyle = palette.lavaMid;
    ctx.fillRect(x, surface + 8, columnW, 18);
    ctx.fillStyle = palette.lavaDark;
    ctx.fillRect(x, surface + 26, columnW, Math.max(step, bottomY - surface - 26));
  }

  ctx.fillStyle = palette.lavaOutline;
  for (let x = left; x <= right; x += step) {
    const surface = snap(surfaceYAt(x));
    ctx.fillRect(x, surface - 3, step, 4);
  }
}

export function drawPixelSlingshotAnchor(
  ctx: CanvasRenderingContext2D,
  center: Vec2Interface,
  maxPullRadius: number,
  dragging: boolean,
  pullRatio: number,
): void {
  if (gameConfig.showPullLimit) {
    ctx.strokeStyle = dragging && pullRatio >= 0.98 ? palette.slingshot : palette.starDim;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(snap(center.x), snap(center.y), snap(maxPullRadius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const r = gameConfig.anchorRadius;
  ctx.fillStyle = palette.slingshotAnchor;
  ctx.fillRect(snap(center.x) - r, snap(center.y) - r, r * 2, r * 2);
  ctx.fillStyle = palette.star;
  ctx.fillRect(snap(center.x) - 1, snap(center.y) - 1, 2, 2);
}

export function drawPixelSlingshotLine(
  ctx: CanvasRenderingContext2D,
  from: Vec2Interface,
  to: Vec2Interface,
  pullRatio: number,
): void {
  ctx.strokeStyle = pullRatio >= 0.85 ? palette.slingshot : palette.trajectory;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(snap(from.x), snap(from.y));
  ctx.lineTo(snap(to.x), snap(to.y));
  ctx.stroke();

  ctx.fillStyle = palette.slingshot;
  ctx.fillRect(snap(to.x) - 3, snap(to.y) - 3, 6, 6);
}

export function drawPixelTrajectory(
  ctx: CanvasRenderingContext2D,
  points: Vec2Interface[],
): void {
  if (points.length < 2) return;

  ctx.fillStyle = palette.trajectory;
  for (let i = 0; i < points.length; i += 3) {
    const point = points[i];
    ctx.fillRect(snap(point.x) - 1, snap(point.y) - 1, 3, 3);
  }
}

export function drawPixelSplash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = palette.lavaOutline;
  const s = Math.max(2, snap(size, 2));
  ctx.fillRect(snap(x) - s / 2, snap(y) - s / 2, s, s);
  ctx.restore();
}
