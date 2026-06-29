import { isOnboardingActive } from './onboarding';
import { formatHeightMeters, onLocaleChange, t } from './i18n';
import { requestGameplaySessionSync } from './gameplaySession';
import { isStartScreenVisible } from './startScreen';
import { loadLeaderboard, onPlayerProfileChange } from './api';
import type { LeaderboardPlayerDtoInterface, PlayerProfileDtoInterface } from './api';

let overlayEl: HTMLDivElement | null = null;
let bodyEl: HTMLTableSectionElement | null = null;
let statusEl: HTMLParagraphElement | null = null;
let hudPlayerEl: HTMLDivElement | null = null;
let hudRecordEl: HTMLSpanElement | null = null;

let currentPlayer: PlayerProfileDtoInterface | null = null;
let isLoading = false;
let tabHeld = false;

function bindElements(): void {
  overlayEl = document.getElementById('leaderboard-overlay') as HTMLDivElement | null;
  bodyEl = document.getElementById('leaderboard-body') as HTMLTableSectionElement | null;
  statusEl = document.getElementById('leaderboard-status') as HTMLParagraphElement | null;
  hudPlayerEl = document.getElementById('hud-player') as HTMLDivElement | null;
  hudRecordEl = document.getElementById('hud-record') as HTMLSpanElement | null;
}

function isAuthOverlayOpen(): boolean {
  const authOverlay = document.getElementById('auth-overlay');
  return authOverlay !== null && !authOverlay.hidden;
}

function renderHudPlayer(player: PlayerProfileDtoInterface | null): void {
  if (!hudPlayerEl || !hudRecordEl) return;

  if (!player) {
    hudPlayerEl.hidden = true;
    return;
  }

  currentPlayer = player;
  hudPlayerEl.hidden = false;
  hudPlayerEl.textContent = player.username;
  hudRecordEl.textContent = `${t('hudBestScore')}: ${formatHeightMeters(player.bestScore)}`;
}

function renderRows(rows: LeaderboardPlayerDtoInterface[]): void {
  if (!bodyEl) return;

  const tableBody = bodyEl;
  tableBody.replaceChildren();

  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    if (currentPlayer && row.username === currentPlayer.username) {
      tr.className = 'is-current-player';
    }

    const rankCell = document.createElement('td');
    rankCell.textContent = String(index + 1);

    const nameCell = document.createElement('td');
    nameCell.textContent = row.username;

    const scoreCell = document.createElement('td');
    scoreCell.textContent = formatHeightMeters(row.bestScore);

    tr.append(rankCell, nameCell, scoreCell);
    tableBody.append(tr);
  });
}

function setStatus(message: string): void {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.hidden = message.length === 0;
}

function showTableLoading(): void {
  if (!bodyEl) return;

  bodyEl.replaceChildren();

  const row = document.createElement('tr');
  row.className = 'leaderboard-loading-row';

  const cell = document.createElement('td');
  cell.colSpan = 3;
  cell.textContent = t('leaderboardLoading');

  row.append(cell);
  bodyEl.append(row);
  setStatus('');
}

function showTableMessage(message: string): void {
  if (!bodyEl) return;

  bodyEl.replaceChildren();

  const row = document.createElement('tr');
  row.className = 'leaderboard-message-row';

  const cell = document.createElement('td');
  cell.colSpan = 3;
  cell.textContent = message;

  row.append(cell);
  bodyEl.append(row);
  setStatus('');
}

async function refreshLeaderboard(): Promise<void> {
  if (!overlayEl) return;

  if (isLoading) return;

  isLoading = true;
  showTableLoading();

  try {
    const rows = await loadLeaderboard();
    if (rows.length === 0) {
      showTableMessage(t('leaderboardEmpty'));
      return;
    }

    renderRows(rows);
    setStatus('');
  } catch (error) {
    const message = error instanceof Error ? error.message : t('leaderboardError');
    showTableMessage(message);
  } finally {
    isLoading = false;
  }
}

function openLeaderboard(): void {
  if (!overlayEl || !overlayEl.hidden) return;
  overlayEl.hidden = false;
  showTableLoading();
  requestGameplaySessionSync();
  void refreshLeaderboard();
}

function closeLeaderboard(): void {
  if (!overlayEl) return;
  overlayEl.hidden = true;
  requestGameplaySessionSync();
}

function handleTabDown(event: KeyboardEvent): void {
  if (event.key !== 'Tab' || isAuthOverlayOpen() || isStartScreenVisible() || isOnboardingActive()) return;

  event.preventDefault();
  event.stopPropagation();

  if (event.repeat) return;

  tabHeld = true;
  openLeaderboard();
}

function handleTabUp(event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  if (tabHeld || isLeaderboardOpen()) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!tabHeld) return;

  tabHeld = false;
  closeLeaderboard();
}

function handleWindowBlur(): void {
  if (!tabHeld) return;
  tabHeld = false;
  closeLeaderboard();
}

function applyStaticTexts(): void {
  const title = document.getElementById('leaderboard-title');
  const rank = document.getElementById('leaderboard-col-rank');
  const player = document.getElementById('leaderboard-col-player');
  const score = document.getElementById('leaderboard-col-score');

  if (title) title.textContent = t('leaderboardTitle');
  if (rank) rank.textContent = t('leaderboardRank');
  if (player) player.textContent = t('leaderboardPlayer');
  if (score) score.textContent = t('leaderboardScore');

  const authTitle = document.getElementById('auth-title');
  const authHint = document.getElementById('auth-hint');
  const authSubmit = document.getElementById('auth-sign-in');
  const authContinue = document.getElementById('auth-continue');

  if (authTitle) authTitle.textContent = t('authTitle');
  if (authHint) authHint.textContent = t('authHint');
  if (authSubmit) authSubmit.textContent = t('authSignIn');
  if (authContinue) authContinue.textContent = t('authContinue');

  renderHudPlayer(currentPlayer);
}

export function isLeaderboardOpen(): boolean {
  return overlayEl !== null && !overlayEl.hidden;
}

export function initLeaderboardPanel(): void {
  bindElements();
  applyStaticTexts();
  onLocaleChange(applyStaticTexts);
  onPlayerProfileChange(renderHudPlayer);

  window.addEventListener('keydown', handleTabDown, true);
  window.addEventListener('keyup', handleTabUp, true);
  window.addEventListener('blur', handleWindowBlur);
}
