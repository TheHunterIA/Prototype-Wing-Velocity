import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings, Globe, Sliders, Sparkles, Gauge, Volume2, VolumeX } from "lucide-react";
import { Language } from "../../translations";
import { ModalCard } from "../ui/ModalCard";
import { SciFiButton } from "../ui/SciFiButton";

interface SettingsModalProps {
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  graphicsQuality: "high" | "low";
  setGraphicsQuality: (quality: "high" | "low") => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  t: any;
  playSound: (type: string, isMuted: boolean) => void;
}

export function SettingsModal({
  isSettingsOpen,
  setIsSettingsOpen,
  language,
  setLanguage,
  graphicsQuality,
  setGraphicsQuality,
  isMuted,
  setIsMuted,
  t,
  playSound
}: SettingsModalProps) {
  if (!isSettingsOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
    >
      <ModalCard
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="p-6 max-w-sm w-full relative flex flex-col gap-6 select-none overflow-hidden"
      >
        {/* Header */}
        <div className="flex flex-col gap-1 relative z-10">
          <div className="flex items-center gap-2 text-orange-500 mb-0.5">
            <Settings className="w-3.5 h-3.5 animate-spin-slow" />
            <span className="text-[9px] font-mono tracking-[0.3em] font-bold uppercase">System_Setup</span>
          </div>
          <h2 className="text-white font-sans text-2xl font-light tracking-tight">
            {t.settings}
          </h2>
          <div className="h-px w-8 bg-orange-500 mt-2" />
        </div>

        <div className="flex flex-col gap-6 relative z-10">
          {/* Language Selection */}
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase font-bold flex items-center gap-2">
              <Globe className="w-3 h-3" />
              {t.languageLabel}
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { code: "pt", flagUrl: "https://flagcdn.com/br.svg", label: "Brasil", short: "PT" },
                { code: "en", flagUrl: "https://flagcdn.com/us.svg", label: "USA", short: "EN" },
                { code: "es", flagUrl: "https://flagcdn.com/es.svg", label: "Espanha", short: "ES" },
                { code: "fr", flagUrl: "https://flagcdn.com/fr.svg", label: "França", short: "FR" }
              ].map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as Language);
                      try {
                        localStorage.setItem("gameLanguage", lang.code);
                      } catch {}
                      playSound("click", isMuted);
                    }}
                    className={`group relative py-3 rounded-xl border transition-all duration-500 cursor-pointer flex flex-col items-center gap-2 ${
                      isSelected
                        ? "bg-white/5 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                        : "bg-transparent border-white/5 hover:border-white/20 hover:bg-white/[0.02]"
                    }`}
                  >
                    <img 
                      src={lang.flagUrl} 
                      alt={lang.label} 
                      className={`w-6 h-4 object-cover rounded-sm shadow-md transition-all duration-500 ${isSelected ? "brightness-110" : "grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100"}`}
                      referrerPolicy="no-referrer"
                    />
                    <span className={`text-[8px] font-mono font-bold tracking-widest ${isSelected ? "text-orange-500" : "text-zinc-600"}`}>
                      {lang.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase font-bold flex items-center gap-2">
              <Sliders className="w-3 h-3" />
              {t.graphics}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { code: "high", name: t.graphicsHigh, desc: t.graphicsHighDesc, icon: Sparkles },
                { code: "low", name: t.graphicsLow, desc: t.graphicsLowDesc, icon: Gauge }
              ].map((quality) => {
                const isSelected = graphicsQuality === quality.code;
                const IconComponent = quality.icon;
                return (
                  <button
                    key={quality.code}
                    onClick={() => {
                      setGraphicsQuality(quality.code as "high" | "low");
                      try {
                        localStorage.setItem("graphicsQuality", quality.code);
                      } catch {}
                      playSound("click", isMuted);
                    }}
                    className={`relative p-3.5 rounded-xl border transition-all duration-500 cursor-pointer flex flex-col gap-1.5 group ${
                      isSelected
                        ? "bg-white/5 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                        : "bg-transparent border-white/5 hover:border-white/20 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[11px] font-bold tracking-tight ${isSelected ? "text-white" : "text-zinc-500"}`}>
                        {quality.name}
                      </span>
                      <IconComponent className={`w-3 h-3 transition-transform duration-500 group-hover:scale-110 ${isSelected ? "text-orange-500" : "text-zinc-700"}`} />
                    </div>
                    <p className={`text-[9px] leading-snug text-left ${isSelected ? "text-zinc-400" : "text-zinc-600"}`}>
                      {quality.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio System */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                const newMuted = !isMuted;
                setIsMuted(newMuted);
                playSound("click", newMuted);
              }}
              className={`w-full p-3.5 rounded-xl border transition-all duration-500 cursor-pointer flex items-center justify-between group ${
                !isMuted 
                  ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10" 
                  : "bg-transparent border-white/5 hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-all duration-500 ${!isMuted ? "bg-emerald-500/10 text-emerald-500" : "bg-white/5 text-zinc-600"}`}>
                  {!isMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </div>
                <div className="flex flex-col text-left">
                  <span className={`text-[11px] font-bold ${!isMuted ? "text-white" : "text-zinc-500"}`}>
                    {!isMuted ? t.soundOn : t.soundOff}
                  </span>
                  <span className="text-[9px] text-zinc-600 font-medium">
                    {isMuted ? "Muted" : "Active"}
                  </span>
                </div>
              </div>
              
              <div className={`w-9 h-4.5 rounded-full p-1 transition-all duration-500 flex items-center ${!isMuted ? "bg-emerald-500" : "bg-zinc-800"}`}>
                <div className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all duration-500 ${!isMuted ? "translate-x-4.5" : "translate-x-0"}`} />
              </div>
            </button>
          </div>

          <SciFiButton
            onClick={() => {
              setIsSettingsOpen(false);
              playSound("click", isMuted);
            }}
            className="w-full py-3.5 mt-1 font-bold text-[11px] tracking-[0.2em] uppercase rounded-xl"
          >
            {t.close}
          </SciFiButton>
        </div>
      </ModalCard>
    </motion.div>
  );
}
