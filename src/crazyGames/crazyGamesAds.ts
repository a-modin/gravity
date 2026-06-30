import { pauseMusicPlayback, syncMusicPlayback } from '../music';
import { pauseRainSoundPlayback } from '../rainSound';
import { resumeAudioContext, stopSlingPullSound, suspendAudioContext } from '../sounds';
import {
  getCrazyGamesEnvironment,
  initCrazyGamesSdk,
  isCrazyGamesSdkReady,
} from './crazyGamesSdk';
import type { CrazyGamesGlobalInterface } from './crazyGames.types';

function getCrazyGamesGlobal(): CrazyGamesGlobalInterface | null {
  const global = window as Window & { CrazyGames?: CrazyGamesGlobalInterface };
  return global.CrazyGames ?? null;
}

function pauseGameAudioForAd(): void {
  stopSlingPullSound();
  pauseMusicPlayback();
  pauseRainSoundPlayback();
  suspendAudioContext();
}

function resumeGameAudioAfterAd(): void {
  resumeAudioContext();
  syncMusicPlayback();
}

export async function canRequestRewardedAds(): Promise<boolean> {
  const sdkLoaded = await initCrazyGamesSdk();
  if (!sdkLoaded || !isCrazyGamesSdkReady()) return false;

  const adModule = getCrazyGamesGlobal()?.SDK.ad;
  if (!adModule?.requestAd) return false;

  const environment = await getCrazyGamesEnvironment();
  return environment !== 'disabled';
}

export async function requestRewardedAd(): Promise<boolean> {
  const sdkLoaded = await initCrazyGamesSdk();
  if (!sdkLoaded || !isCrazyGamesSdkReady()) return false;

  const adModule = getCrazyGamesGlobal()?.SDK.ad;
  if (!adModule?.requestAd) return false;

  const environment = await getCrazyGamesEnvironment();
  if (environment === 'disabled') return false;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (rewarded: boolean): void => {
      if (settled) return;
      settled = true;
      resumeGameAudioAfterAd();
      resolve(rewarded);
    };

    try {
      adModule.requestAd('rewarded', {
        adStarted: () => {
          pauseGameAudioForAd();
        },
        adFinished: () => {
          finish(true);
        },
        adError: () => {
          finish(false);
        },
      });
    } catch (error) {
      console.warn('CrazyGames rewarded ad request failed', error);
      finish(false);
    }
  });
}
