export interface ObstaclesConfigInterface {
  enabled: boolean;
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

export const obstaclesConfig: ObstaclesConfigInterface = {
  enabled: true,
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
  fillColorTop: '#e6f2f5',
  fillColorBottom: '#523242',
  strokeColor: '#3a2438',
};
