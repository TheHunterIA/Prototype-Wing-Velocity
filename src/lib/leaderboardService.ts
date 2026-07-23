import { db, auth } from "./firebase";
import { collection, query, where, orderBy, limit, getDocs, setDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { crazyGamesService } from "../services/crazyGamesService";
import { playerService } from "../services/playerService";

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  time: number;
  shipId: string;
  level: number;
}

export const leaderboardService = {
  async submitScore(trackId: string, time: number, shipId: string) {
    // 1. Prioridade para CrazyGames Leaderboard
    if (crazyGamesService.isEnabled()) {
      await crazyGamesService.submitScore(trackId, time * 1000);
      return;
    }

    // 2. Fallback para Firebase fora da CrazyGames
    const activeUser = playerService.currentUser || auth.currentUser;
    if (!activeUser) return;

    try {
      const entryId = `${activeUser.uid}_${trackId}`;
      const leaderboardRef = doc(db, "leaderboards", entryId);
      
      // Check existing doc to avoid overwriting a better time
      const existingDoc = await getDoc(leaderboardRef);
      if (existingDoc.exists()) {
        const existingData = existingDoc.data();
        if (existingData.time && existingData.time <= time) {
          // Current record is already equal or better
          return;
        }
      }

      await setDoc(leaderboardRef, {
        userId: activeUser.uid,
        userName: "Piloto Sparrow",
        trackId,
        time,
        shipId,
        level: playerService.data.level || 1,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to submit score to global leaderboard", e);
    }
  },

  async getTopScores(trackId: string, limitCount: number = 10): Promise<LeaderboardEntry[]> {
    // 1. Se estiver na CrazyGames, buscar do SDK
    if (crazyGamesService.isEnabled()) {
      const data = await crazyGamesService.getScores(trackId);
      if (data && data.items) {
        return data.items.map((item: any) => ({
          userId: item.userId,
          userName: item.username,
          time: item.score / 1000,
          shipId: "unknown",
          level: 1
        }));
      }
      return [];
    }

    // 2. Fallback Firebase
    try {
      const q = query(
        collection(db, "leaderboards"),
        where("trackId", "==", trackId),
        orderBy("time", "asc"),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
    } catch (e) {
      console.warn("Failed to fetch leaderboard", e);
      return [];
    }
  }
};

