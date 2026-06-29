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

export interface CrazyGamesSdkInterface {
  init(): Promise<void>;
  getEnvironment(): Promise<CrazyGamesEnvironmentEnum>;
  user: CrazyGamesUserModuleInterface;
}

export interface CrazyGamesGlobalInterface {
  SDK: CrazyGamesSdkInterface;
}
