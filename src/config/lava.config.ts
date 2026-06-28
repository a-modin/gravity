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
  fineDropletCount: number;
  fineMinRadius: number;
  fineMaxRadius: number;
  fineMinUpSpeed: number;
  fineMaxUpSpeed: number;
  fineSpreadAngle: number;
}

export interface LavaConfigInterface {
  startVisibleHeight: number;
  minRiseSpeed: number;
  maxRiseSpeed: number;
  fullSpeedAtHeightM: number;
  waveAmplitude: number;
  waveFrequency: number;
  waveSpeed: number;
  surfaceColor: string;
  splash: LavaSplashConfigInterface;
}

export const lavaConfig: LavaConfigInterface = {
  startVisibleHeight: 90,
  minRiseSpeed: 30,
  maxRiseSpeed: 60,
  fullSpeedAtHeightM: 350,
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
    fineDropletCount: 12,
    fineMinRadius: 2,
    fineMaxRadius: 5,
    fineMinUpSpeed: 700,
    fineMaxUpSpeed: 1400,
    fineSpreadAngle: 0.18,
  },
};
