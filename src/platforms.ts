export interface PlatformMotionInterface {
  anchorX: number;
  amplitude: number;
  speed: number;
  phase: number;
}

export interface PlatformInterface {
  id?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  typeId?: string;
  motion?: PlatformMotionInterface;
}

export const startPlatform: PlatformInterface = {
  id: 0,
  x: -140,
  y: -36,
  width: 280,
  height: 36,
};

export function startBallPosition(ballRadius: number): { x: number; y: number } {
  return {
    x: startPlatform.x + startPlatform.width / 2,
    y: startPlatform.y - ballRadius,
  };
}
