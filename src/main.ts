import { gameConfig } from './config';
import {
  captureCheckpoint,
  hasCheckpoint,
  restoreCheckpoint,
  type ClimbCheckpointInterface,
  type GameCheckpointInterface,
} from './checkpoint';
import { isPlayerInLava, lavaSurfaceYAt, resetLava, updateLava } from './lava';
import { cubeLavaContactPoint, drawLavaSplash, resetLavaSplash, spawnLavaSplash, updateLavaSplash } from './lavaSplash';
import { drawMilestones } from './milestone';
import { getObstacles, translateObstaclesOnPlatforms } from './obstacles';
import {
  drawPixelBackground,
  drawPixelCube,
  drawPixelLava,
  drawPixelPlatforms,
  drawPixelSlingshotAnchor,
  drawPixelSlingshotLine,
  drawPixelTrajectory,
  isPlayerEyesOpen,
} from './pixelArt';
import { getPlatforms, resetPlatformGenerator, trackPlatformGeneratorHeight, updatePlatformGenerator } from './platformGenerator';
import { updateMovingPlatforms } from './platformMotion';
import { startBallPosition } from './platforms';
import {
  disablePlayerCollisions,
  getBallAngle,
  getBallPosition,
  getBallVelocity,
  canSettleOnCurrentSupport,
  hasObstaclesInLava,
  updateObstaclesInLava,
  getObstacleRenderStates,
  isBallGrounded,
  isBallOnPlatformSurface,
  isBallSettled,
  isBallTouchingPlatform,
  isStableOrientation,
  nudgeUnstablePlayer,
  resetBallPosition,
  resetGamePhysics,
  setBallFlying,
  setBallPosition,
  simulateTrajectory,
  settlePlayerOnPlatform,
  stepGamePhysics,
  shouldStepPhysics,
  syncWorldBodies,
  translateObstacleBodies,
  translatePlayerHorizontal,
  updatePlatformBodyPositions,
  getPlayerSupportPlatform,
  type Vec2Interface,
} from './physics';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const displayCtx = canvas.getContext('2d')!;
const renderCanvas = document.createElement('canvas');
const ctx = renderCanvas.getContext('2d')!;
const gameOverEl = document.getElementById('game-over') as HTMLDivElement;
const gameOverRewindBtn = document.getElementById('game-over-rewind') as HTMLButtonElement;
const gameOverRestartBtn = document.getElementById('game-over-restart') as HTMLButtonElement;
const hudHeightEl = document.getElementById('hud-height') as HTMLDivElement;
const milestonePopupEl = document.getElementById('milestone-popup') as HTMLDivElement;
const gameOverHeightEl = document.getElementById('game-over-height') as HTMLSpanElement;
const pauseOverlayEl = document.getElementById('pause-overlay') as HTMLDivElement;

let width = 0;
let height = 0;
let maxPull = gameConfig.maxPull;
let dragging = false;
let gameOver = false;
let gameOverOverlayTimer = 0;
let ballFlying = false;
let flyingTime = 0;
let settleStableTime = 0;
let physicsAccumulator = 0;
let idlePulsePhase = 0;
let animTime = 0;
let playerInLava = false;
let paused = false;
let lastCheckpoint: GameCheckpointInterface | null = null;

resetPlatformGenerator();
const startPos = startBallPosition(gameConfig.ballRadius);
resetGamePhysics(getPlatforms(), getObstacles());
resetBallPosition(startPos);

const cameraZone = {
  x: startPos.x,
  y: startPos.y,
};

let heightBaselineY = startPos.y;
let peakBallY = startPos.y;
let climbHeightM = 0;
let lastMilestonePassedM = 0;
let milestonePopupTimer = 0;

function climbCheckpointState(): ClimbCheckpointInterface {
  return {
    heightBaselineY,
    peakBallY,
    climbHeightM,
    lastMilestonePassedM,
  };
}

