import React, { useState } from "react";
import { motion } from "motion/react";
import { User, Trophy, BarChart3 } from "lucide-react";
import { ModalCard } from "../ui/ModalCard";
import { SciFiButton } from "../ui/SciFiButton";
import { playerService } from "../../services/playerService";
import { crazyGamesService } from "../../services/crazyGamesService";

interface PilotProfileModalProps {
  t: any;
  isProfileOpen: boolean;
  onClose: () => void;
}

export function PilotProfileModal({ t, isProfileOpen, onClose }: PilotProfileModalProps) {
  const [profileRotateX, setProfileRotateX] = useState(0);
  const [profileRotateY, setProfileRotateY] = useState(0);
  const [profileGlowX, setProfileGlowX] = useState(50);
  const [profileGlowY, setProfileGlowY] = useState(50);

  if (!isProfileOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const x = (e.clientX - rect.left) / width;
        const y = (e.clientY - rect.top) / height;
        setProfileRotateX(-(y - 0.5) * 20);
        setProfileRotateY((x - 0.5) * 20);
        setProfileGlowX(x * 100);
        setProfileGlowY(y * 100);
      }}
    >
      <ModalCard
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          transformStyle: "preserve-3d",
          transform: `perspective(1000px) rotateX(${profileRotateX}deg) rotateY(${profileRotateY}deg)`,
          boxShadow: `
             ${-profileRotateY * 1.5}px ${profileRotateX * 1.5}px 30px rgba(0, 0, 0, 0.8),
             0 0 40px rgba(16, 185, 129, ${0.12 + Math.abs(profileRotateX) / 40}),
             0 0 100px rgba(16, 185, 129, 0.05)
          `
        }}
        className="p-8 max-w-sm w-full relative overflow-hidden flex flex-col gap-8"
      >
        {/* Sci-Fi Grid Background Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(16,185,129,0.06),rgba(0,255,0,0.02),rgba(16,185,129,0.06))] bg-[size:100%_4px,6px_100%] opacity-20 pointer-events-none" />
        
        {/* Fake Hologram Scanline Effect */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 animate-scanline"
          style={{
            background: "linear-gradient(180deg, transparent, rgba(0,255,255,0.05), transparent)"
          }}
        />

        {/* Ambient Glare Effect */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-500 opacity-75 z-10"
          style={{
            background: `radial-gradient(circle 200px at ${profileGlowX}% ${profileGlowY}%, rgba(16, 185, 129, 0.18), transparent 70%)`
          }}
        />

        {/* Sci-fi decorative borders */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-500/60" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-500/60" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-500/60" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-500/60" />

        {/* Profile Header */}
        <div className="flex flex-col items-center gap-4 text-center mt-2" style={{ transform: "translateZ(45px)", transformStyle: "preserve-3d" }}>
          <div className="relative group">
            <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all duration-500" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-850 to-zinc-950 border-2 border-emerald-500/50 flex items-center justify-center shadow-2xl relative z-10">
              <User className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-black font-bold text-[10px] w-7 h-7 rounded-full flex items-center justify-center border-2 border-zinc-950 z-20 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
              {playerService.data.level}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-white font-display text-2xl font-black tracking-tight uppercase">
              Piloto Sparrow
            </h2>
            <span className="text-emerald-500 font-mono text-[10px] font-bold tracking-[0.3em] uppercase">
              Status: Operacional
            </span>
          </div>
        </div>

        {/* Progress Section */}
        <div className="flex flex-col gap-4 bg-black/60 p-5 rounded-2xl border border-white/5 shadow-inner text-left" style={{ transform: "translateZ(25px)" }}>
          <div className="flex justify-between items-center text-[10px] font-mono tracking-widest uppercase">
            <span className="text-zinc-500">Nível {playerService.data.level}</span>
            <span className="text-white font-bold">{Math.round(playerService.getLevelProgress())}%</span>
          </div>
          <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/10 p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${playerService.getLevelProgress()}%` }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            />
          </div>
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-tight">XP Total</span>
              <span className="text-sm font-bold text-white font-mono">{playerService.data.xp}</span>
            </div>
            {playerService.data.level < 10 ? (
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-tight">Faltam</span>
                <span className="text-[11px] font-bold text-emerald-400 font-mono">{playerService.getXpToNextLevel()} XP</span>
              </div>
            ) : (
              <div className="px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                <span className="text-[9px] font-bold text-emerald-500 uppercase font-mono">Nível Máximo</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3" style={{ transform: "translateZ(30px)" }}>
          <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col gap-1 items-center justify-center group hover:bg-white/[0.08] transition-colors">
            <Trophy className="w-4 h-4 text-orange-500 mb-1 group-hover:scale-110 transition-transform duration-500" />
            <span className="text-white font-bold font-mono text-base">
              {Object.keys(playerService.data.trackRecords).length}
            </span>
            <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest text-center">Pistas Concluídas</span>
          </div>
          <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col gap-1 items-center justify-center group hover:bg-white/[0.08] transition-colors">
            <BarChart3 className="w-4 h-4 text-blue-500 mb-1 group-hover:scale-110 transition-transform duration-500" />
            <span className="text-white font-bold font-mono text-base">
              {playerService.data.totalRaces || 0}
            </span>
            <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest text-center">Total de Voos</span>
          </div>
        </div>

        <div className="flex flex-col gap-3" style={{ transform: "translateZ(35px)" }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${playerService.isFirebaseEnabled ? 'bg-emerald-500' : crazyGamesService.isEnabled() ? 'bg-blue-500' : 'bg-orange-500'}`} />
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest text-center">
              {playerService.isFirebaseEnabled
                ? "Dados sincronizados na Nuvem"
                : crazyGamesService.isEnabled()
                  ? "Progresso salvo via CrazyGames SDK"
                  : "Modo Offline (Salvamento Local)"}
            </span>
          </div>
          <SciFiButton variant="ghost" onClick={onClose} className="w-full py-4 text-[10px] tracking-widest uppercase">
            {t.close}
          </SciFiButton>
        </div>
      </ModalCard>
    </motion.div>
  );
}
