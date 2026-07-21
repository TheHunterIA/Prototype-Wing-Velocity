import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, X, Plus, Minus, RotateCcw, Clock, ShieldAlert, Sparkles, Gauge, Flame, Battery, Scale, Rocket, Check, Wrench } from "lucide-react";
import { ModalCard } from "../ui/ModalCard";
import { SciFiButton } from "../ui/SciFiButton";
import { ShipData } from "../../types";
import { playerService, ShipBoostPoints } from "../../services/playerService";
import { crazyGamesService } from "../../services/crazyGamesService";
import { Language } from "../../translations";

interface ShipUpgradeModalProps {
  showUpgradeModal: boolean;
  ship: ShipData;
  t: any;
  language: Language;
  onClose: () => void;
  onBoostApplied: () => void;
  playSound: (type: string, isMuted: boolean) => void;
  isMuted: boolean;
}

const localTranslations: Record<Language, Record<string, string>> = {
  pt: {
    upgradeTitle: "Upgrade Tático de Nave",
    boostActive: "Boost Ativo:",
    tuningVideo: "Sintonizando Vídeo Reward...",
    waitReward: "Aguarde alguns segundos para receber seus 5 pontos de atributos",
    rewardDesc: "Assista ao vídeo premiado para desbloquear +5 Pontos de Atributos para distribuir entre os sistemas da",
    boostDurationLabel: "DURAÇÃO DO BOOST:",
    minutesValue: "15 MINUTOS",
    totalBonusLabel: "BÔNUS TOTAL:",
    fivePointsValue: "+5 PONTOS DE SISTEMA",
    watchVideoBtn: "Assistir Vídeo Reward (+5 Pontos)",
    remainingPoints: "Pontos Restantes:",
    resetTitle: "Resetar atribuições",
    baseLabel: "Base:",
    newVideoBtn: "Novo Vídeo",
    newVideoTitle: "Assistir outro vídeo reward para resetar ou renovar",
    confirmBtn: "Confirmar Boost (15 Min)",
    velocidade: "Velocidade",
    aceleracao: "Aceleração",
    turbo: "Turbo / Boost",
    energia: "Energia / Escudos",
    massa: "Massa / Inércia"
  },
  en: {
    upgradeTitle: "Tactical Ship Upgrade",
    boostActive: "Active Boost:",
    tuningVideo: "Tuning Reward Video...",
    waitReward: "Wait a few seconds to receive your 5 attribute points",
    rewardDesc: "Watch the rewarded video to unlock +5 Attribute Points to distribute among the systems of",
    boostDurationLabel: "BOOST DURATION:",
    minutesValue: "15 MINUTES",
    totalBonusLabel: "TOTAL BONUS:",
    fivePointsValue: "+5 SYSTEM POINTS",
    watchVideoBtn: "Watch Reward Video (+5 Points)",
    remainingPoints: "Remaining Points:",
    resetTitle: "Reset allocations",
    baseLabel: "Base:",
    newVideoBtn: "New Video",
    newVideoTitle: "Watch another reward video to reset or renew",
    confirmBtn: "Confirm Boost (15 Min)",
    velocidade: "Speed",
    aceleracao: "Acceleration",
    turbo: "Turbo / Boost",
    energia: "Energy / Shields",
    massa: "Mass / Inertia"
  },
  es: {
    upgradeTitle: "Mejora Táctica de Nave",
    boostActive: "Boost Activo:",
    tuningVideo: "Sintonizando Video de Recompensa...",
    waitReward: "Espere unos segundos para recibir sus 5 puntos de atributos",
    rewardDesc: "Mira el video premiado para desbloquear +5 Puntos de Atributo para distribuir entre los sistemas de la",
    boostDurationLabel: "DURACIÓN DEL IMPULSO:",
    minutesValue: "15 MINUTOS",
    totalBonusLabel: "BONO TOTAL:",
    fivePointsValue: "+5 PUNTOS DE SISTEMA",
    watchVideoBtn: "Ver Video de Recompensa (+5 Puntos)",
    remainingPoints: "Puntos Restantes:",
    resetTitle: "Restablecer asignaciones",
    baseLabel: "Base:",
    newVideoBtn: "Nuevo Video",
    newVideoTitle: "Ver otro video de recompensa para restablecer o renovar",
    confirmBtn: "Confirmar Impulso (15 Min)",
    velocidade: "Velocidad",
    aceleracao: "Aceleración",
    turbo: "Turbo / Impulso",
    energia: "Energía / Escudos",
    massa: "Masa / Inercia"
  },
  fr: {
    upgradeTitle: "Amélioration Tactique de Vaisseau",
    boostActive: "Boost Actif :",
    tuningVideo: "Réglage Vidéo Récompense...",
    waitReward: "Attendez quelques secondes pour recevoir vos 5 points d'attributs",
    rewardDesc: "Regardez la vidéo récompensée pour débloquer +5 Points d'Attributs à répartir entre les systèmes du",
    boostDurationLabel: "DURÉE DU BOOST :",
    minutesValue: "15 MINUTES",
    totalBonusLabel: "BONUS TOTAL :",
    fivePointsValue: "+5 POINTS DE SYSTÈME",
    watchVideoBtn: "Regarder la Vidéo Récompense (+5 Points)",
    remainingPoints: "Points Restants :",
    resetTitle: "Réinitialiser les attributions",
    baseLabel: "Base :",
    newVideoBtn: "Nouvelle Vidéo",
    newVideoTitle: "Regarder une autre vidéo de récompense pour réinitialiser ou renouveler",
    confirmBtn: "Confirmer le Boost (15 Min)",
    velocidade: "Vitesse",
    aceleracao: "Accélération",
    turbo: "Turbo / Boost",
    energia: "Énergie / Boucliers",
    massa: "Masse / Inertie"
  }
};

