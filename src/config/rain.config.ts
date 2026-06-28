export interface RainConfigInterface {
  spawnRate: number;
  maxMainDrops: number;
  fallSpeed: number;
  windSpeed: number;
  dropLengthMin: number;
  dropLengthMax: number;
  dropThickness: number;
  gravity: number;
  opacity: number;
  splashCountMin: number;
  splashCountMax: number;
  splashUpSpeedMin: number;
  splashUpSpeedMax: number;
  splashHorizontalSpeed: number;
  splashLifetime: number;
  splashSize: number;
  soundVolume: number;
  activeTimeFraction: number;
  activeDurationMin: number;
  activeDurationMax: number;
  inactiveDurationMin: number;
  inactiveDurationMax: number;
  wetSurfaceFriction: number;
}

export const rainConfig: RainConfigInterface = {
  spawnRate: 240,
  maxMainDrops: 110,
  fallSpeed: 520,
  windSpeed: 20,
  dropLengthMin: 5,
  dropLengthMax: 10,
  dropThickness: 2,
  gravity: 1500,
  opacity: 1,
  splashCountMin: 3,
  splashCountMax: 5,
  splashUpSpeedMin: 90,
  splashUpSpeedMax: 200,
  splashHorizontalSpeed: 70,
  splashLifetime: 0.5,
  splashSize: 4,
  soundVolume: 0.9,
  activeTimeFraction: 0.3,
  activeDurationMin: 25,
  activeDurationMax: 55,
  inactiveDurationMin: 70,
  inactiveDurationMax: 115,
  wetSurfaceFriction: 0.05,
};
