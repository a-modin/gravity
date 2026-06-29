export interface ApiConfigInterface {
  baseUrl: string;
  scoreSyncIntervalS: number;
  hudLeaderboardRefreshS: number;
}

export const apiConfig: ApiConfigInterface = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'https://gravity-backend-fh0m.onrender.com',
  scoreSyncIntervalS: 5,
  hudLeaderboardRefreshS: 15,
};