function saveCheckpoint(): void {
  lastCheckpoint = captureCheckpoint({
    camera: { ...cameraZone },
    climb: climbCheckpointState(),
  });
}

function applyClimbCheckpoint(climb: ClimbCheckpointInterface): void {
  heightBaselineY = climb.heightBaselineY;
  peakBallY = climb.peakBallY;
  climbHeightM = climb.climbHeightM;
  lastMilestonePassedM = climb.lastMilestonePassedM;
  milestonePopupTimer = 0;
  milestonePopupEl.hidden = true;
  milestonePopupEl.classList.remove('is-active');
  hudHeightEl.classList.remove('is-pulsing');
  updateHeightDisplay();
}

function formatHeight(meters: number): string {
  return `${meters} м`;
}

function climbHeightFromY(ballY: number): number {
  return Math.max(0, Math.round((heightBaselineY - ballY) / gameConfig.heightMetersScale));
}

function updateHeightDisplay(): void {
  hudHeightEl.textContent = formatHeight(climbHeightM);
}

function resetClimbHeight(baselineY: number): void {
  heightBaselineY = baselineY;
  peakBallY = baselineY;
  climbHeightM = 0;
  lastMilestonePassedM = 0;
  milestonePopupTimer = 0;
  milestonePopupEl.hidden = true;
  milestonePopupEl.classList.remove('is-active');
  hudHeightEl.classList.remove('is-pulsing');
  updateHeightDisplay();
}

function triggerMilestoneCelebration(meters: number): void {
  milestonePopupEl.textContent = `${meters} м`;
  milestonePopupEl.hidden = false;
  milestonePopupEl.classList.remove('is-active');
  void milestonePopupEl.offsetWidth;
  milestonePopupEl.classList.add('is-active');
  milestonePopupTimer = gameConfig.milestone.popupDurationMs / 1000;

  hudHeightEl.classList.remove('is-pulsing');
  void hudHeightEl.offsetWidth;
  hudHeightEl.classList.add('is-pulsing');
}

function checkMilestoneCrossings(): void {
  const intervalM = gameConfig.milestone.intervalM;
  const currentMilestone = Math.floor(climbHeightM / intervalM) * intervalM;

  if (currentMilestone > lastMilestonePassedM && currentMilestone >= intervalM) {
    lastMilestonePassedM = currentMilestone;
    triggerMilestoneCelebration(currentMilestone);
  }
}

function updateMilestoneUi(frameDt: number): void {
  if (milestonePopupTimer <= 0) return;

  milestonePopupTimer = Math.max(0, milestonePopupTimer - frameDt);
  if (milestonePopupTimer === 0) {
    milestonePopupEl.hidden = true;
    milestonePopupEl.classList.remove('is-active');
  }
}

function trackClimbHeight(): void {
  const y = ballPos().y;
  if (y >= peakBallY) return;
  peakBallY = y;
  climbHeightM = climbHeightFromY(y);
  updateHeightDisplay();
  checkMilestoneCrossings();
}

resetClimbHeight(startPos.y);
saveCheckpoint();

function visibleWorldBottom(): number {
  return cameraZone.y + height * (1 - gameConfig.cameraFocusRatio);
}

