import { db } from "./firebase";
import { collection, query, where, orderBy, limit, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
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
      // Nota: CrazyGames geralmente usa milissegundos para tempos precisos
      await crazyGamesService.submitScore(trackId, time * 1000);
      return;
    }

    // 2. Fallback para Firebase se estiver em produção/desenvolvimento
    if (!playerService.isFirebaseEnabled || !playerService.currentUser) return;

    try {
      const entryId = `${playerService.currentUser.uid}_${trackId}`;
      const leaderboardRef = doc(db, "leaderboards", entryId);
      
      await setDoc(leaderboardRef, {
        userId: playerService.currentUser.uid,
        userName: "Piloto Sparrow",
        trackId,
        time,
        shipId,
        level: playerService.data.level,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to submit score to global leaderboard", e);
    }
  },

  async getTopScores(trackId: string, limitCount: number = 10): Promise<LeaderboardEntry[]> {
    // 1. Se estiver na CrazyGames, buscar de lá (exige implementação de UI para exibir os dados do SDK)
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
    if (!playerService.isFirebaseEnabled) return [];

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
