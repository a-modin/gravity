export interface LavaSplashConfigInterface {
  dropletCount: number;
  minRadius: number;
  maxRadius: number;
  minUpSpeed: number;
  maxUpSpeed: number;
  spreadAngle: number;
  impactSpeedScale: number;
  maxImpactBoost: number;
  gravity: number;
  airDrag: number;
  maxLifetime: number;
}

export interface LavaConfigInterface {
  startVisibleHeight: number;
  riseSpeed: number;
  waveAmplitude: number;
  waveFrequency: number;
  waveSpeed: number;
  surfaceColor: string;
  splash: LavaSplashConfigInterface;
}

export interface PlatformGeneratorConfigInterface {
  initialCount: number;
  lookAhead: number;
  cleanupBelow: number;
  minJumpGap: number;
  maxJumpGap: number;
  minClearance: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  minX: number;
  maxX: number;
  maxHorizontalReach: number;
  minHorizontalOffset: number;
  minHorizontalSeparation: number;
  maxVerticalOverlapRatio: number;
  branchesPerBand: number;
  placementAttempts: number;
  overlapMargin: number;
  fallbackJumpGapStep: number;
  reachabilityAngleSteps: number;
  placementReachabilityAngleSteps: number;
  reachabilityPowerRatios: number[];
  landingSurfaceTolerance: number;
  launchPointInset: number;
  movingPlatformsEnabled: boolean;
}

export interface ObstaclesConfigInterface {
  spawnChance: number;
  sizeScale: number;
  platformEdgeInset: number;
  maxCenterOffset: number;
  pyramidVariants: number[][];
  density: number;
  friction: number;
  frictionAir: number;
  restitution: number;
  stableSupportCenterRatio: number;
  supportSurfaceTolerance: number;
  fillColorTop: string;
  fillColorBottom: string;
  strokeColor: string;
}

export interface MovingPlatformsConfigInterface {
  spawnChance: number;
  minAmplitude: number;
  maxAmplitude: number;
  minSpeed: number;
  maxSpeed: number;
  boundsMinX: number;
  boundsMaxX: number;
}

export interface MilestoneConfigInterface {
  intervalM: number;
  lineColor: string;
  lineWidth: number;
  dash: number[];
  labelColor: string;
  labelOffsetY: number;
  hudPulseDurationMs: number;
  popupDurationMs: number;
}

export interface PixelArtConfigInterface {
  renderScale: number;
  snapUnit: number;
  tileSize: number;
  starParallax: number;
  starCell: number;
  lavaStep: number;
  starTwinkleSpeed: number;
  playerBlinkIntervalS: number;
  playerBlinkDurationS: number;
}

export interface GameConfigInterface {
  gravity: number;
  restitution: number;
  friction: number;
  ballRadius: number;
  launchPower: number;
  floorRatio: number;
  maxPull: number;
  pullBottomPadding: number;
  minLaunchPull: number;
  minMaxPull: number;
  settleVelocityY: number;
  settleVelocityX: number;
  settleAngularVelocity: number;
  settleStableTime: number;
  maxGroundedFlightTime: number;
  anchorRadius: number;
  grabRadiusMultiplier: number;
  physicsStep: number;
  trajectoryMaxSteps: number;
  maxPhysicsAccumulator: number;
  maxFrameDelta: number;
  cameraFocusRatio: number;
  cameraDeadZoneWidthRatio: number;
  cameraDeadZoneHeightRatio: number;
  lava: LavaConfigInterface;
  obstacles: ObstaclesConfigInterface;
  movingPlatforms: MovingPlatformsConfigInterface;
  gridParallax: number;
  gridStep: number;
  gridColor: string;
  gridLineWidth: number;
  showTrajectory: boolean;
  trajectoryUntilFirstCollision: boolean;
  showDeadZone: boolean;
  showPullLimit: boolean;
  settleDelay: number;
  platformGenerator: PlatformGeneratorConfigInterface;
  heightMetersScale: number;
  milestone: MilestoneConfigInterface;
  playerLaunchSpin: number;
  playerMaxAngularVelocity: number;
  playerStableAngleEpsilon: number;
  playerTipTorque: number;
  gameOverOverlayDelay: number;
  playerFlyingOpacity: number;
  playerIdlePulseSpeed: number;
  playerIdlePulseScale: number;
  playerGlowBlur: number;
  playerGlowColor: string;
  pixelArt: PixelArtConfigInterface;
}

