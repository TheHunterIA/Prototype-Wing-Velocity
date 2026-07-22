import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Trophy, BarChart3, Shield, X, Award, CheckCircle2 } from "lucide-react";
import { ModalCard } from "../ui/ModalCard";
import { SciFiButton } from "../ui/SciFiButton";
import { playerService } from "../../services/playerService";
import { Language } from "../../translations";

interface PilotProfileModalProps {
  t: any;
  language: Language;
  isProfileOpen: boolean;
  onClose: () => void;
  playSound: (type: string, isMuted: boolean) => void;
  isMuted: boolean;
}

const localTranslations: Record<Language, Record<string, string>> = {
  pt: {
    pilotLicense: "Licença de Piloto",
    officialFlightLicense: "Licença de Voo Oficial",
    pilotSparrow: "Piloto Sparrow",
    activeCredentials: "CREDENCIAIS ATIVAS",
    completedTracks: "Pistas Concluídas",
    totalFlights: "Total de Voos",
    levelAccreditation: "Credenciamento de Nível",
    level: "Nível",
    xpAccumulated: "XP Acumulado:",
    remaining: "Faltam:",
    maxLevel: "Nível Máximo",
    rankCadet: "Cadete Espacial",
    rankOfficer: "Piloto Oficial",
    rankVeteran: "Piloto Veterano",
    rankCommander: "Comandante de Frota",
    rankAce: "As do Espaço"
  },
  en: {
    pilotLicense: "Pilot License",
    officialFlightLicense: "Official Flight License",
    pilotSparrow: "Sparrow Pilot",
    activeCredentials: "ACTIVE CREDENTIALS",
    completedTracks: "Completed Tracks",
    totalFlights: "Total Flights",
    levelAccreditation: "Level Accreditation",
    level: "Level",
    xpAccumulated: "Accumulated XP:",
    remaining: "Remaining:",
    maxLevel: "Max Level",
    rankCadet: "Space Cadet",
    rankOfficer: "Officer Pilot",
    rankVeteran: "Veteran Pilot",
    rankCommander: "Fleet Commander",
    rankAce: "Space Ace"
  },
  es: {
    pilotLicense: "Licencia de Piloto",
    officialFlightLicense: "Licencia de Vuelo Oficial",
    pilotSparrow: "Piloto Sparrow",
    activeCredentials: "CREDENCIALES ACTIVAS",
    completedTracks: "Pistas Completadas",
    totalFlights: "Vuelos Totales",
    levelAccreditation: "Acreditación de Nivel",
    level: "Nivel",
    xpAccumulated: "XP Acumulado:",
    remaining: "Faltan:",
    maxLevel: "Nivel Máximo",
    rankCadet: "Cadete Espacial",
    rankOfficer: "Piloto Oficial",
    rankVeteran: "Piloto Veterano",
    rankCommander: "Comandante de Flota",
    rankAce: "As del Espacio"
  },
  fr: {
    pilotLicense: "Licence de Pilote",
    officialFlightLicense: "Licence de Vol Officielle",
    pilotSparrow: "Pilote Sparrow",
    activeCredentials: "ID_ACTIF",
    completedTracks: "Pistes Complétées",
    totalFlights: "Vols Totaux",
    levelAccreditation: "Accréditation de Niveau",
    level: "Niveau",
    xpAccumulated: "XP Accumulés :",
    remaining: "Restant :",
    maxLevel: "Niveau Maximum",
    rankCadet: "Cadet de l'Espace",
    rankOfficer: "Pilote Officier",
    rankVeteran: "Pilote Vétéran",
    rankCommander: "Commandant de Flotte",
    rankAce: "As de l'Espace"
  }
};

