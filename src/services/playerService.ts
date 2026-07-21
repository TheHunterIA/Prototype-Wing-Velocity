import { crazyGamesService } from "./crazyGamesService";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

export interface TrackRecord {
  time: number;
  shipId: string;
}

export interface PlayerData {
  xp: number;
  level: number;
  trackRecords: Record<string, TrackRecord>;
  temporaryLicenses: Record<string, number>; // shipId -> expiration timestamp
  totalRaces: number;
}

const STORAGE_KEY = 'prototype_wing_player_data';

export const playerService = {
  data: {
    xp: 0,
    level: 1,
    trackRecords: {},
    temporaryLicenses: {},
    totalRaces: 0,
  } as PlayerData,

  isFirebaseEnabled: false,
  currentUser: null as any,

  async init() {
    // Always load local data first as a baseline so the UI is immediately populated
    this.loadFromLocal();

    const isCrazyGames = crazyGamesService.isEnabled();
    if (!isCrazyGames) {
      // Production - Try to initialize Firebase
      this.isFirebaseEnabled = true;
      await this.initFirebase();
    }
  },

  loadFromLocal() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not load player data", e);
    }
  },

  saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn("Could not save player data", e);
    }
  },

  async initFirebase() {
    try {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.currentUser = user;
          try {
            await this.syncWithFirebase(user.uid);
          } catch (syncErr) {
            console.warn("Firestore sync failed, falling back to local storage:", syncErr);
            this.isFirebaseEnabled = false;
          }
        } else {
          try {
            await signInAnonymously(auth);
          } catch (err: any) {
            console.warn("Firebase Anonymous auth is disabled or restricted. Running in local-only mode.", err.message);
            this.isFirebaseEnabled = false; // Disable gracefully
          }
        }
      });
    } catch (e) {
      console.warn("Firebase init connection failed, using local storage fallback:", e);
      this.isFirebaseEnabled = false;
    }
  },

  async syncWithFirebase(uid: string) {
    try {
      const playerDoc = doc(db, "players", uid);
      
      // Initial fetch
      const snapshot = await getDoc(playerDoc);
      if (snapshot.exists()) {
        const remoteData = snapshot.data() as PlayerData;
        // Simple merge: if remote has more XP, use it
        if (remoteData.xp > this.data.xp) {
          this.data = { ...this.data, ...remoteData };
        } else {
          // If local is "better", push it to remote
          await this.save();
        }
      } else {
        // Create initial doc if it doesn't exist
        await setDoc(playerDoc, {
          ...this.data,
          updatedAt: new Date()
        });
      }

      // Real-time listener
      onSnapshot(playerDoc, (doc) => {
        if (doc.exists()) {
          const remoteData = doc.data() as PlayerData;
          if (remoteData.xp > this.data.xp) {
             this.data = { ...this.data, ...remoteData };
          }
        }
      }, (err) => {
        console.warn("Firestore real-time snapshot error:", err);
      });
    } catch (err) {
      console.warn("Error during Firestore sync setup:", err);
      this.isFirebaseEnabled = false;
      throw err;
    }
  },

  async save() {
    if (this.isFirebaseEnabled && this.currentUser) {
      const playerDoc = doc(db, "players", this.currentUser.uid);
      try {
        await setDoc(playerDoc, {
          ...this.data,
          updatedAt: new Date()
        }, { merge: true });
      } catch (e) {
        console.error("Error saving to Firebase", e);
        this.saveLocal();
      }
    } else {
      this.saveLocal();
    }
  },

  addXp(amount: number) {
    this.data.xp += amount;
    
    const thresholds = [0, 400, 1000, 2000, 4000, 7500, 12500, 20000, 35000, 60000];
    let newLevel = 1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (this.data.xp >= thresholds[i]) {
        newLevel = i + 1;
        break;
      }
    }
    if (newLevel > 10) newLevel = 10;

    let levelUp = false;
    if (newLevel > this.data.level) {
      this.data.level = newLevel;
      levelUp = true;
    }
    this.save();
    return { levelUp, newLevel: this.data.level };
  },

  getLevelProgress() {
    const thresholds = [0, 400, 1000, 2000, 4000, 7500, 12500, 20000, 35000, 60000];
    const level = this.data.level;
    if (level >= 10) return 100;
    const currentThreshold = thresholds[level - 1];
    const nextThreshold = thresholds[level];
    const xpInCurrentLevel = this.data.xp - currentThreshold;
    const xpNeededForNext = nextThreshold - currentThreshold;
    return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNext) * 100));
  },

  getXpToNextLevel() {
    const thresholds = [0, 400, 1000, 2000, 4000, 7500, 12500, 20000, 35000, 60000];
    const level = this.data.level;
    if (level >= 10) return 0;
    return thresholds[level] - this.data.xp;
  },

  submitTrackTime(trackId: string, time: number, shipId: string) {
    const currentRecord = this.data.trackRecords[trackId];
    let isNewRecord = false;
    if (!currentRecord || time < currentRecord.time) {
      this.data.trackRecords[trackId] = { time, shipId };
      isNewRecord = true;
      this.save();
    }
    return { isNewRecord, bestTime: this.data.trackRecords[trackId].time };
  },

  grantTemporaryLicense(id: string, durationMinutes: number = 15) {
    const expiration = Date.now() + durationMinutes * 60 * 1000;
    this.data.temporaryLicenses[id] = expiration;
    this.save();
    return expiration;
  },

  hasLicense(id: string, requiredLevel: number): boolean {
    if (this.data.level >= requiredLevel) return true;
    const tempLicenseExpiration = this.data.temporaryLicenses[id];
    if (tempLicenseExpiration && tempLicenseExpiration > Date.now()) {
      return true;
    }
    return false;
  },

  getTempLicenseTimeLeft(id: string): number {
    const tempLicenseExpiration = this.data.temporaryLicenses[id];
    if (tempLicenseExpiration && tempLicenseExpiration > Date.now()) {
      return tempLicenseExpiration - Date.now();
    }
    return 0;
  }
};

playerService.init();