export const gameConfig: GameConfigInterface = {
  gravity: 2000,
  restitution: 0.6,
  friction: 0.99,
  ballRadius: 24,
  launchPower: 14,
  floorRatio: 0.62,
  maxPull: 110,
  pullBottomPadding: 24,
  minLaunchPull: 8,
  minMaxPull: 40,
  settleVelocityY: 60,
  settleVelocityX: 30,
  settleAngularVelocity: 1.8,
  settleStableTime: 0.22,
  maxGroundedFlightTime: 2.5,
  anchorRadius: 6,
  grabRadiusMultiplier: 2,
  physicsStep: 1 / 120,
  trajectoryMaxSteps: 480,
  maxPhysicsAccumulator: 0.1,
  maxFrameDelta: 0.032,
  cameraFocusRatio: 0.55,
  cameraDeadZoneWidthRatio: 0.35,
  cameraDeadZoneHeightRatio: 0.25,
  lava: {
    startVisibleHeight: 90,
    riseSpeed: 50,
    waveAmplitude: 8,
    waveFrequency: 0.022,
    waveSpeed: 3.2,
    surfaceColor: '#ffb830',
    splash: {
      dropletCount: 14,
      minRadius: 7,
      maxRadius: 14,
      minUpSpeed: 280,
      maxUpSpeed: 520,
      spreadAngle: 0.62,
      impactSpeedScale: 0.45,
      maxImpactBoost: 220,
      gravity: 2100,
      airDrag: 0.992,
      maxLifetime: 2.2,
    },
  },
  obstacles: {
    spawnChance: 0.42,
    sizeScale: 0.5,
    platformEdgeInset: 6,
    maxCenterOffset: 24,
    pyramidVariants: [
      [3, 2, 1],
      [2, 2, 1],
      [2, 1],
    ],
    density: 0.0016,
    friction: 0.42,
    frictionAir: 0.01,
    restitution: 0.45,
    stableSupportCenterRatio: 0.55,
    supportSurfaceTolerance: 12,
    fillColorTop: '#c9a87a',
    fillColorBottom: '#5a4038',
    strokeColor: '#3d2a24',
  },
  movingPlatforms: {
    spawnChance: 0.28,
    minAmplitude: 36,
    maxAmplitude: 120,
    minSpeed: 0.55,
    maxSpeed: 1.15,
    boundsMinX: -480,
    boundsMaxX: 480,
  },
  gridParallax: 0.4,
  gridStep: 120,
  gridColor: 'rgba(42, 53, 80, 0.38)',
  gridLineWidth: 1,
  showTrajectory: true,
  trajectoryUntilFirstCollision: true,
  showDeadZone: false,
  showPullLimit: false,
  settleDelay: 0.15,
  platformGenerator: {
    initialCount: 7,
    lookAhead: 1100,
    cleanupBelow: 850,
    minJumpGap: 130,
    maxJumpGap: 295,
    minClearance: 55,
    minWidth: 140,
    maxWidth: 220,
    minHeight: 22,
    maxHeight: 28,
    minX: -480,
    maxX: 480,
    maxHorizontalReach: 340,
    minHorizontalOffset: 150,
    minHorizontalSeparation: 200,
    maxVerticalOverlapRatio: 0.25,
    branchesPerBand: 2,
    placementAttempts: 64,
    overlapMargin: 16,
    fallbackJumpGapStep: 6,
    reachabilityAngleSteps: 20,
    placementReachabilityAngleSteps: 10,
    reachabilityPowerRatios: [0.8, 1],
    landingSurfaceTolerance: 14,
    launchPointInset: 6,
    movingPlatformsEnabled: false,
  },
  heightMetersScale: 10,
  milestone: {
    intervalM: 100,
    lineColor: '#fff8ee',
    lineWidth: 2,
    dash: [8, 8],
    labelColor: '#ffd4a8',
    labelOffsetY: -6,
    hudPulseDurationMs: 450,
    popupDurationMs: 1100,
  },
  playerLaunchSpin: 0.0022,
  playerMaxAngularVelocity: 2.2,
  playerStableAngleEpsilon: 0.14,
  playerTipTorque: 2.8,
  gameOverOverlayDelay: 1,
  playerFlyingOpacity: 0.78,
  playerIdlePulseSpeed: 0.733,
  playerIdlePulseScale: 0.045,
  playerGlowBlur: 0,
  playerGlowColor: 'rgba(127, 208, 255, 0.55)',
  pixelArt: {
    renderScale: 0.25,
    snapUnit: 4,
    tileSize: 8,
    starParallax: 0.35,
    starCell: 56,
    lavaStep: 8,
    starTwinkleSpeed: 2.4,
    playerBlinkIntervalS: 3.6,
    playerBlinkDurationS: 0.12,
  },
};