export function PilotProfileModal({ t, language, isProfileOpen, onClose, playSound, isMuted }: PilotProfileModalProps) {
  const level = playerService.data.level;
  const lt = localTranslations[language] || localTranslations.pt;

  const getRankName = (lvl: number) => {
    if (lvl >= 10) return lt.rankAce;
    if (lvl >= 7) return lt.rankCommander;
    if (lvl >= 5) return lt.rankVeteran;
    if (lvl >= 3) return lt.rankOfficer;
    return lt.rankCadet;
  };

  return (
    <AnimatePresence>
      {isProfileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        >
      <ModalCard
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="p-6 max-w-sm w-full relative flex flex-col gap-5 select-none overflow-hidden"
      >
        {/* Botão de Fechar */}
        <button
          onClick={() => {
            playSound("click", isMuted);
            onClose();
          }}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 hover:border-amber-500/40 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-500 cursor-pointer active:scale-90"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabeçalho do Modal */}
        <div className="flex flex-col gap-1 relative z-10">
          <div className="flex items-center gap-2 text-amber-500 mb-0.5">
            <Award className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono tracking-[0.3em] font-bold uppercase">Pilot_Credential</span>
          </div>
          <h2 className="text-white font-sans text-2xl font-light tracking-tight">
            {lt.pilotLicense}
          </h2>
          <div className="h-px w-8 bg-amber-500 mt-2" />
        </div>

        <div className="flex flex-col gap-4 relative z-10">
          {/* CARTÃO DE LICENÇA DE PILOTAGEM */}
          <div className="relative p-4 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-white/[0.02] to-transparent flex flex-col gap-4 overflow-hidden shadow-lg">
            {/* Tarja superior da Licença */}
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <span className="text-[9px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                  {lt.officialFlightLicense}
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold text-zinc-400">
                ID: SPW-00{level}
              </span>
            </div>

            {/* Identificação do Piloto */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-xl bg-zinc-900 border-2 border-amber-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-400">
                  <User className="w-7 h-7" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black font-mono font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow">
                  {lt.level.substring(0,2).toUpperCase()}.{level}
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <h3 className="text-white font-sans text-base font-bold tracking-tight truncate">
                  {lt.pilotSparrow}
                </h3>
                <span className="text-xs text-amber-400/90 font-mono font-medium">
                  {getRankName(level)}
                </span>
                <span className="text-[9px] text-emerald-400 font-mono font-semibold flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {lt.activeCredentials}
                </span>
              </div>
            </div>

            {/* Grade de Estatísticas da Licença */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex flex-col gap-0.5">
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1 leading-none">
                  <Trophy className="w-3 h-3 text-amber-500 shrink-0" /> <span className="truncate">{lt.completedTracks}</span>
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {Object.keys(playerService.data.trackRecords).length}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex flex-col gap-0.5">
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1 leading-none">
                  <BarChart3 className="w-3 h-3 text-amber-500 shrink-0" /> <span className="truncate">{lt.totalFlights}</span>
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {playerService.data.totalRaces || 0}
                </span>
              </div>
            </div>
          </div>

          {/* PROGRESSO DE CREDENCIAMENTO E XP */}
          <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-amber-500">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-white">{lt.levelAccreditation}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{lt.level} {level}</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-500">
                {Math.round(playerService.getLevelProgress())}%
              </span>
            </div>

            {/* Barra de Progresso */}
            <div className="h-2 w-full bg-zinc-900 rounded-lg overflow-hidden border border-white/5 p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${playerService.getLevelProgress()}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-amber-500 rounded-md shadow-[0_0_10px_rgba(245,158,11,0.4)]"
              />
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono pt-1 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">{lt.xpAccumulated}</span>
                <span className="text-white font-bold">{playerService.data.xp}</span>
              </div>
              {level < 10 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">{lt.remaining}</span>
                  <span className="text-amber-400 font-bold">{playerService.getXpToNextLevel()} XP</span>
                </div>
              ) : (
                <span className="text-amber-400 font-bold uppercase text-[9px]">{lt.maxLevel}</span>
              )}
            </div>
          </div>

          {/* Botão de Fechar */}
          <SciFiButton
            onClick={() => {
              playSound("click", isMuted);
              onClose();
            }}
            className="w-full py-3.5 font-bold text-[11px] tracking-[0.2em] uppercase rounded-xl"
          >
            {t.close}
          </SciFiButton>
        </div>
      </ModalCard>
    </motion.div>
      )}
    </AnimatePresence>
  );
}



