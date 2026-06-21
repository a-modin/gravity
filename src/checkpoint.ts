import {
  snapshotPlatformGenerator,
  restorePlatformGenerator,
  type PlatformGeneratorSnapshotInterface,
} from './platformGenerator';
import {
  getNextObstacleId,
  replaceObstacles,
  type ObstacleInterface,
} from './obstacles';
import { getLavaState, setLavaState, type LavaStateInterface } from './lava';
import {
  enablePlayerCollisions,
  getBallAngle,
  getBallPosition,
  getObstaclePhysicsSnapshots,
  resetGamePhysics,
  setBallAtRest,
  applyObstaclePhysicsSnapshots,
  type ObstaclePhysicsSnapshotInterface,
  type Vec2Interface,
} from './physics';

export interface ClimbCheckpointInterface {
  heightBaselineY: number;
  peakBallY: number;
  climbHeightM: number;
  lastMilestonePassedM: number;
}

export interface GameCheckpointInterface {
  player: Vec2Interface & { angle: number };
  camera: Vec2Interface;
  lava: LavaStateInterface;
  climb: ClimbCheckpointInterface;
  platformGenerator: PlatformGeneratorSnapshotInterface;
  obstacles: ObstaclePhysicsSnapshotInterface[];
  nextObstacleId: number;
}

export interface CheckpointCaptureContextInterface {
  camera: Vec2Interface;
  climb: ClimbCheckpointInterface;
}

export function captureCheckpoint(context: CheckpointCaptureContextInterface): GameCheckpointInterface {
  return {
    player: {
      ...getBallPosition(),
      angle: getBallAngle(),
    },
    camera: { ...context.camera },
    lava: getLavaState(),
    climb: { ...context.climb },
    platformGenerator: snapshotPlatformGenerator(),
    obstacles: getObstaclePhysicsSnapshots(),
    nextObstacleId: getNextObstacleId(),
  };
}

export function restoreCheckpoint(
  checkpoint: GameCheckpointInterface,
): { climb: ClimbCheckpointInterface; camera: Vec2Interface } {
  restorePlatformGenerator(checkpoint.platformGenerator);

  const obstacleList: ObstacleInterface[] = checkpoint.obstacles.map((snapshot) => ({
    id: snapshot.id,
    x: snapshot.x,
    y: snapshot.y,
    size: snapshot.size,
    platformY: snapshot.platformY,
    platformId: snapshot.platformId,
  }));

  replaceObstacles(obstacleList, checkpoint.nextObstacleId);
  resetGamePhysics(checkpoint.platformGenerator.platforms, obstacleList);
  applyObstaclePhysicsSnapshots(checkpoint.obstacles);
  setBallAtRest(checkpoint.player, checkpoint.player.angle);
  setLavaState(checkpoint.lava);
  enablePlayerCollisions();

  return {
    climb: { ...checkpoint.climb },
    camera: { ...checkpoint.camera },
  };
}

export function hasCheckpoint(checkpoint: GameCheckpointInterface | null): checkpoint is GameCheckpointInterface {
  return checkpoint !== null;
}
