import { gameConfig } from './config';
import {
  formatHeightMeters,
  onLocaleChange,
} from './i18n';
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
  applyDayNightState,
  drawPixelBackground,
  drawPixelCube,
  drawPixelLava,
  drawPixelPlatforms,
  drawPixelSlingshotAnchor,
  drawPixelSlingshotLine,
  drawPixelTrajectory,
  isPlayerEyesOpen,
  palette,
  type PlayerEyeGazeInterface,
} from './pixelArt';
import {
  computeDayNightState,
  loadStoredDayHour,
  normalizeDayHour,
  saveStoredDayHour,
} from './dayNight';
import { preloadBackgroundMusic, tryStartBackgroundMusic } from './music';
import type { DebugPanelInterface } from './debugPanel';
import { drawRain, isRainWet, tryUnlockRainSound, updateRain } from './rain';
import { getPlatforms, resetPlatformGenerator, trackPlatformGeneratorHeight, updatePlatformGenerator } from './platformGenerator';
import { playMilestoneCrossSound, playObstacleLavaBurnSound, playPlayerLavaBurnSound, playSlingPullSound, playSlingReleaseSound, preloadGameSounds, resumeAudioContext, stopSlingPullSound } from './sounds';
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
  getCarrySupportPlatform,
  isBallStatic,
  isStandingOnIce,
  setSurfaceWet,
  updateSurfaceFriction,
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
const pauseResumeBtn = document.getElementById('pause-resume') as HTMLButtonElement;

let debugPanel: DebugPanelInterface | null = null;

let width = 0;
let height = 0;
let maxPull = gameConfig.maxPull;
let dragging = false;
let pullSoundPlayed = false;
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
let dayNightHour = loadStoredDayHour();
let dayNightManual = false;
let lastSavedDayNightHour = dayNightHour;

resetPlatformGenerator();
const startPos = startBallPosition(gameConfig.ballRadius);
resetGamePhysics(getPlatforms(), getObstacles());
resetBallPosition(startPos);

void preloadGameSounds();
preloadBackgroundMusic();
updateDayNightPalette();

if (import.meta.env.DEV) {
  void import('./debugPanel').then(({ initDebugPanel }) => {
    debugPanel = initDebugPanel({
      getDayNightHour: () => dayNightHour,
      setDayNightHour: (hour) => {
        dayNightHour = hour;
        lastSavedDayNightHour = hour;
      },
      getDayNightManual: () => dayNightManual,
      setDayNightManual: (manual) => {
        dayNightManual = manual;
      },
      refreshDayNight: () => updateDayNightPalette(),
    });
    debugPanel.updateDayNightDisplay(dayNightHour, dayNightManual);
  });
}

window.addEventListener('beforeunload', () => {
  saveStoredDayHour(dayNightHour);
});

const cameraZone = {
  x: startPos.x,
  y: startPos.y,
};

let heightBaselineY = startPos.y;
let peakBallY = startPos.y;
let climbHeightM = 0;
let lastMilestonePassedM = 0;
let milestonePopupTimer = 0;
let milestonePopupMeters = 0;

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
  return formatHeightMeters(meters);
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
  playMilestoneCrossSound();
  milestonePopupMeters = meters;
  milestonePopupEl.textContent = formatHeight(meters);
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

onLocaleChange(() => {
  updateHeightDisplay();
  if (!milestonePopupEl.hidden) {
    milestonePopupEl.textContent = formatHeight(milestonePopupMeters);
  }
  if (!gameOverEl.hidden) {
    gameOverHeightEl.textContent = formatHeight(climbHeightM);
  }
});

function persistDayNightHour(): void {
  if (Math.abs(dayNightHour - lastSavedDayNightHour) < 0.02) return;
  lastSavedDayNightHour = dayNightHour;
  saveStoredDayHour(dayNightHour);
}