function resetLavaLevel(): void {
  resetLava(visibleWorldBottom());
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const renderScale = gameConfig.pixelArt.renderScale;
  width = window.innerWidth;
  height = window.innerHeight;

  renderCanvas.width = Math.max(1, Math.floor(width * renderScale * dpr));
  renderCanvas.height = Math.max(1, Math.floor(height * renderScale * dpr));
  ctx.setTransform(renderScale * dpr, 0, 0, renderScale * dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  displayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  displayCtx.imageSmoothingEnabled = false;

  const availablePull = height * (1 - gameConfig.cameraFocusRatio) - gameConfig.ballRadius - gameConfig.pullBottomPadding;
  maxPull = Math.min(gameConfig.maxPull, Math.max(gameConfig.minMaxPull, availablePull));
}

window.addEventListener('resize', resize);
resize();
resetLavaLevel();

let activePointerId: number | null = null;
let dragAnchor: Vec2Interface = { x: 0, y: 0 };
let pullPos: Vec2Interface = { x: 0, y: 0 };

function ballPos(): Vec2Interface {
  return getBallPosition();
}

function ballDisplayPos(): Vec2Interface {
  return ballPos();
}

function cameraOffsetX(): number {
  return width / 2 - cameraZone.x;
}

function cameraOffsetY(): number {
  return height * gameConfig.cameraFocusRatio - cameraZone.y;
}

interface ScreenRectInterface {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function deadZoneScreenBounds(): ScreenRectInterface {
  const focusX = width / 2;
  const focusY = height * gameConfig.cameraFocusRatio;
  const zoneW = width * gameConfig.cameraDeadZoneWidthRatio;
  const zoneH = height * gameConfig.cameraDeadZoneHeightRatio;

  return {
    left: focusX - zoneW / 2,
    top: focusY - zoneH / 2,
    right: focusX + zoneW / 2,
    bottom: focusY + zoneH / 2,
  };
}

function ballScreenPos(): Vec2Interface {
  const pos = ballDisplayPos();
  return {
    x: pos.x + cameraOffsetX(),
    y: pos.y + cameraOffsetY(),
  };
}

function updateCameraZone(): void {
  const zone = deadZoneScreenBounds();
  const screen = ballScreenPos();

  if (screen.x > zone.right) {
    cameraZone.x += screen.x - zone.right;
  } else if (screen.x < zone.left) {
    cameraZone.x += screen.x - zone.left;
  }

  if (screen.y > zone.bottom) {
    cameraZone.y += screen.y - zone.bottom;
  } else if (screen.y < zone.top) {
    cameraZone.y += screen.y - zone.top;
  }
}

function screenToWorld(screen: Vec2Interface): Vec2Interface {
  return {
    x: screen.x - cameraOffsetX(),
    y: screen.y - cameraOffsetY(),
  };
}

function clampPull(from: Vec2Interface, to: Vec2Interface): Vec2Interface {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxPull) return { x: to.x, y: to.y };
  const k = maxPull / dist;
  return { x: from.x + dx * k, y: from.y + dy * k };
}

function pointerPos(e: PointerEvent): Vec2Interface {
  const rect = canvas.getBoundingClientRect();
  return screenToWorld({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  });
}

function cancelDrag(): void {
  if (!dragging) return;
  dragging = false;
  activePointerId = null;
}

function setPaused(value: boolean): void {
  if (paused === value) return;
  paused = value;
  pauseOverlayEl.hidden = !paused;
  if (paused) {
    cancelDrag();
  }
}

function togglePause(): void {
  if (!gameOverEl.hidden) return;
  setPaused(!paused);
}

function restartGame(): void {
  setPaused(false);
  gameOver = false;
  gameOverOverlayTimer = 0;
  gameOverEl.hidden = true;
  dragging = false;
  activePointerId = null;
  physicsAccumulator = 0;
  ballFlying = false;
  flyingTime = 0;
  settleStableTime = 0;
  resetPlatformGenerator();
  resetGamePhysics(getPlatforms(), getObstacles());
  const spawn = startBallPosition(gameConfig.ballRadius);
  resetBallPosition(spawn);
  cameraZone.x = spawn.x;
  cameraZone.y = spawn.y;
  resetClimbHeight(spawn.y);
  resetLavaLevel();
  resetLavaSplash();
  idlePulsePhase = 0;
  animTime = 0;
  playerInLava = false;
  saveCheckpoint();
}

function rewindToCheckpoint(): void {
  if (!hasCheckpoint(lastCheckpoint)) return;

  setPaused(false);
  const restored = restoreCheckpoint(lastCheckpoint);

  gameOver = false;
  gameOverOverlayTimer = 0;
  gameOverEl.hidden = true;
  dragging = false;
  activePointerId = null;
  physicsAccumulator = 0;
  ballFlying = false;
  flyingTime = 0;
  settleStableTime = 0;
  playerInLava = false;
  idlePulsePhase = 0;
  animTime = 0;
  resetLavaSplash();

  cameraZone.x = restored.camera.x;
  cameraZone.y = restored.camera.y;
  applyClimbCheckpoint(restored.climb);
}

gameOverRewindBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  rewindToCheckpoint();
});

gameOverRestartBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  restartGame();
});

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  togglePause();
});

canvas.addEventListener('pointerdown', (e) => {
  if (paused || gameOver || ballFlying) return;
  const click = pointerPos(e);
  dragging = true;
  activePointerId = e.pointerId;
  dragAnchor = { ...click };
  pullPos = { ...click };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging || e.pointerId !== activePointerId) return;
  pullPos = clampPull(dragAnchor, pointerPos(e));
});

function endDrag(e: PointerEvent): void {
  if (!dragging || e.pointerId !== activePointerId) return;
  dragging = false;
  activePointerId = null;
  if (canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }
  launch();
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

function launch(): void {
  const launchPos = ballPos();
  const dx = dragAnchor.x - pullPos.x;
  const dy = dragAnchor.y - pullPos.y;
  const pull = Math.hypot(dx, dy);
  if (pull < gameConfig.minLaunchPull) {
    setBallPosition(launchPos);
    return;
  }
  setBallPosition(launchPos);
  setBallFlying({
    x: dx * gameConfig.launchPower,
    y: dy * gameConfig.launchPower,
  });
  ballFlying = true;
  flyingTime = 0;
  settleStableTime = 0;
}

function settle(): void {
  settlePlayerOnPlatform(getPlatforms());
  ballFlying = false;
  flyingTime = 0;
  settleStableTime = 0;
  saveCheckpoint();
}

function triggerGameOver(): void {
  if (gameOver) return;
  trackClimbHeight();
  const pos = ballPos();
  const velocity = getBallVelocity();
  const impactSpeed = Math.hypot(velocity.x, velocity.y);
  const contact = cubeLavaContactPoint(
    pos.x,
    pos.y,
    gameConfig.ballRadius,
    getBallAngle(),
  );
  spawnLavaSplash(contact, impactSpeed);
  gameOver = true;
  gameOverOverlayTimer = gameConfig.gameOverOverlayDelay;
  gameOverHeightEl.textContent = formatHeight(climbHeightM);
  gameOverEl.hidden = true;
}

function isPlayerTouchingLava(): boolean {
  const pos = ballPos();
  return isPlayerInLava(pos.x, pos.y, gameConfig.ballRadius, getBallAngle());
}

function handleLavaContact(): void {
  if (!isPlayerTouchingLava() || playerInLava) return;
  playerInLava = true;
  disablePlayerCollisions();
}

function handleObstaclesInLava(): void {
  const events = updateObstaclesInLava();
  for (const event of events) {
    spawnLavaSplash(event.contact, event.impactSpeed);
  }
}

function isPlayerSubmerged(): boolean {
  return playerInLava;
}

function stepPhysics(frameDt: number): void {
  physicsAccumulator = Math.min(
    physicsAccumulator + frameDt,
    gameConfig.maxPhysicsAccumulator,
  );

  while (physicsAccumulator >= gameConfig.physicsStep) {
    physicsAccumulator -= gameConfig.physicsStep;

    if (!shouldStepPhysics() && !ballFlying && !gameOver) {
      continue;
    }

    stepGamePhysics(gameConfig.physicsStep);

    if (gameOver) continue;
    if (!ballFlying) continue;

    flyingTime += gameConfig.physicsStep;
    trySettleAfterFlight();
  }
}

function slingshotCenter(): Vec2Interface {
  return dragging ? dragAnchor : ballPos();
}

function drawSlingshotGuide(): void {
  if (ballFlying || gameOver) return;

  const center = slingshotCenter();
  const ratio = dragging ? pullRatio() : 0;
  drawPixelSlingshotAnchor(ctx, center, maxPull, dragging, ratio);
}

function pullRatio(): number {
  if (!dragging) return 0;
  return Math.min(1, Math.hypot(dragAnchor.x - pullPos.x, dragAnchor.y - pullPos.y) / maxPull);
}

function trySettleAfterFlight(): void {
  if (flyingTime < gameConfig.settleDelay) {
    settleStableTime = 0;
    return;
  }

  if (flyingTime >= gameConfig.maxGroundedFlightTime && isBallGrounded()) {
    settle();
    return;
  }

  if (!isBallGrounded()) {
    settleStableTime = 0;
    return;
  }

  const onPlatform = isBallOnPlatformSurface(getPlatforms()) || isBallTouchingPlatform();
  const canSettle = canSettleOnCurrentSupport(getPlatforms()) || onPlatform;

  if (!canSettle) {
    settleStableTime = 0;
    return;
  }

  if (!isStableOrientation(getBallAngle())) {
    nudgeUnstablePlayer();
    settleStableTime = 0;

    if (flyingTime >= gameConfig.maxGroundedFlightTime && onPlatform) {
      settle();
    }
    return;
  }

  if (onPlatform) {
    settleStableTime += gameConfig.physicsStep;
    if (settleStableTime >= gameConfig.settleStableTime) {
      settle();
    }
    return;
  }

  if (isBallSettled()) {
    settleStableTime += gameConfig.physicsStep;
    if (settleStableTime >= gameConfig.settleStableTime) {
      settle();
    }
    return;
  }

  settleStableTime = 0;
}

function shouldCarryPlayerOnMovingPlatform(): boolean {
  if (gameOver || playerInLava) return false;
  if (ballFlying) {
    return isBallGrounded() && isBallOnPlatformSurface(getPlatforms());
  }
  return true;
}

function updateMovingPlatformsAndCarry(): void {
  const deltas = updateMovingPlatforms(getPlatforms(), animTime);
  if (deltas.size === 0) return;

  updatePlatformBodyPositions(getPlatforms());
  translateObstaclesOnPlatforms(deltas);
  translateObstacleBodies(deltas);

  if (!shouldCarryPlayerOnMovingPlatform()) return;

  const support = getPlayerSupportPlatform(getPlatforms());
  if (support?.id === undefined) return;

  const deltaX = deltas.get(support.id);
  if (deltaX) {
    translatePlayerHorizontal(deltaX);
  }
}

function update(frameDt: number): void {
  if (paused) return;

  animTime += frameDt;
  updateLava(frameDt);
  updateLavaSplash(frameDt);
  updateMilestoneUi(frameDt);

  const canDrag = !ballFlying && !gameOver && !playerInLava;
  if (canDrag && !dragging) {
    idlePulsePhase += frameDt * gameConfig.playerIdlePulseSpeed;
  } else {
    idlePulsePhase = 0;
  }

  if (gameOver) {
    updateMovingPlatformsAndCarry();
    stepPhysics(frameDt);
    handleObstaclesInLava();
    if (gameOverOverlayTimer > 0) {
      gameOverOverlayTimer = Math.max(0, gameOverOverlayTimer - frameDt);
      if (gameOverOverlayTimer === 0) {
        gameOverEl.hidden = false;
      }
    }
    return;
  }

  handleLavaContact();

  if (playerInLava) {
    triggerGameOver();
    updateMovingPlatformsAndCarry();
    stepPhysics(frameDt);
    handleObstaclesInLava();
    return;
  }

  updateMovingPlatformsAndCarry();
  stepPhysics(frameDt);
  handleObstaclesInLava();
  updateCameraZone();
  trackClimbHeight();

  if (ballFlying) {
    trackPlatformGeneratorHeight(ballPos().y);
  } else if (updatePlatformGenerator(ballPos().y)) {
    syncWorldBodies(getPlatforms(), getObstacles());
  }
}

function drawParallaxGrid(): void {
  drawPixelBackground(ctx, cameraZone.x, cameraZone.y, width, height, animTime);
}

function drawMilestone(): void {
  const topWorldY = cameraZone.y - height * gameConfig.cameraFocusRatio;
  const bottomWorldY = cameraZone.y + height * (1 - gameConfig.cameraFocusRatio);
  drawMilestones(ctx, heightBaselineY, cameraZone.x, width, topWorldY, bottomWorldY);
}

function drawPlatforms(): void {
  drawPixelPlatforms(ctx, getPlatforms());
}

function drawLava(): void {
  const bottomY = cameraZone.y + height * 3;
  drawPixelLava(ctx, cameraZone.x, width, bottomY, lavaSurfaceYAt);
}

function drawObstacles(inLavaLayer: 'above' | 'below'): void {
  for (const obstacle of getObstacleRenderStates()) {
    if (inLavaLayer === 'below' && !obstacle.inLava) continue;
    if (inLavaLayer === 'above' && obstacle.inLava) continue;

    drawPixelCube(
      ctx,
      obstacle.x,
      obstacle.y,
      obstacle.size,
      obstacle.angle,
      obstacle.inLava ? 'lava' : 'obstacle',
    );
  }
}

function drawPlayer(): void {
  const display = ballDisplayPos();
  const size = gameConfig.ballRadius * 2;
  const angle = getBallAngle();
  const inLava = playerInLava;
  const flying = ballFlying || gameOver;
  const canDrag = !flying && !inLava;

  drawPixelCube(
    ctx,
    display.x,
    display.y,
    size,
    angle,
    inLava ? 'lava' : 'player',
    !canDrag && !inLava,
    isPlayerEyesOpen(animTime),
  );
}

function draw(): void {
  const dpr = window.devicePixelRatio || 1;
  const renderScale = gameConfig.pixelArt.renderScale;
  ctx.setTransform(renderScale * dpr, 0, 0, renderScale * dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  drawParallaxGrid();

  ctx.save();
  ctx.translate(cameraOffsetX(), cameraOffsetY());

  drawPlatforms();
  drawMilestone();
  drawObstacles('above');

  const playerSubmerged = isPlayerSubmerged() || gameOver;
  const obstaclesSubmerged = hasObstaclesInLava();
  if (playerSubmerged || obstaclesSubmerged) {
    if (playerSubmerged) {
      drawPlayer();
    }
    drawObstacles('below');
  }

  drawLava();
  drawLavaSplash(ctx);
  drawSlingshotGuide();

  if (dragging) {
    const r = pullRatio();
    drawPixelSlingshotLine(ctx, dragAnchor, pullPos, r);

    const velocity = {
      x: (dragAnchor.x - pullPos.x) * gameConfig.launchPower,
      y: (dragAnchor.y - pullPos.y) * gameConfig.launchPower,
    };

    if (gameConfig.showTrajectory) {
      drawPixelTrajectory(ctx, simulateTrajectory(ballPos(), velocity, getPlatforms()));
    }
  }

  if (!playerSubmerged) {
    drawPlayer();
  }

  ctx.restore();

  displayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  displayCtx.imageSmoothingEnabled = false;
  displayCtx.clearRect(0, 0, width, height);
  displayCtx.drawImage(renderCanvas, 0, 0, width, height);

  if (gameConfig.showDeadZone) {
    const zone = deadZoneScreenBounds();
    displayCtx.strokeStyle = 'rgba(255, 248, 238, 0.55)';
    displayCtx.lineWidth = 2;
    displayCtx.setLineDash([10, 8]);
    displayCtx.strokeRect(
      zone.left,
      zone.top,
      zone.right - zone.left,
      zone.bottom - zone.top,
    );
    displayCtx.setLineDash([]);
  }
}

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min(gameConfig.maxFrameDelta, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