export function ShipUpgradeModal({
  showUpgradeModal,
  ship,
  t,
  language,
  onClose,
  onBoostApplied,
  playSound,
  isMuted
}: ShipUpgradeModalProps) {
  const [isAdShowing, setIsAdShowing] = useState(false);
  const [hasWatchedVideo, setHasWatchedVideo] = useState(false);
  const [allocatedPoints, setAllocatedPoints] = useState<ShipBoostPoints>({
    velocidade: 0,
    aceleracao: 0,
    turbo: 0,
    energia: 0,
    massa: 0
  });
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  const lt = localTranslations[language] || localTranslations.pt;

  // Sync active boost state on mount/ship change
  useEffect(() => {
    if (!showUpgradeModal) return;

    const existingBoost = playerService.getShipBoost(ship.id);
    const left = playerService.getShipBoostTimeLeft(ship.id);
    setTimeLeftMs(left);

    if (existingBoost) {
      setAllocatedPoints({ ...existingBoost });
      setHasWatchedVideo(true);
    } else {
      setAllocatedPoints({ velocidade: 0, aceleracao: 0, turbo: 0, energia: 0, massa: 0 });
      setHasWatchedVideo(false);
    }
  }, [showUpgradeModal, ship.id]);

  // Timer countdown update
  useEffect(() => {
    if (!showUpgradeModal) return;
    const interval = setInterval(() => {
      const left = playerService.getShipBoostTimeLeft(ship.id);
      setTimeLeftMs(left);
    }, 1000);
    return () => clearInterval(interval);
  }, [showUpgradeModal, ship.id]);

  if (!showUpgradeModal) return null;

  const totalAllocated = 
    allocatedPoints.velocidade + 
    allocatedPoints.aceleracao + 
    allocatedPoints.turbo + 
    allocatedPoints.energia + 
    allocatedPoints.massa;

  const pointsAvailable = 5 - totalAllocated;

  const handleWatchAd = async () => {
    playSound("click", isMuted);
    setIsAdShowing(true);

    const success = await crazyGamesService.requestRewardedAd();
    if (success) {
      setHasWatchedVideo(true);
      playSound("transition", isMuted);
    }
    setIsAdShowing(false);
  };

  const handlePointChange = (attr: keyof ShipBoostPoints, delta: number) => {
    if (delta > 0 && pointsAvailable <= 0) return;
    if (delta < 0 && allocatedPoints[attr] <= 0) return;

    playSound("click", isMuted);
    setAllocatedPoints(prev => ({
      ...prev,
      [attr]: Math.max(0, prev[attr] + delta)
    }));
  };

  const handleResetPoints = () => {
    playSound("click", isMuted);
    setAllocatedPoints({
      velocidade: 0,
      aceleracao: 0,
      turbo: 0,
      energia: 0,
      massa: 0
    });
  };

  const handleConfirmBoost = () => {
    playSound("transition", isMuted);
    playerService.setShipBoost(ship.id, allocatedPoints, 15);
    onBoostApplied();
    onClose();
  };

  const formatTimeLeft = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const attributesList: Array<{
    key: keyof ShipBoostPoints;
    label: string;
    icon: any;
    base: number;
    color: string;
  }> = [
    { key: "velocidade", label: lt.velocidade, icon: Gauge, base: ship.velocidade, color: "text-orange-400" },
    { key: "aceleracao", label: lt.aceleracao, icon: Sparkles, base: ship.aceleracao, color: "text-amber-400" },
    { key: "turbo", label: lt.turbo, icon: Flame, base: ship.turbo, color: "text-red-400" },
    { key: "energia", label: lt.energia, icon: Battery, base: ship.energia, color: "text-emerald-400" },
    { key: "massa", label: lt.massa, icon: Scale, base: ship.massa, color: "text-cyan-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none"
    >
      <ModalCard
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="p-6 max-w-lg w-full relative overflow-hidden flex flex-col gap-5 border-orange-500/30"
      >
        {/* Top Sci-Fi Header line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-amber-600 animate-pulse" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6 text-orange-400 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
              {lt.upgradeTitle}
            </h2>
            <p className="text-[11px] font-mono text-orange-400 uppercase tracking-widest">
              {ship.name} ({ship.class})
            </p>
          </div>
        </div>

        {/* Active Boost Banner if present */}
        {timeLeftMs > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="w-4 h-4 animate-spin" />
              <span className="font-bold uppercase tracking-wider">{lt.boostActive}</span>
            </div>
            <span className="text-white font-bold text-sm tracking-widest bg-black/60 px-3 py-1 rounded-md border border-amber-500/40">
              {formatTimeLeft(timeLeftMs)}
            </span>
          </div>
        )}

        {/* Simulated Video Ad Progress Overlay */}
        <AnimatePresence>
          {isAdShowing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/95 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-zinc-800 border-t-orange-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-8 h-8 text-orange-500 fill-orange-500 animate-pulse" />
                </div>
              </div>
              <h3 className="text-base font-mono font-bold text-white uppercase tracking-widest mb-2">
                {lt.tuningVideo}
              </h3>
              <p className="text-xs font-mono text-zinc-400 uppercase max-w-xs mb-6">
                {lt.waitReward}
              </p>
              <div className="w-full max-w-xs h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 4, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Main Content */}
        {!hasWatchedVideo ? (
          /* Step 1: Watch Video Reward */
          <div className="flex flex-col gap-4 text-center py-2">
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {lt.rewardDesc} <strong className="text-orange-400 font-mono">{lt.fivePointsValue}</strong> <span className="text-white font-bold">{ship.name}</span>.
            </p>
            <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex flex-col gap-1 text-[10px] font-mono text-zinc-400 text-left">
              <div className="flex justify-between">
                <span>{lt.boostDurationLabel}</span>
                <span className="text-amber-400 font-bold">{lt.minutesValue}</span>
              </div>
              <div className="flex justify-between">
                <span>{lt.totalBonusLabel}</span>
                <span className="text-emerald-400 font-bold">{lt.fivePointsValue}</span>
              </div>
            </div>

            <SciFiButton
              variant="orange"
              onClick={handleWatchAd}
              disabled={isAdShowing}
              className="w-full py-3.5 rounded-xl text-xs font-mono tracking-widest group uppercase mt-2"
            >
              <Play className="w-4 h-4 fill-black group-hover:scale-125 transition-transform" />
              {lt.watchVideoBtn}
            </SciFiButton>
          </div>
        ) : (
          /* Step 2: Assign 5 Attribute Points */
          <div className="flex flex-col gap-4">
            {/* Points Summary Header */}
            <div className="flex items-center justify-between bg-black/60 border border-white/10 p-3 rounded-xl font-mono text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-zinc-400 uppercase">{lt.remainingPoints}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-base font-bold px-2.5 py-0.5 rounded-md border ${pointsAvailable > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'}`}>
                  {pointsAvailable} / 5
                </span>
                {totalAllocated > 0 && (
                  <button
                    onClick={handleResetPoints}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title={lt.resetTitle}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 5 Attribute Rows */}
            <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-1">
              {attributesList.map(attr => {
                const IconComp = attr.icon;
                const allocated = allocatedPoints[attr.key];
                const boostedValue = attr.base + allocated;

                return (
                  <div 
                    key={attr.key}
                    className="flex items-center justify-between bg-black/40 border border-white/10 p-2.5 rounded-xl gap-2 font-mono"
                  >
                    {/* Icon & Label */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className={`p-1.5 rounded-lg bg-white/5 ${attr.color}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-zinc-200 truncate">{attr.label}</span>
                        <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                          <span>{lt.baseLabel} {attr.base}</span>
                          {allocated > 0 && (
                            <span className="text-amber-400 font-bold">
                              ➔ Boost: {boostedValue} (+{allocated})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* +/- Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handlePointChange(attr.key, -1)}
                        disabled={allocated <= 0}
                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all cursor-pointer active:scale-95"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-6 text-center text-xs font-bold text-amber-400">
                        +{allocated}
                      </span>

                      <button
                        onClick={() => handlePointChange(attr.key, 1)}
                        disabled={pointsAvailable <= 0}
                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-2">
              <SciFiButton
                variant="ghost"
                onClick={handleWatchAd}
                className="py-3 px-3 rounded-xl text-[10px] font-mono tracking-wider shrink-0"
                title={lt.newVideoTitle}
              >
                <Play className="w-3.5 h-3.5" /> {lt.newVideoBtn}
              </SciFiButton>

              <SciFiButton
                variant="orange"
                onClick={handleConfirmBoost}
                className="flex-1 py-3.5 rounded-xl text-xs font-mono tracking-widest uppercase font-bold"
              >
                <Check className="w-4 h-4" />
                {lt.confirmBtn}
              </SciFiButton>
            </div>
          </div>
        )}
      </ModalCard>
    </motion.div>
  );
}