function updateDayNightPalette(frameDt = 0): void {
  if (!dayNightManual && frameDt > 0) {
    dayNightHour = normalizeDayHour(
      dayNightHour + (frameDt / gameConfig.dayNightCycleSeconds) * 24,
    );
    persistDayNightHour();
  }

  applyDayNightState(computeDayNightState(dayNightHour));
  document.body.style.background = palette.skyBottom;
  debugPanel?.updateDayNightDisplay(dayNightHour, dayNightManual);
}

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
let mouseWorldPos: Vec2Interface | null = null;
let mouseOnCanvas = false;

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

const OBSTACLE_LAVA_SOUND_VIEW_MARGIN = 200;

function visibleWorldBounds(margin = 0): ScreenRectInterface {
  return {
    left: cameraZone.x - width / 2 - margin,
    right: cameraZone.x + width / 2 + margin,
    top: cameraZone.y - height * gameConfig.cameraFocusRatio - margin,
    bottom: cameraZone.y + height * (1 - gameConfig.cameraFocusRatio) + margin,
  };
}

function isNearVisibleWorldArea(x: number, y: number, margin = OBSTACLE_LAVA_SOUND_VIEW_MARGIN): boolean {
  const bounds = visibleWorldBounds(margin);
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
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
  stopSlingPullSound();
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

pauseResumeBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!paused || !gameOverEl.hidden) return;
  setPaused(false);
});

