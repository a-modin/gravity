export interface MilestoneConfigInterface {
  intervalM: number;
  lineColor: string;
  lineWidth: number;
  dash: number[];
  labelColor: string;
  labelOffsetY: number;
  hudPulseDurationMs: number;
  popupDurationMs: number;
}

export const milestoneConfig: MilestoneConfigInterface = {
  intervalM: 100,
  lineColor: '#c2e5e9',
  lineWidth: 2,
  dash: [8, 8],
  labelColor: '#a8c0c9',
  labelOffsetY: -6,
  hudPulseDurationMs: 450,
  popupDurationMs: 1100,
};
