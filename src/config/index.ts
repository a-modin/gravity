import { coreConfig, type CoreConfigInterface } from './core.config';
import { lavaConfig, type LavaConfigInterface } from './lava.config';
import { obstaclesConfig, type ObstaclesConfigInterface } from './obstacles.config';
import {
  movingPlatformsConfig,
  platformGeneratorConfig,
  platformTypesConfig,
  type MovingPlatformsConfigInterface,
  type PlatformGeneratorConfigInterface,
  type PlatformTypeConfigInterface,
} from './platforms.config';
import { milestoneConfig, type MilestoneConfigInterface } from './milestone.config';
import { pixelArtConfig, type PixelArtConfigInterface } from './pixelArt.config';
import { rainConfig, type RainConfigInterface } from './rain.config';
import {
  obstacleDropSoundConfig,
  obstacleHitSoundConfig,
  platformHitSoundConfig,
  type ImpactSoundConfigInterface,
} from './sounds.config';

export type { CoreConfigInterface } from './core.config';
export type { LavaConfigInterface, LavaSplashConfigInterface } from './lava.config';
export type { ObstaclesConfigInterface } from './obstacles.config';
export type {
  MovingPlatformsConfigInterface,
  PlatformGeneratorConfigInterface,
  PlatformTypeConfigInterface,
  PlatformTypeVisualConfigInterface,
} from './platforms.config';
export type { MilestoneConfigInterface } from './milestone.config';
export type { PixelArtConfigInterface } from './pixelArt.config';
export type { RainConfigInterface } from './rain.config';
export type { ImpactSoundConfigInterface } from './sounds.config';

export { rainConfig } from './rain.config';

export interface GameConfigInterface extends CoreConfigInterface {
  lava: LavaConfigInterface;
  obstacles: ObstaclesConfigInterface;
  movingPlatforms: MovingPlatformsConfigInterface;
  platformGenerator: PlatformGeneratorConfigInterface;
  platformTypes: PlatformTypeConfigInterface[];
  milestone: MilestoneConfigInterface;
  pixelArt: PixelArtConfigInterface;
  rain: RainConfigInterface;
  platformHitSound: ImpactSoundConfigInterface;
  obstacleHitSound: ImpactSoundConfigInterface;
  obstacleDropSound: ImpactSoundConfigInterface;
}

export const gameConfig: GameConfigInterface = {
  ...coreConfig,
  lava: lavaConfig,
  obstacles: obstaclesConfig,
  movingPlatforms: movingPlatformsConfig,
  platformTypes: platformTypesConfig,
  platformGenerator: platformGeneratorConfig,
  milestone: milestoneConfig,
  pixelArt: pixelArtConfig,
  rain: rainConfig,
  platformHitSound: platformHitSoundConfig,
  obstacleHitSound: obstacleHitSoundConfig,
  obstacleDropSound: obstacleDropSoundConfig,
};
