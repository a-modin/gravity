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
  playerDoubleBlinkChance: number;
  playerDoubleBlinkGapS: number;
}

export const pixelArtConfig: PixelArtConfigInterface = {
  renderScale: 0.25,
  snapUnit: 4,
  tileSize: 8,
  starParallax: 0.35,
  starCell: 56,
  lavaStep: 8,
  starTwinkleSpeed: 2.4,
  playerBlinkIntervalS: 3.6,
  playerBlinkDurationS: 0.12,
  playerDoubleBlinkChance: 0.28,
  playerDoubleBlinkGapS: 0.07,
};
