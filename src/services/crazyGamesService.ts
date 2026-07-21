import { audioService } from "./audioService";

export type AdType = 'midroll' | 'rewarded';

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
      const sdk = (window as any).CrazyGames?.SDK;
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
      console.log('[CrazyGames] SDK already initialized');
      return;
    }
    try {
      const sdk = (window as any).CrazyGames?.SDK;
      if (sdk && typeof sdk.init === 'function') {
        if (sdk.environment === 'disabled') {
          console.log('[CrazyGames] SDK is disabled on this domain. Skipping init.');
          return;
        }
        console.log('[CrazyGames] Calling sdk.init()...');
        await sdk.init();
        this.hasInitialized = true;
        console.log('[CrazyGames] SDK Initialized successfully');
      } else {
        console.log('[CrazyGames] SDK or sdk.init() not found. sdk:', !!sdk, 'sdk.init:', typeof sdk?.init);
      }
    } catch (e) {
      console.error('[CrazyGames] SDK Init failed', e);
    }
  }

  public loadingStart() {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = (window as any).CrazyGames?.SDK;
      if (sdk?.game && typeof sdk.game.loadingStart === 'function') {
        sdk.game.loadingStart();
      }
    } catch (e) {}
  }

  public loadingStop() {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = (window as any).CrazyGames?.SDK;
      if (sdk?.game && typeof sdk.game.loadingStop === 'function') {
        sdk.game.loadingStop();
      }
    } catch (e) {}
  }

  public gameplayStart() {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = (window as any).CrazyGames?.SDK;
      if (sdk?.game && typeof sdk.game.gameplayStart === 'function') {
        sdk.game.gameplayStart();
        console.log('[CrazyGames] Gameplay started');
      }
    } catch (e) {}
  }

  public gameplayStop() {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = (window as any).CrazyGames?.SDK;
      if (sdk?.game && typeof sdk.game.gameplayStop === 'function') {
        sdk.game.gameplayStop();
        console.log('[CrazyGames] Gameplay stopped');
      }
    } catch (e) {}
  }

  public async requestAd(type: AdType): Promise<boolean> {
    if (!this.isEnabled() || !this.hasInitialized) {
      return true; // Simulate success if disabled
    }
    if (type === 'midroll') {
      const now = Date.now();
      if (now - this.lastMidrollTime < 300000) {
        return true;
      }
      this.lastMidrollTime = now;
    }
    try {
      const sdk = (window as any).CrazyGames?.SDK;
      const adInterface = sdk?.ad;
      if (!adInterface || typeof adInterface.requestAd !== 'function') {
        return true;
      }
      return new Promise((resolve) => {
        audioService.setAdMute(true);
        try {
          adInterface.requestAd(type, {
            adStarted: () => console.log('[CrazyGames] Ad started'),
            adFinished: () => {
              console.log('[CrazyGames] Ad finished');
              audioService.setAdMute(false);
              if (typeof window !== 'undefined') window.focus();
              resolve(true);
            },
            adError: (error: any) => {
              console.warn('[CrazyGames] Ad error', error);
              audioService.setAdMute(false);
              if (typeof window !== 'undefined') window.focus();
              resolve(false);
            }
          });
        } catch (e) {
          audioService.setAdMute(false);
          resolve(false);
        }
      });
    } catch (e) {
      return true;
    }
  }

  public happyTime() {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = (window as any).CrazyGames?.SDK;
      if (sdk?.game && typeof sdk.game.happyTime === 'function') {
        sdk.game.happyTime();
      }
    } catch (e) {}
  }

  public async getUserInfo(): Promise<{ username: string } | null> {
    try {
      if (!this.isEnabled() || !this.hasInitialized) return null;
      const sdk = (window as any).CrazyGames?.SDK;
      const userInterface = sdk?.user;
      if (!userInterface) return null;

      if (typeof userInterface.getUser === 'function') {
        const user = await userInterface.getUser();
        if (user && user.username) return { username: user.username };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  public async showAuthPrompt(): Promise<void> {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = (window as any).CrazyGames?.SDK;
      if (sdk?.user && typeof sdk.user.showAuthPrompt === 'function') {
        await sdk.user.showAuthPrompt();
      }
    } catch (e) {}
  }

  public addAuthListener(callback: (user: any) => void): () => void {
    if (!this.isEnabled() || !this.hasInitialized) return () => {};
    try {
      const sdk = (window as any).CrazyGames?.SDK;
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

  // Ad Support
  public async requestRewardedAd(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isEnabled()) {
        const sdk = (window as any).CrazyGames?.SDK;
        if (sdk?.ad?.requestAd) {
          sdk.ad.requestAd('rewarded', {
            adStarted: () => {
              console.log('[CrazyGames] Rewarded ad started');
            },
            adFinished: () => {
              console.log('[CrazyGames] Rewarded ad finished');
              resolve(true);
            },
            adError: (error: any) => {
              console.warn('[CrazyGames] Ad error:', error);
              resolve(false);
            }
          });
          return;
        }
      }
      
      // Simulation for Production Environment
      console.log('[Simulation] Starting simulated rewarded ad...');
      // We will handle the UI for this in the component level or via a global state
      // For now, let's return true after a simulated delay handled by the caller
      // or just assume the UI will trigger this.
      resolve(true);
    });
  }

  // Leaderboard Support
  public async submitScore(leaderboardId: string, score: number): Promise<void> {
    if (!this.isEnabled() || !this.hasInitialized) return;
    try {
      const sdk = (window as any).CrazyGames?.SDK;
      if (sdk?.leaderboard && typeof sdk.leaderboard.setScore === 'function') {
        await sdk.leaderboard.setScore(leaderboardId, score);
        console.log(`[CrazyGames] Score ${score} submitted to leaderboard ${leaderboardId}`);
      }
    } catch (e) {
      console.warn('[CrazyGames] Failed to submit score', e);
    }
  }

  public async getScores(leaderboardId: string): Promise<any> {
    if (!this.isEnabled() || !this.hasInitialized) return null;
    try {
      const sdk = (window as any).CrazyGames?.SDK;
      if (sdk?.leaderboard && typeof sdk.leaderboard.getScores === 'function') {
        return await sdk.leaderboard.getScores(leaderboardId);
      }
    } catch (e) {
      console.warn('[CrazyGames] Failed to get scores', e);
    }
    return null;
  }
}

export const crazyGamesService = new CrazyGamesService();
