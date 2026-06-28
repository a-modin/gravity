import { pixelArtConfig } from './pixelArt.config';

export interface PlatformTypeVisualConfigInterface {
  top: string;
  topMoving: string;
  face: string;
  checker: string;
  shadow: string;
  edge: string;
  sparkleTop?: boolean;
}

export interface PlatformTypeConfigInterface {
  id: string;
  isDefault?: boolean;
  spawnChance?: number;
  friction: number;
  skipSettle?: boolean;
  visual: PlatformTypeVisualConfigInterface;
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

export interface MovingPlatformsConfigInterface {
  spawnChance: number;
  minAmplitude: number;
  maxAmplitude: number;
  minSpeed: number;
  maxSpeed: number;
  boundsMinX: number;
  boundsMaxX: number;
}

export const platformTypesConfig: PlatformTypeConfigInterface[] = [
  {
    id: 'ground',
    isDefault: true,
    friction: 0.45,
    visual: {
      top: '#e6f2f5',
      topMoving: '#f4fafc',
      face: '#a67c6a',
      checker: '#523242',
      shadow: '#3a2438',
      edge: '#b8d0d8',
    },
  },
  {
    id: 'ice',
    spawnChance: 0,
    friction: 0.01,
    skipSettle: true,
    visual: {
      top: '#eaf8ff',
      topMoving: '#f4fcff',
      face: '#c8e8f8',
      checker: '#9fd0ea',
      shadow: '#78a8c8',
      edge: '#dff4ff',
      sparkleTop: true,
    },
  },
];

export const platformGeneratorConfig: PlatformGeneratorConfigInterface = {
  initialCount: 7,
  lookAhead: 1100,
  cleanupBelow: 850,
  minJumpGap: 130,
  maxJumpGap: 295,
  minClearance: 55,
  minWidth: 140,
  maxWidth: 220,
  minHeight: pixelArtConfig.tileSize * 4,
  maxHeight: 84,
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
  movingPlatformsEnabled: true,
};

export const movingPlatformsConfig: MovingPlatformsConfigInterface = {
  spawnChance: 0.28,
  minAmplitude: 36,
  maxAmplitude: 120,
  minSpeed: 0.55,
  maxSpeed: 1.15,
  boundsMinX: -480,
  boundsMaxX: 480,
};
