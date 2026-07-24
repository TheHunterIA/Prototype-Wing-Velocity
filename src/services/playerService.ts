import { crazyGamesService } from "./crazyGamesService";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

export interface TrackRecord {
  time: number;
  shipId: string;
}

export interface ShipBoostPoints {
  velocidade: number;
  aceleracao: number;
  turbo: number;
  energia: number;
  massa: number;
}

export interface ShipBoost {
  points: ShipBoostPoints;
  expiration: number;
}

export interface PlayerData {
  xp: number;
  level: number;
  trackRecords: Record<string, TrackRecord>;
  temporaryLicenses: Record<string, number>; // shipId -> expiration timestamp
  shipBoosts?: Record<string, ShipBoost>; // shipId -> active boost
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
      
      // Initial fetch from server
      const snapshot = await getDoc(playerDoc);
      if (snapshot.exists()) {
        const remoteData = snapshot.data() as PlayerData;
        
        // Intelligent data merging
        const mergedXp = Math.max(this.data.xp || 0, remoteData.xp || 0);
        const mergedLevel = Math.max(this.data.level || 1, remoteData.level || 1);
        const mergedTotalRaces = Math.max(this.data.totalRaces || 0, remoteData.totalRaces || 0);

        // Merge track records: keep the best (lowest) time for every track
        const mergedRecords: Record<string, TrackRecord> = {
          ...(remoteData.trackRecords || {}),
          ...(this.data.trackRecords || {})
        };
        const allTrackKeys = new Set([
          ...Object.keys(remoteData.trackRecords || {}),
          ...Object.keys(this.data.trackRecords || {})
        ]);
        allTrackKeys.forEach((trackId) => {
          const remoteRec = remoteData.trackRecords?.[trackId];
          const localRec = this.data.trackRecords?.[trackId];
          if (remoteRec && localRec) {
            mergedRecords[trackId] = remoteRec.time < localRec.time ? remoteRec : localRec;
          } else if (remoteRec) {
            mergedRecords[trackId] = remoteRec;
          } else if (localRec) {
            mergedRecords[trackId] = localRec;
          }
        });

        // Merge temporary licenses: keep furthest expiration
        const mergedLicenses: Record<string, number> = {
          ...(remoteData.temporaryLicenses || {}),
          ...(this.data.temporaryLicenses || {})
        };
        const allLicenseKeys = new Set([
          ...Object.keys(remoteData.temporaryLicenses || {}),
          ...Object.keys(this.data.temporaryLicenses || {})
        ]);
        allLicenseKeys.forEach((shipId) => {
          const remoteExp = remoteData.temporaryLicenses?.[shipId] || 0;
          const localExp = this.data.temporaryLicenses?.[shipId] || 0;
          mergedLicenses[shipId] = Math.max(remoteExp, localExp);
        });

        // Merge ship boosts
        const mergedBoosts = {
          ...(remoteData.shipBoosts || {}),
          ...(this.data.shipBoosts || {})
        };

        this.data = {
          xp: mergedXp,
          level: mergedLevel,
          trackRecords: mergedRecords,
          temporaryLicenses: mergedLicenses,
          shipBoosts: mergedBoosts,
          totalRaces: mergedTotalRaces,
        };

        this.saveLocal();
        await setDoc(playerDoc, {
          ...this.data,
          updatedAt: new Date()
        }, { merge: true });
      } else {
        // Create initial doc if it doesn't exist
        await setDoc(playerDoc, {
          ...this.data,
          updatedAt: new Date()
        });
      }

      // Real-time listener
      onSnapshot(playerDoc, (snapshotDoc) => {
        if (snapshotDoc.exists()) {
          const remoteData = snapshotDoc.data() as PlayerData;
          if (remoteData.xp > this.data.xp || remoteData.level > this.data.level) {
            this.data = { ...this.data, ...remoteData };
            this.saveLocal();
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
    // Always persist locally immediately
    this.saveLocal();

    if (this.isFirebaseEnabled && this.currentUser) {
      const playerDoc = doc(db, "players", this.currentUser.uid);
      try {
        await setDoc(playerDoc, {
          ...this.data,
          updatedAt: new Date()
        }, { merge: true });
      } catch (e) {
        console.warn("Error saving player data to Firebase:", e);
      }
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

  hasCompletedCertification(): boolean {
    return !!(this.data?.trackRecords && this.data.trackRecords["route-certification"]);
  },

  hasCompletedDyson(): boolean {
    return !!(this.data?.trackRecords && this.data.trackRecords["route-dyson"]);
  },

  isSkinLocked(skinId: string): boolean {
    if (skinId === "earth-harmony" && !this.hasCompletedCertification()) {
      return true;
    }
    if (skinId === "sucata-espacial" && !this.hasCompletedDyson()) {
      return true;
    }
    return false;
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
    if (typeof window !== 'undefined' && (window.location.hostname.includes('run.app') || window.location.hostname.includes('ais-pre-') || (import.meta as any).env?.PROD)) {
      return true;
    }
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
  },

  getShipBoost(shipId: string): ShipBoostPoints | null {
    if (!this.data.shipBoosts) return null;
    const boost = this.data.shipBoosts[shipId];
    if (boost && boost.expiration > Date.now()) {
      return boost.points;
    }
    return null;
  },

  getShipBoostTimeLeft(shipId: string): number {
    if (!this.data.shipBoosts) return 0;
    const boost = this.data.shipBoosts[shipId];
    if (boost && boost.expiration > Date.now()) {
      return boost.expiration - Date.now();
    }
    return 0;
  },

  setShipBoost(shipId: string, points: ShipBoostPoints, durationMinutes = 15) {
    if (!this.data.shipBoosts) {
      this.data.shipBoosts = {};
    }
    const expiration = Date.now() + durationMinutes * 60 * 1000;
    this.data.shipBoosts[shipId] = {
      points,
      expiration
    };
    this.save();
    return expiration;
  }
};

playerService.init();