function restartGame(): void {
  setPaused(false);
  gameOver = false;
  gameOverOverlayTimer = 0;
  gameOverEl.hidden = true;
  dragging = false;
  activePointerId = null;
  stopSlingPullSound();
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
  stopSlingPullSound();
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

canvas.addEventListener('pointerenter', (e) => {
  mouseOnCanvas = true;
  mouseWorldPos = pointerPos(e);
});

canvas.addEventListener('pointerleave', () => {
  mouseOnCanvas = false;
});

canvas.addEventListener('pointerdown', (e) => {
  mouseOnCanvas = true;
  mouseWorldPos = pointerPos(e);
  if (paused || gameOver || ballFlying) return;
  resumeAudioContext();
  tryStartBackgroundMusic();
  tryUnlockRainSound();
  const click = mouseWorldPos;
  dragging = true;
  pullSoundPlayed = false;
  activePointerId = e.pointerId;
  dragAnchor = { ...click };
  pullPos = { ...click };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  mouseOnCanvas = true;
  mouseWorldPos = pointerPos(e);
  if (!dragging || e.pointerId !== activePointerId) return;
  pullPos = clampPull(dragAnchor, mouseWorldPos);
  if (!pullSoundPlayed) {
    const dx = dragAnchor.x - pullPos.x;
    const dy = dragAnchor.y - pullPos.y;
    if (Math.hypot(dx, dy) >= gameConfig.pullSoundMinPull) {
      pullSoundPlayed = true;
      playSlingPullSound();
    }
  }
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
  playSlingReleaseSound();
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
  playPlayerLavaBurnSound();
}

function handleObstaclesInLava(): void {
  const events = updateObstaclesInLava();
  for (const event of events) {
    if (isNearVisibleWorldArea(event.x, event.y)) {
      playObstacleLavaBurnSound();
    }
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

  if (isBallGrounded() && isStandingOnIce(getPlatforms())) {
    ballFlying = false;
    flyingTime = 0;
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

    if (flyingTime >= gameConfig.maxGroundedFlightTime && onPlatform && !isStandingOnIce(getPlatforms())) {
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

function trySettleWhileSliding(frameDt: number): void {
  if (ballFlying || gameOver || playerInLava || dragging) return;
  if (isBallStatic()) return;
  if (!isBallGrounded()) {
    settleStableTime = 0;
    return;
  }
  if (isStandingOnIce(getPlatforms())) {
    settleStableTime = 0;
    return;
  }
  if (!canSettleOnCurrentSupport(getPlatforms())) {
    settleStableTime = 0;
    return;
  }
  if (!isStableOrientation(getBallAngle())) {
    nudgeUnstablePlayer();
    settleStableTime = 0;
    return;
  }
  if (!isBallSettled()) {
    settleStableTime = 0;
    return;
  }

  settleStableTime += frameDt;
  if (settleStableTime >= gameConfig.settleStableTime) {
    settle();
  }
}

function shouldCarryPlayerOnMovingPlatform(
  platformList: ReturnType<typeof getPlatforms>,
): boolean {
  if (gameOver || playerInLava) return false;
  return getCarrySupportPlatform(platformList) !== null;
}

function updateMovingPlatformsAndCarry(): void {
  const platforms = getPlatforms();
  const supportBeforeMove = shouldCarryPlayerOnMovingPlatform(platforms)
    ? getCarrySupportPlatform(platforms)
    : null;
  const supportId = supportBeforeMove?.id;

  const deltas = updateMovingPlatforms(platforms, animTime);
  if (deltas.size === 0) return;

  updatePlatformBodyPositions(platforms);
  translateObstaclesOnPlatforms(deltas);
  translateObstacleBodies(deltas);

  if (supportId === undefined) return;

  const deltaX = deltas.get(supportId);
  if (deltaX) {
    translatePlayerHorizontal(deltaX);
  }
}

function update(frameDt: number): void {
  if (paused) return;

  animTime += frameDt;
  updateDayNightPalette(frameDt);
  updateRain(frameDt, cameraZone.x, cameraZone.y, width, height, getPlatforms());
  updateLava(frameDt, climbHeightM);
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
  setSurfaceWet(isRainWet());
  updateSurfaceFriction(getPlatforms());
  stepPhysics(frameDt);
  trySettleWhileSliding(frameDt);
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

function normalizeGaze(x: number, y: number): Vec2Interface {
  const length = Math.hypot(x, y);
  if (length < 0.001) return { x: 0, y: -1 };
  return { x: x / length, y: y / length };
}

function playerEyeGaze(flying: boolean): PlayerEyeGazeInterface {
  if (flying) {
    const centered = { x: 0, y: 0 };
    return { left: centered, right: centered };
  }

  if (mouseOnCanvas && mouseWorldPos) {
    const pos = ballDisplayPos();
    const gaze = normalizeGaze(mouseWorldPos.x - pos.x, mouseWorldPos.y - pos.y);
    return { left: gaze, right: gaze };
  }

  const idle = { x: 0, y: -1 };
  return { left: idle, right: idle };
}

function dragShakeOffset(): Vec2Interface {
  if (!dragging) return { x: 0, y: 0 };

  const t = animTime;
  return {
    x: Math.sin(t * 52) > 0 ? 1 : -1,
    y: Math.cos(t * 47) > 0 ? 1 : -1,
  };
}

function drawPlayer(): void {
  const display = ballDisplayPos();
  const shake = dragShakeOffset();
  const size = gameConfig.ballRadius * 2;
  const angle = getBallAngle();
  const inLava = playerInLava;
  const flying = ballFlying && !gameOver;

  const squinting = dragging;
  const eyesOpen = squinting ? false : (flying || isPlayerEyesOpen(animTime));

  drawPixelCube(
    ctx,
    display.x,
    display.y,
    size,
    angle,
    inLava ? 'lava' : 'player',
    false,
    eyesOpen,
    inLava || squinting ? undefined : playerEyeGaze(flying),
    flying,
    shake.x,
    shake.y,
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

  drawRain(ctx);

  ctx.restore();

  displayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  displayCtx.imageSmoothingEnabled = false;
  displayCtx.clearRect(0, 0, width, height);
  displayCtx.drawImage(renderCanvas, 0, 0, width, height);

  if (gameConfig.showDeadZone) {
    const zone = deadZoneScreenBounds();
    displayCtx.strokeStyle = 'rgba(194, 229, 233, 0.55)';
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
