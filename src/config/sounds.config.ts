export interface ImpactSoundConfigInterface {
  minImpactSpeed: number;
  maxImpactSpeed: number;
  minVolumeRatio: number;
}

export const platformHitSoundConfig: ImpactSoundConfigInterface = {
  minImpactSpeed: 60,
  maxImpactSpeed: 560,
  minVolumeRatio: 0.3,
};

export const obstacleHitSoundConfig: ImpactSoundConfigInterface = {
  minImpactSpeed: 50,
  maxImpactSpeed: 480,
  minVolumeRatio: 0.3,
};

export const obstacleDropSoundConfig: ImpactSoundConfigInterface = {
  minImpactSpeed: 35,
  maxImpactSpeed: 300,
  minVolumeRatio: 0.25,
};
