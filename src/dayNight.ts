import type { PlatformTypeVisualConfigInterface } from './config';
import { formatDayNightPhaseLabel } from './i18n';

export interface GamePaletteInterface {
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  skyBottom: string;
  star: string;
  starDim: string;
  player: string;
  playerShadow: string;
  playerHighlight: string;
  playerEyeWhite: string;
  playerPupil: string;
  playerEyes: string;
  playerDim: string;
  milestone: string;
}

export interface DayNightStateInterface {
  palette: GamePaletteInterface;
  groundVisual: PlatformTypeVisualConfigInterface;
  iceVisual: PlatformTypeVisualConfigInterface;
  starOpacity: number;
  milestoneLine: string;
  milestoneLabel: string;
}

interface DayNightKeyframeInterface {
  hour: number;
  palette: GamePaletteInterface;
  groundVisual: PlatformTypeVisualConfigInterface;
  iceVisual: PlatformTypeVisualConfigInterface;
  starOpacity: number;
  milestoneLine: string;
  milestoneLabel: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerpColor(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const mix = Math.max(0, Math.min(1, t));
  const r = Math.round(a.r + (b.r - a.r) * mix);
  const g = Math.round(a.g + (b.g - a.g) * mix);
  const bl = Math.round(a.b + (b.b - a.b) * mix);
  return `rgb(${r}, ${g}, ${bl})`;
}

function lerpNumber(from: number, to: number, t: number): number {
  return from + (to - from) * Math.max(0, Math.min(1, t));
}

function lerpPlatformVisual(
  from: PlatformTypeVisualConfigInterface,
  to: PlatformTypeVisualConfigInterface,
  t: number,
): PlatformTypeVisualConfigInterface {
  return {
    top: lerpColor(from.top, to.top, t),
    topMoving: lerpColor(from.topMoving, to.topMoving, t),
    face: lerpColor(from.face, to.face, t),
    checker: lerpColor(from.checker, to.checker, t),
    shadow: lerpColor(from.shadow, to.shadow, t),
    edge: lerpColor(from.edge, to.edge, t),
    sparkleTop: t < 0.5 ? from.sparkleTop : to.sparkleTop,
  };
}

function lerpPalette(from: GamePaletteInterface, to: GamePaletteInterface, t: number): GamePaletteInterface {
  return {
    skyTop: lerpColor(from.skyTop, to.skyTop, t),
    skyMid: lerpColor(from.skyMid, to.skyMid, t),
    skyHorizon: lerpColor(from.skyHorizon, to.skyHorizon, t),
    skyBottom: lerpColor(from.skyBottom, to.skyBottom, t),
    star: lerpColor(from.star, to.star, t),
    starDim: lerpColor(from.starDim, to.starDim, t),
    player: lerpColor(from.player, to.player, t),
    playerShadow: lerpColor(from.playerShadow, to.playerShadow, t),
    playerHighlight: lerpColor(from.playerHighlight, to.playerHighlight, t),
    playerEyeWhite: lerpColor(from.playerEyeWhite, to.playerEyeWhite, t),
    playerPupil: lerpColor(from.playerPupil, to.playerPupil, t),
    playerEyes: lerpColor(from.playerEyes, to.playerEyes, t),
    playerDim: lerpColor(from.playerDim, to.playerDim, t),
    milestone: lerpColor(from.milestone, to.milestone, t),
  };
}

const GROUND_DAY: PlatformTypeVisualConfigInterface = {
  top: '#e6f2f5',
  topMoving: '#f4fafc',
  face: '#a67c6a',
  checker: '#523242',
  shadow: '#3a2438',
  edge: '#b8d0d8',
};

const ICE_DAY: PlatformTypeVisualConfigInterface = {
  top: '#eaf8ff',
  topMoving: '#f4fcff',
  face: '#c8e8f8',
  checker: '#9fd0ea',
  shadow: '#78a8c8',
  edge: '#dff4ff',
  sparkleTop: true,
};

const KEYFRAMES: DayNightKeyframeInterface[] = [
  {
    hour: 0,
    palette: {
      skyTop: '#141c30',
      skyMid: '#1e2840',
      skyHorizon: '#2a3050',
      skyBottom: '#343858',
      star: '#e8f0ff',
      starDim: '#98a8c8',
      player: '#88a8b8',
      playerShadow: '#3a5060',
      playerHighlight: '#b8d8e8',
      playerEyeWhite: '#dce8f0',
      playerPupil: '#1a2430',
      playerEyes: '#1a2430',
      playerDim: '#688898',
      milestone: '#88a0b0',
    },
    groundVisual: {
      top: '#a8b8c8',
      topMoving: '#b8c8d8',
      face: '#6a5048',
      checker: '#3a2838',
      shadow: '#281820',
      edge: '#8898a8',
    },
    iceVisual: {
      top: '#b0c0d0',
      topMoving: '#c0d0e0',
      face: '#88a0b8',
      checker: '#6888a0',
      shadow: '#506878',
      edge: '#a0b8c8',
    },
    starOpacity: 1,
    milestoneLine: '#88a0b0',
    milestoneLabel: '#788898',
  },
  {
    hour: 5,
    palette: {
      skyTop: '#4a5880',
      skyMid: '#c89088',
      skyHorizon: '#ffb070',
      skyBottom: '#f0d8c8',
      star: '#fff0e8',
      starDim: '#c8a898',
      player: '#b8d8e0',
      playerShadow: '#6a8898',
      playerHighlight: '#f0fcff',
      playerEyeWhite: '#f8fcff',
      playerPupil: '#2e3a48',
      playerEyes: '#2e3a48',
      playerDim: '#98b8c0',
      milestone: '#d8e8f0',
    },
    groundVisual: {
      top: '#f0e8e0',
      topMoving: '#f8f0e8',
      face: '#b08070',
      checker: '#684848',
      shadow: '#483038',
      edge: '#d0c0b8',
    },
    iceVisual: {
      top: '#f0f8ff',
      topMoving: '#f8fcff',
      face: '#d8e8f8',
      checker: '#b0d0e8',
      shadow: '#88a8c8',
      edge: '#e8f4ff',
      sparkleTop: true,
    },
    starOpacity: 0.25,
    milestoneLine: '#e8f0f8',
    milestoneLabel: '#c8d8e0',
  },
  {
    hour: 8,
    palette: {
      skyTop: '#7a88a0',
      skyMid: '#b8a8c8',
      skyHorizon: '#d8d0dc',
      skyBottom: '#e8e4ea',
      star: '#e6f2f5',
      starDim: '#a8b8c8',
      player: '#c2e5e9',
      playerShadow: '#6a98a8',
      playerHighlight: '#eefafc',
      playerEyeWhite: '#f4fafc',
      playerPupil: '#2e3a48',
      playerEyes: '#2e3a48',
      playerDim: '#8ab4c0',
      milestone: '#c2e5e9',
    },
    groundVisual: GROUND_DAY,
    iceVisual: ICE_DAY,
    starOpacity: 0,
    milestoneLine: '#c2e5e9',
    milestoneLabel: '#a8c0c9',
  },
  {
    hour: 12,
    palette: {
      skyTop: '#8a96a8',
      skyMid: '#b2a9c1',
      skyHorizon: '#c8d4dc',
      skyBottom: '#dcd9e1',
      star: '#e6f2f5',
      starDim: '#a8c0c9',
      player: '#c2e5e9',
      playerShadow: '#6a98a8',
      playerHighlight: '#eefafc',
      playerEyeWhite: '#f4fafc',
      playerPupil: '#2e3a48',
      playerEyes: '#2e3a48',
      playerDim: '#8ab4c0',
      milestone: '#c2e5e9',
    },
    groundVisual: GROUND_DAY,
    iceVisual: ICE_DAY,
    starOpacity: 0,
    milestoneLine: '#c2e5e9',
    milestoneLabel: '#a8c0c9',
  },
  {
    hour: 17,
    palette: {
      skyTop: '#8898b0',
      skyMid: '#c0a8b8',
      skyHorizon: '#e8c8b0',
      skyBottom: '#e8dcd4',
      star: '#f0f8ff',
      starDim: '#b0b8c8',
      player: '#d0eef0',
      playerShadow: '#7098a0',
      playerHighlight: '#f8ffff',
      playerEyeWhite: '#fcffff',
      playerPupil: '#2e3a48',
      playerEyes: '#2e3a48',
      playerDim: '#98c0c8',
      milestone: '#d8eef0',
    },
    groundVisual: {
      top: '#f0f4f5',
      topMoving: '#f8fcfc',
      face: '#b08068',
      checker: '#5a3840',
      shadow: '#402830',
      edge: '#c8d8dc',
    },
    iceVisual: ICE_DAY,
    starOpacity: 0,
    milestoneLine: '#d8eef0',
    milestoneLabel: '#b8c8d0',
  },
  {
    hour: 20,
    palette: {
      skyTop: '#4a4878',
      skyMid: '#a87088',
      skyHorizon: '#f08858',
      skyBottom: '#d8a898',
      star: '#ffe8d8',
      starDim: '#c89888',
      player: '#a8d0d8',
      playerShadow: '#588088',
      playerHighlight: '#e0f8fc',
      playerEyeWhite: '#f0fafc',
      playerPupil: '#243038',
      playerEyes: '#243038',
      playerDim: '#78a0a8',
      milestone: '#c8e0e8',
    },
    groundVisual: {
      top: '#d8d0d0',
      topMoving: '#e8e0e0',
      face: '#886058',
      checker: '#483038',
      shadow: '#302020',
      edge: '#a8a0a0',
    },
    iceVisual: {
      top: '#d8e8f0',
      topMoving: '#e8f4f8',
      face: '#a8c0d0',
      checker: '#7898b0',
      shadow: '#587088',
      edge: '#c8dce8',
    },
    starOpacity: 0.45,
    milestoneLine: '#c8e0e8',
    milestoneLabel: '#a8b8c0',
  },
  {
    hour: 24,
    palette: {
      skyTop: '#141c30',
      skyMid: '#1e2840',
      skyHorizon: '#2a3050',
      skyBottom: '#343858',
      star: '#e8f0ff',
      starDim: '#98a8c8',
      player: '#88a8b8',
      playerShadow: '#3a5060',
      playerHighlight: '#b8d8e8',
      playerEyeWhite: '#dce8f0',
      playerPupil: '#1a2430',
      playerEyes: '#1a2430',
      playerDim: '#688898',
      milestone: '#88a0b0',
    },
    groundVisual: {
      top: '#a8b8c8',
      topMoving: '#b8c8d8',
      face: '#6a5048',
      checker: '#3a2838',
      shadow: '#281820',
      edge: '#8898a8',
    },
    iceVisual: {
      top: '#b0c0d0',
      topMoving: '#c0d0e0',
      face: '#88a0b8',
      checker: '#6888a0',
      shadow: '#506878',
      edge: '#a0b8c8',
    },
    starOpacity: 1,
    milestoneLine: '#88a0b0',
    milestoneLabel: '#788898',
  },
];

export function computeDayNightState(hour: number): DayNightStateInterface {
  const normalized = ((hour % 24) + 24) % 24;
  let from = KEYFRAMES[0];
  let to = KEYFRAMES[1];

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (normalized >= KEYFRAMES[i].hour && normalized < KEYFRAMES[i + 1].hour) {
      from = KEYFRAMES[i];
      to = KEYFRAMES[i + 1];
      break;
    }
  }

