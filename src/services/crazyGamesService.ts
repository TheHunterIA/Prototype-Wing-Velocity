import { audioService } from "./audioService";

export type AdType = 'midroll' | 'rewarded';

export type CrazyGamesUserInfo = {
  username?: string;
  userId?: string;
  avatar?: string;
  displayName?: string;
};

const DEBUG = (import.meta as any).env?.DEV ?? true;

function logDebug(...args: any[]) {
  if (DEBUG) console.log(...args);
}

function warnDebug(...args: any[]) {
  if (DEBUG) console.warn(...args);
}

function errorDebug(...args: any[]) {
  if (DEBUG) console.error(...args);
}

export class CrazyGamesService {
  private get sdk() {
    if (typeof window !== 'undefined') {
      return (window as any).CrazyGames?.SDK;
    }
    return null;
  }

  public isEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const sdk = this.sdk;
      if (!sdk) return false;
      
      const env = sdk.environment;
      
      if (env === 'disabled') return false;
      if (env === 'crazygames' || env === 'local') return true;

      const hostname = window.location.hostname;
      const isAllowedDomain = 
        hostname.includes('crazygames') || 
        hostname.includes('crazy.games') || 
        hostname.includes('localhost') || 
        hostname.includes('127.0.0.1') ||
        hostname.includes('run.app');
      
      return isAllowedDomain;
    } catch (e) {
      return false;
    }
  }

  private hasInitialized = false;
  private lastMidrollTime = 0;

  public async init(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.hasInitialized) {
      logDebug('[CrazyGames] SDK already initialized');
      return;
    }
    try {
      const sdk = this.sdk;
      if (sdk && typeof sdk.init === 'function') {
        if (sdk.environment === 'disabled') {
          logDebug('[CrazyGames] SDK is disabled on this domain. Skipping init.');
          return;
        }
        logDebug('[CrazyGames] Calling sdk.init()...');
        await sdk.init();
        this.hasInitialized = true;
        logDebug('[CrazyGames] SDK Initialized successfully');
      } else {
        logDebug('[CrazyGames] SDK or sdk.init() not found. sdk:', !!sdk, 'sdk.init:', typeof sdk?.init);
      }
    } catch (e) {
      errorDebug('[CrazyGames] SDK Init failed', e);
    }
  }

  public loadingStart() {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = this.sdk;
      if (sdk?.game && typeof sdk.game.loadingStart === 'function') {
        sdk.game.loadingStart();
      }
    } catch (e) {}
  }

  public loadingStop() {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = this.sdk;
      if (sdk?.game && typeof sdk.game.loadingStop === 'function') {
        sdk.game.loadingStop();
      }
    } catch (e) {}
  }

  public gameplayStart() {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = this.sdk;
      if (sdk?.game && typeof sdk.game.gameplayStart === 'function') {
        sdk.game.gameplayStart();
        logDebug('[CrazyGames] Gameplay started');
      }
    } catch (e) {}
  }

  public gameplayStop() {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = this.sdk;
      if (sdk?.game && typeof sdk.game.gameplayStop === 'function') {
        sdk.game.gameplayStop();
        logDebug('[CrazyGames] Gameplay stopped');
      }
    } catch (e) {}
  }

  public async requestAd(type: AdType): Promise<boolean> {
    if (!this.isEnabled() || !this.hasInitialized) {
      return true; // Simulate success if disabled
    }
    if (type === 'midroll') {
      return true; // Anúncios midroll desativados
    }
    try {
      const sdk = this.sdk;
      const adInterface = sdk?.ad;
      if (!adInterface || typeof adInterface.requestAd !== 'function') {
        return true;
      }
      return new Promise((resolve) => {
        audioService.setAdMute(true);
        let resolved = false;
        const safeResolve = (val: boolean) => {
          if (resolved) return;
          resolved = true;
          audioService.setAdMute(false);
          if (typeof window !== 'undefined') window.focus();
          resolve(val);
        };

        const timer = setTimeout(() => {
          warnDebug('[CrazyGames] Ad request timeout (8s). Continuing gameplay...');
          safeResolve(true);
        }, 8000);

        try {
          adInterface.requestAd(type, {
            adStarted: () => logDebug('[CrazyGames] Ad started'),
            adFinished: () => {
              logDebug('[CrazyGames] Ad finished');
              clearTimeout(timer);
              safeResolve(true);
            },
            adError: (error: any) => {
              warnDebug('[CrazyGames] Ad error', error);
              clearTimeout(timer);
              // Se for erro de No Fill ou erro genérico de anúncio, não bloqueamos o jogador
              const errStr = String(error?.message || error || '').toLowerCase();
              if (errStr.includes('no fill') || errStr.includes('nofill') || errStr.includes('fill')) {
                safeResolve(true);
              } else {
                safeResolve(true); // Resolve true em caso de falha de exibição de anúncio para não travar o jogador
              }
            }
          });
        } catch (e) {
          clearTimeout(timer);
          safeResolve(true);
        }
      });
    } catch (e) {
      return true;
    }
  }

  public async requestRewardedAd(): Promise<boolean> {
    return this.requestAd('rewarded');
  }

  public happyTime() {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = this.sdk;
      if (sdk?.game && typeof sdk.game.happyTime === 'function') {
        sdk.game.happyTime();
      }
    } catch (e) {}
  }

  public async getUserInfo(): Promise<CrazyGamesUserInfo | null> {
    try {
      if (!this.isEnabled() || !this.hasInitialized) return null;
      const sdk = this.sdk;
      const userInterface = sdk?.user;
      if (!userInterface) return null;

      if (typeof userInterface.getUser === 'function') {
        const user = await userInterface.getUser();
        if (user) {
          return {
            username: user.username,
            userId: user.userId || user.id,
            avatar: user.avatar || user.profilePictureUrl || user.avatarUrl,
            displayName: user.displayName || user.username
          };
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  public async showAuthPrompt(): Promise<void> {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = this.sdk;
      if (sdk?.user && typeof sdk.user.showAuthPrompt === 'function') {
        await sdk.user.showAuthPrompt();
      }
    } catch (e) {}
  }

  public addAuthListener(callback: (user: any) => void): () => void {
    if (!this.isEnabled() || !this.hasInitialized) return () => {};
    try {
      const sdk = this.sdk;
      if (sdk?.user && typeof sdk.user.addAuthListener === 'function') {
        sdk.user.addAuthListener(callback);
        return () => {
          if (typeof sdk.user.removeAuthListener === 'function') {
            sdk.user.removeAuthListener(callback);
          }
        };
      }
    } catch (e) {}
    return () => {};
  }

  // Leaderboard Support
  public async submitScore(leaderboardId: string, score: number): Promise<void> {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = this.sdk;
      if (sdk?.leaderboard && typeof sdk.leaderboard.setScore === 'function') {
        await sdk.leaderboard.setScore(leaderboardId, score);
        logDebug(`[CrazyGames] Score ${score} submitted to leaderboard ${leaderboardId}`);
      }
    } catch (e) {
      warnDebug('[CrazyGames] Failed to submit score', e);
    }
  }

  public async getScores(leaderboardId: string): Promise<any> {
    if (!this.isEnabled() || !this.hasInitialized) return null;
    try {
      const sdk = this.sdk;
      if (sdk?.leaderboard && typeof sdk.leaderboard.getScores === 'function') {
        return await sdk.leaderboard.getScores(leaderboardId);
      }
    } catch (e) {
      warnDebug('[CrazyGames] Failed to get scores', e);
    }
    return null;
  }
}

export const crazyGamesService = new CrazyGamesService();
