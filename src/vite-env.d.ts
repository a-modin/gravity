/// <reference types="vite/client" />

import type { CrazyGamesGlobalInterface } from './crazyGames/crazyGames.types';

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    CrazyGames?: CrazyGamesGlobalInterface;
  }
}

export {};