  const span = to.hour - from.hour;
  const t = span > 0 ? (normalized - from.hour) / span : 0;

  return {
    palette: lerpPalette(from.palette, to.palette, t),
    groundVisual: lerpPlatformVisual(from.groundVisual, to.groundVisual, t),
    iceVisual: lerpPlatformVisual(from.iceVisual, to.iceVisual, t),
    starOpacity: lerpNumber(from.starOpacity, to.starOpacity, t),
    milestoneLine: lerpColor(from.milestoneLine, to.milestoneLine, t),
    milestoneLabel: lerpColor(from.milestoneLabel, to.milestoneLabel, t),
  };
}

export function formatDayNightHour(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function dayNightPhaseLabel(hour: number): string {
  return formatDayNightPhaseLabel(hour);
}

export const DAY_NIGHT_DEFAULT_HOUR = 13;
const DAY_NIGHT_STORAGE_KEY = 'gravity-day-night-hour';

export function normalizeDayHour(hour: number): number {
  return ((hour % 24) + 24) % 24;
}

export function loadStoredDayHour(): number {
  try {
    const stored = localStorage.getItem(DAY_NIGHT_STORAGE_KEY);
    if (stored === null) return DAY_NIGHT_DEFAULT_HOUR;

    const hour = Number(stored);
    if (!Number.isFinite(hour)) return DAY_NIGHT_DEFAULT_HOUR;
    return normalizeDayHour(hour);
  } catch {
    return DAY_NIGHT_DEFAULT_HOUR;
  }
}

export function saveStoredDayHour(hour: number): void {
  try {
    localStorage.setItem(DAY_NIGHT_STORAGE_KEY, String(normalizeDayHour(hour)));
  } catch {
    // ignore storage errors
  }
}
