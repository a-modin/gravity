export interface LeaderboardPlayerDtoInterface {
  username: string;
  bestScore: number;
}

export interface AuthDtoInterface {
  crazyGamesToken: string;
}

export interface PlayerProfileDtoInterface {
  id: string;
  crazyGamesId: string;
  username: string;
  bestScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseDtoInterface {
  accessToken: string;
  player: PlayerProfileDtoInterface;
}

export interface UpdateScoreDtoInterface {
  score: number;
}
