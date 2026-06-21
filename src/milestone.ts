import { gameConfig } from './config';

export function milestoneWorldY(baselineY: number, heightM: number): number {
  return baselineY - heightM * gameConfig.heightMetersScale;
}

export function milestoneHeightsInRange(
  baselineY: number,
  topWorldY: number,
  bottomWorldY: number,
): number[] {
  const { intervalM } = gameConfig.milestone;
  const scale = gameConfig.heightMetersScale;
  const maxM = Math.max(intervalM, Math.ceil((baselineY - topWorldY) / scale));
  const minM = Math.max(0, Math.floor((baselineY - bottomWorldY) / scale));
  const heights: number[] = [];
  const start = Math.max(intervalM, Math.ceil(minM / intervalM) * intervalM);

  for (let meters = start; meters <= maxM; meters += intervalM) {
    heights.push(meters);
  }

  return heights;
}

export function drawMilestones(
  ctx: CanvasRenderingContext2D,
  baselineY: number,
  cameraX: number,
  viewWidth: number,
  topWorldY: number,
  bottomWorldY: number,
): void {
  const { lineColor, lineWidth, dash, labelColor, labelOffsetY } = gameConfig.milestone;
  const left = cameraX - viewWidth * 2;
  const right = cameraX + viewWidth * 2;
  const labelX = right - viewWidth + 18;
  const heightsM = milestoneHeightsInRange(baselineY, topWorldY, bottomWorldY);

  ctx.save();
  ctx.font = `600 12px "Press Start 2P", monospace`;
  ctx.fillStyle = labelColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);

  for (const heightM of heightsM) {
    const y = milestoneWorldY(baselineY, heightM);

    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    ctx.fillText(`${heightM} m`, labelX, y + labelOffsetY);
  }

  ctx.setLineDash([]);
  ctx.restore();
}
