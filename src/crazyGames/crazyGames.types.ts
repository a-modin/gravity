export type CrazyGamesEnvironmentEnum = 'local' | 'crazygames' | 'disabled';

export interface CrazyGamesUserInterface {
  __dangerousUserId: string;
  username: string;
  profilePictureUrl: string;
}

export interface CrazyGamesUserModuleInterface {
  isUserAccountAvailable: boolean;
  getUser(): Promise<CrazyGamesUserInterface | null>;
  getUserToken(): Promise<string>;
  showAuthPrompt(): Promise<CrazyGamesUserInterface>;
  addAuthListener(listener: (user: CrazyGamesUserInterface) => void): void;
  removeAuthListener(listener: (user: CrazyGamesUserInterface) => void): void;
}

export interface CrazyGamesGameModuleInterface {
  gameplayStart(): Promise<void>;
  gameplayStop(): Promise<void>;
  loadingStart(): Promise<void>;
  loadingStop(): Promise<void>;
}

export interface CrazyGamesSdkInterface {
  init(): Promise<void>;
  getEnvironment(): Promise<CrazyGamesEnvironmentEnum>;
  game: CrazyGamesGameModuleInterface;
  user: CrazyGamesUserModuleInterface;
}

export interface CrazyGamesGlobalInterface {
  SDK: CrazyGamesSdkInterface;
}
