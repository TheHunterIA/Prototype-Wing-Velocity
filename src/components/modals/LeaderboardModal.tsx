import React from "react";
import { motion } from "motion/react";
import { X, Trophy } from "lucide-react";
import { ModalCard } from "../ui/ModalCard";
import { LeaderboardEntry } from "../../lib/leaderboardService";
import { SHIPS_DATA, ROUTES_DATA } from "../../data";
import { playerService } from "../../services/playerService";

interface LeaderboardModalProps {
  isLeaderboardOpen: boolean;
  leaderboardRouteId: string | null;
  isLoadingLeaderboard: boolean;
  leaderboardScores: LeaderboardEntry[];
  onClose: () => void;
  playSound: (type: string, isMuted: boolean) => void;
  isMuted: boolean;
}

export function LeaderboardModal({
  isLeaderboardOpen,
  leaderboardRouteId,
  isLoadingLeaderboard,
  leaderboardScores,
  onClose,
  playSound,
  isMuted
}: LeaderboardModalProps) {
  if (!isLeaderboardOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <ModalCard
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="p-6 max-w-md w-full relative overflow-hidden flex flex-col gap-5"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/5 via-transparent to-transparent pointer-events-none" />

        <button
          onClick={() => {
            playSound("click", isMuted);
            onClose();
          }}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 hover:border-orange-500/40 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-500 cursor-pointer active:scale-90"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-1 relative">
          <div className="flex items-center gap-2 text-orange-500 mb-0.5">
            <Trophy className="w-4 h-4 animate-pulse" />
            <span className="text-[9px] font-mono tracking-[0.3em] font-bold uppercase">
              CLASSIFICAÇÃO GLOBAL
            </span>
          </div>
          <h2 className="text-white font-sans text-xl font-bold tracking-tight uppercase">
            {ROUTES_DATA.find(r => r.id === leaderboardRouteId)?.name || ""}
          </h2>
          <div className="h-px w-12 bg-orange-500 mt-2" />
        </div>

        <div className="flex-1 min-h-[250px] max-h-[350px] overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {isLoadingLeaderboard ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
                Carregando dados...
              </span>
            </div>
          ) : leaderboardScores.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-12 border border-dashed border-white/5 rounded-xl bg-zinc-900/30">
              <Trophy className="w-8 h-8 text-zinc-600 mb-1" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-bold">
                Nenhum tempo registrado
              </span>
              <span className="text-[9px] font-mono text-zinc-500 max-w-[240px] leading-normal">
                Seja o primeiro a completar este trajeto e registrar o recorde!
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {leaderboardScores.map((score, idx) => {
                const ship = SHIPS_DATA.find(s => s.id === score.shipId);
                const isCurrentUser = playerService.currentUser && score.userId === playerService.currentUser.uid;
                
                const rankEmojis = ["🥇", "🥈", "🥉"];
                const rankDisplay = idx < 3 ? rankEmojis[idx] : (idx + 1);

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-500 ${
                      isCurrentUser 
                        ? "bg-orange-500/10 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]" 
                        : "bg-zinc-900/40 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded font-mono text-[10px] font-bold flex items-center justify-center ${
                        idx === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)] text-sm" :
                        idx === 1 ? "bg-zinc-400/20 text-zinc-300 border border-zinc-400/30 text-sm" :
                        idx === 2 ? "bg-amber-700/20 text-amber-600 border border-amber-700/30 text-sm" :
                        "bg-zinc-800/40 text-zinc-500 border border-zinc-800/30"
                      }`}>
                        {rankDisplay}
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-[11px] font-mono font-bold text-white flex items-center gap-1.5">
                          {score.userName || "Piloto Sparrow"}
                          {isCurrentUser && (
                            <span className="px-1 py-0.5 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[8px] rounded uppercase font-black tracking-widest scale-90">
                              VOCÊ
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                          {ship ? ship.name : "Nave Desconhecida"}
                          <span className="w-1 h-1 rounded-full bg-zinc-700" />
                          Nível {score.level || 1}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-[14px] font-mono font-bold text-emerald-400">
                        {score.time.toFixed(2)}s
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ModalCard>
    </motion.div>
  );
}
