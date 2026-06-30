import { apiConfig } from './config/api.config';
import { formatHeightMeters } from './i18n';
import { getPlayerProfile, isAuthenticated, loadLeaderboard, onPlayerProfileChange } from './api';
import type { LeaderboardPlayerDtoInterface, PlayerProfileDtoInterface } from './api';

interface HudLeaderboardRowInterface {
  type: 'row';
  rank: number;
  username: string;
  bestScore: number;
  isCurrent: boolean;
}

interface HudLeaderboardEllipsisInterface {
  type: 'ellipsis';
}

type HudLeaderboardEntryInterface = HudLeaderboardRowInterface | HudLeaderboardEllipsisInterface;

const TOP_ROWS = 3;
const MAX_PLAYER_ROWS = 5;

let containerEl: HTMLDivElement | null = null;
let refreshTimer = 0;
let liveScore = 0;
let refreshInFlight = false;
let cachedRows: LeaderboardPlayerDtoInterface[] = [];

function bindElements(): void {
  containerEl = document.getElementById('hud-leaderboard') as HTMLDivElement | null;
}

function mergePlayerIntoLeaderboard(
  rows: LeaderboardPlayerDtoInterface[],
  player: PlayerProfileDtoInterface,
  sessionScore: number,
): LeaderboardPlayerDtoInterface[] {
  const score = Math.max(player.bestScore, sessionScore);
  const merged = rows.filter((row) => row.username !== player.username);
  merged.push({ username: player.username, bestScore: score });
  merged.sort((left, right) => right.bestScore - left.bestScore);
  return merged;
}

function toRowEntry(
  rows: LeaderboardPlayerDtoInterface[],
  index: number,
  username: string,
): HudLeaderboardRowInterface {
  const row = rows[index];
  return {
    type: 'row',
    rank: index + 1,
    username: row.username,
    bestScore: row.bestScore,
    isCurrent: row.username === username,
  };
}

function buildHudEntries(
  rows: LeaderboardPlayerDtoInterface[],
  username: string,
): HudLeaderboardEntryInterface[] {
  const playerIndex = rows.findIndex((row) => row.username === username);
  if (playerIndex === -1 || rows.length === 0) return [];

  const entries: HudLeaderboardEntryInterface[] = [];
  const topCount = Math.min(TOP_ROWS, rows.length);

  for (let index = 0; index < topCount; index++) {
    entries.push(toRowEntry(rows, index, username));
  }

  if (rows.length <= TOP_ROWS) return entries;

  const tailSlots = MAX_PLAYER_ROWS - topCount;
  let tailStart: number;
  let tailEnd: number;

  if (playerIndex < TOP_ROWS) {
    tailStart = TOP_ROWS;
    tailEnd = Math.min(rows.length, TOP_ROWS + tailSlots);
  } else {
    tailEnd = Math.min(rows.length, playerIndex + 1);
    tailStart = Math.max(TOP_ROWS, tailEnd - tailSlots);
    if (tailEnd - tailStart < tailSlots) {
      tailEnd = Math.min(rows.length, tailStart + tailSlots);
    }
  }

  if (tailStart > TOP_ROWS) {
    entries.push({ type: 'ellipsis' });
  }

  for (let index = tailStart; index < tailEnd; index++) {
    entries.push(toRowEntry(rows, index, username));
  }

  return entries;
}

function renderHudEntries(entries: HudLeaderboardEntryInterface[]): void {
  if (!containerEl) return;

  if (entries.length === 0) {
    containerEl.hidden = true;
    containerEl.replaceChildren();
    return;
  }

  containerEl.hidden = false;
  containerEl.replaceChildren();

  for (const entry of entries) {
    if (entry.type === 'ellipsis') {
      const ellipsisEl = document.createElement('div');
      ellipsisEl.className = 'hud-leaderboard-ellipsis';
      ellipsisEl.textContent = '...';
      containerEl.append(ellipsisEl);
      continue;
    }

    const rowEl = document.createElement('div');
    rowEl.className = entry.isCurrent ? 'hud-leaderboard-row is-current' : 'hud-leaderboard-row';

    const rankEl = document.createElement('span');
    rankEl.className = 'hud-leaderboard-rank';
    rankEl.textContent = String(entry.rank);

    const nameEl = document.createElement('span');
    nameEl.className = 'hud-leaderboard-name';
    nameEl.textContent = entry.username;

    const scoreEl = document.createElement('span');
    scoreEl.className = 'hud-leaderboard-score';
    scoreEl.textContent = formatHeightMeters(entry.bestScore);

    rowEl.append(rankEl, nameEl, scoreEl);
    containerEl.append(rowEl);
  }
}

function buildPublicHudEntries(rows: LeaderboardPlayerDtoInterface[]): HudLeaderboardEntryInterface[] {
  const topCount = Math.min(TOP_ROWS, rows.length);
  const entries: HudLeaderboardEntryInterface[] = [];

  for (let index = 0; index < topCount; index++) {
    const row = rows[index];
    entries.push({
      type: 'row',
      rank: index + 1,
      username: row.username,
      bestScore: row.bestScore,
      isCurrent: false,
    });
  }

  return entries;
}

function renderFromCache(): void {
  if (cachedRows.length === 0) {
    renderHudEntries([]);
    return;
  }

  const player = isAuthenticated() ? getPlayerProfile() : null;
  if (!player) {
    renderHudEntries(buildPublicHudEntries(cachedRows));
    return;
  }

  const merged = mergePlayerIntoLeaderboard(cachedRows, player, liveScore);
  renderHudEntries(buildHudEntries(merged, player.username));
}

export async function refreshHudLeaderboard(): Promise<void> {
  if (!containerEl) return;

  if (refreshInFlight) return;
  refreshInFlight = true;

  try {
    cachedRows = await loadLeaderboard();
  } catch (error) {
    cachedRows = [];
    console.warn('Failed to load leaderboard', error);
  } finally {
    refreshInFlight = false;
    renderFromCache();
  }
}

export function setHudLeaderboardLiveScore(score: number): void {
  const nextScore = Math.max(0, Math.round(score));
  if (nextScore === liveScore) return;
  liveScore = nextScore;
  renderFromCache();
}

export function tickHudLeaderboard(frameDt: number): void {
  refreshTimer += frameDt;
  if (refreshTimer < apiConfig.hudLeaderboardRefreshS) return;

  refreshTimer = 0;
  void refreshHudLeaderboard();
}

export function initHudLeaderboard(): void {
  bindElements();
  onPlayerProfileChange(() => {
    void refreshHudLeaderboard();
    renderFromCache();
  });
  void refreshHudLeaderboard();
}
