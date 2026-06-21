import { gameConfig } from './config';
import { getPlatformType } from './platformTypes';
import type { PlatformInterface } from './platforms';
import type { Vec2Interface } from './physics';

export const palette = {
  skyTop: '#8a96a8',
  skyMid: '#b2a9c1',
  skyHorizon: '#c8d4dc',
  skyBottom: '#dcd9e1',
  star: '#e6f2f5',
  starDim: '#a8c0c9',
  player: '#c2e5e9',
  playerShadow: '#6a98a8',
  playerHighlight: '#eefafc',
  playerEyeWhite: '#f4fafc',
  playerPupil: '#2e3a48',
  playerEyes: '#2e3a48',
  playerDim: '#8ab4c0',
  obstacle: '#8a9eb0',
  obstacleShadow: '#523242',
  obstacleHighlight: '#b8cdd8',
  lavaBright: '#ffb830',
  lavaMid: '#ff8820',
  lavaDark: '#d43818',
  lavaDeep: '#8a2010',
  lavaOutline: '#ffe860',
  slingshot: '#88b4c4',
  slingshotAnchor: '#7c5f4d',
  trajectory: '#c2e5e9',
  white: '#e6f2f5',
  milestone: '#c2e5e9',
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
  const {
    playerBlinkIntervalS,
    playerBlinkDurationS,
    playerDoubleBlinkChance,
    playerDoubleBlinkGapS,
  } = gameConfig.pixelArt;
  const cycleT = animTime % playerBlinkIntervalS;
  const cycleIndex = Math.floor(animTime / playerBlinkIntervalS);
  const doubleBlink = (hash2(cycleIndex, 41) % 100) < Math.floor(playerDoubleBlinkChance * 100);

  if (doubleBlink) {
    const secondBlinkStart = playerBlinkDurationS + playerDoubleBlinkGapS;
    const closed = cycleT < playerBlinkDurationS
      || (cycleT >= secondBlinkStart && cycleT < secondBlinkStart + playerBlinkDurationS);
    return !closed;
  }

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
    const visual = getPlatformType(platform.typeId).visual;
    const x = snap(platform.x);
    const y = snap(platform.y);
    const w = snap(platform.width);
    const h = snap(platform.height);

    ctx.fillStyle = visual.shadow;
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
          if (visual.sparkleTop && (col + row) % 3 === 0) {
            ctx.fillStyle = palette.white;
          } else {
            ctx.fillStyle = platform.motion ? visual.topMoving : visual.top;
          }
        } else if (isBottom) {
          ctx.fillStyle = visual.shadow;
        } else if ((row + col) % 2 === 0) {
          ctx.fillStyle = visual.face;
        } else {
          ctx.fillStyle = visual.checker;
        }

        ctx.fillRect(tx, ty, tw, th);
      }
    }

    ctx.fillStyle = platform.motion ? visual.topMoving : visual.edge;
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = platform.motion ? visual.topMoving : visual.top;
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
    withFace: true,
    dimmed,
  };
}

export interface PlayerEyeGazeInterface {
  left: Vec2Interface;
  right: Vec2Interface;
}

function worldGazeToLocal(gaze: Vec2Interface, angle: number): Vec2Interface {
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  return {
    x: gaze.x * cos - gaze.y * sin,
    y: gaze.x * sin + gaze.y * cos,
  };
}

function clampEye(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function drawPlayerEye(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  whiteSize: number,
  pupilSize: number,
  gaze: Vec2Interface,
  wide = false,
): void {
  const whiteW = wide ? Math.max(whiteSize + 2, Math.floor(whiteSize * 1.2)) : whiteSize;
  const whiteH = whiteSize;
  const halfWhiteW = whiteW / 2;
  const halfWhiteH = whiteH / 2;
  const whiteX = snap(centerX - halfWhiteW);
  const whiteY = snap(centerY - halfWhiteH);
  const maxOffsetX = Math.max(1, (whiteW - pupilSize) / 2);
  const maxOffsetY = Math.max(1, (whiteH - pupilSize) / 2);
  const pupilOffsetX = clampEye(gaze.x, -1, 1) * maxOffsetX;
  const pupilOffsetY = clampEye(gaze.y, -1, 1) * maxOffsetY;
  const pupilX = snap(centerX + pupilOffsetX - pupilSize / 2);
  const pupilY = snap(centerY + pupilOffsetY - pupilSize / 2);

  ctx.fillStyle = palette.playerEyeWhite;
  ctx.fillRect(whiteX, whiteY, whiteW, whiteH);

  ctx.fillStyle = palette.playerPupil;
  ctx.fillRect(pupilX, pupilY, pupilSize, pupilSize);
}

function drawPlayerFace(
  ctx: CanvasRenderingContext2D,
  px: number,
  eyesOpen: boolean,
  angle: number,
  gaze?: PlayerEyeGazeInterface,
  eyesWide = false,
): void {
  const eyeSize = Math.max(6, Math.floor(px * (eyesWide ? 0.3 : 0.24)));
  const pupilSize = Math.max(3, Math.floor(px * (eyesWide ? 0.09 : 0.1)));
  const eyeY = -Math.floor(px * (eyesWide ? 0.12 : 0.1));
  const eyeGap = Math.max(4, Math.floor(px * (eyesWide ? 0.16 : 0.18)));

  if (eyesOpen) {
    const leftGaze = worldGazeToLocal(gaze?.left ?? { x: 0, y: -1 }, angle);
    const rightGaze = worldGazeToLocal(gaze?.right ?? { x: 0, y: -1 }, angle);

    drawPlayerEye(ctx, -eyeGap, eyeY, eyeSize, pupilSize, leftGaze, eyesWide);
    drawPlayerEye(ctx, eyeGap, eyeY, eyeSize, pupilSize, rightGaze, eyesWide);
    return;
  }

  const blinkY = -Math.floor(px * 0.08);
  ctx.fillStyle = palette.playerShadow;
  ctx.fillRect(-Math.floor(px * 0.34), blinkY, Math.floor(px * 0.22), 2);
  ctx.fillRect(Math.floor(px * 0.12), blinkY, Math.floor(px * 0.22), 2);
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
  gaze?: PlayerEyeGazeInterface,
  eyesWide = false,
  offsetX = 0,
  offsetY = 0,
): void {
  const half = size / 2;
  const style = cubeStyle(kind, dimmed);
  const px = snap(size, 2);

  ctx.save();
  ctx.translate(snap(x) + offsetX, snap(y) + offsetY);
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

  if (style.withFace) {
    drawPlayerFace(ctx, px, eyesOpen, angle, gaze, eyesWide);
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
