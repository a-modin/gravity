export interface LocaleStringsInterface {
  appTitle: string;
  pauseTitle: string;
  pauseResume: string;
  pauseHint: string;
  gameOverTitle: string;
  gameOverDistance: string;
  gameOverRewind: string;
  gameOverRestart: string;
  debugToggle: string;
  debugTitle: string;
  debugMusic: string;
  debugMusicOn: string;
  debugMusicOff: string;
  debugRain: string;
  debugRainOn: string;
  debugRainOff: string;
  debugRainAuto: string;
  debugTime: string;
  debugTimeAuto: string;
  debugLava: string;
  debugLavaOn: string;
  debugLavaOff: string;
  debugLocale: string;
  dayPhaseNight: string;
  dayPhaseDawn: string;
  dayPhaseMorning: string;
  dayPhaseDay: string;
  dayPhaseAfternoon: string;
  dayPhaseDusk: string;
  authTitle: string;
  authHint: string;
  authSignIn: string;
  authContinue: string;
  authErrorGeneric: string;
  hudBestScore: string;
  leaderboardTitle: string;
  leaderboardRank: string;
  leaderboardPlayer: string;
  leaderboardScore: string;
  leaderboardLoading: string;
  leaderboardEmpty: string;
  leaderboardError: string;
}

export const enLocale: LocaleStringsInterface = {
  appTitle: 'Gravity',
  pauseTitle: 'PAUSED',
  pauseResume: 'RESUME',
  pauseHint: 'ESC — resume',
  gameOverTitle: 'GAME OVER',
  gameOverDistance: 'DISTANCE',
  gameOverRewind: 'RETURN TO PLATFORM',
  gameOverRestart: 'START OVER',
  debugToggle: 'DEBUG',
  debugTitle: 'DEV CONTROLS',
  debugMusic: 'Music',
  debugMusicOn: 'MUSIC ON',
  debugMusicOff: 'MUSIC OFF',
  debugRain: 'Rain',
  debugRainOn: 'RAIN ON',
  debugRainOff: 'RAIN OFF',
  debugRainAuto: 'AUTO',
  debugTime: 'Time of day',
  debugTimeAuto: 'AUTO',
  debugLava: 'Lava rise',
  debugLavaOn: 'LAVA ON',
  debugLavaOff: 'LAVA OFF',
  debugLocale: 'Language',
  dayPhaseNight: 'night',
  dayPhaseDawn: 'dawn',
  dayPhaseMorning: 'morning',
  dayPhaseDay: 'day',
  dayPhaseAfternoon: 'afternoon',
  dayPhaseDusk: 'dusk',
  authTitle: 'JOIN LEADERBOARD',
  authHint: 'Sign in on CrazyGames to save your score and compete in the rankings.',
  authSignIn: 'SIGN IN',
  authContinue: 'PLAY WITHOUT SIGN IN',
  authErrorGeneric: 'Sign in failed',
  hudBestScore: 'BEST',
  leaderboardTitle: 'LEADERBOARD',
  leaderboardRank: '#',
  leaderboardPlayer: 'PLAYER',
  leaderboardScore: 'HEIGHT',
  leaderboardLoading: 'Loading...',
  leaderboardEmpty: 'No scores yet',
  leaderboardError: 'Failed to load scores',
};
