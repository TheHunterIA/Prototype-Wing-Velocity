import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Paintbrush, Check, Lock } from "lucide-react";
import { Language } from "../../translations";
import { skinTranslations } from "../../dataTranslations";
import { SKINS_DATA } from "../../data";
import { playerService } from "../../services/playerService";

interface ColorSelectorProps {
  selectedColor: typeof SKINS_DATA[0];
  isColorPanelOpen: boolean;
  setIsColorPanelOpen: (open: boolean) => void;
  handleSelectColor: (colorObj: typeof SKINS_DATA[0]) => void;
  onHoverColor?: (colorObj: typeof SKINS_DATA[0] | null) => void;
  playSound: (type: string, isMuted: boolean) => void;
  isMuted: boolean;
  language: Language;
  t: any;
}

export function ColorSelector({
  selectedColor,
  isColorPanelOpen,
  setIsColorPanelOpen,
  handleSelectColor,
  onHoverColor,
  playSound,
  isMuted,
  language,
  t
}: ColorSelectorProps) {
  const [hoveredColorName, setHoveredColorName] = useState<string | null>(null);
  const [hoveredColorId, setHoveredColorId] = useState<string | null>(null);

  const hasCompletedCert = playerService.hasCompletedCertification();
  const hasCompletedDyson = playerService.hasCompletedDyson();
  const hasCompletedSupernova = playerService.hasCompletedSupernova();

  const getSkinName = (skinId: string) => {
    return skinTranslations[language]?.[skinId]?.name || SKINS_DATA.find(s => s.id === skinId)?.name || skinId;
  };

  const activeOrHoveredId = hoveredColorId || selectedColor.id;
  const isEarthLocked = (skinId: string) => skinId === "earth-harmony" && !hasCompletedCert;
  const isSucataLocked = (skinId: string) => skinId === "sucata-espacial" && !hasCompletedDyson;
  const isSupernovaLocked = (skinId: string) => skinId === "supernova" && !hasCompletedSupernova;
  const isSkinLocked = (skinId: string) => playerService.isSkinLocked(skinId);

  const currentHoveredOrActiveLocked = isSkinLocked(activeOrHoveredId);

  // Put unlocked skins first, and locked skins at the end
  const sortedSkins = [...SKINS_DATA].sort((a, b) => {
    const aLocked = isSkinLocked(a.id) ? 1 : 0;
    const bLocked = isSkinLocked(b.id) ? 1 : 0;
    return aLocked - bLocked;
  });

  return (
    <div className="relative flex items-center justify-end gap-3 pointer-events-auto">
      <AnimatePresence initial={false}>
        {isColorPanelOpen && (
          <motion.div
            initial={{ opacity: 0, x: 25, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 25, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-end gap-2.5 p-3.5 bg-black/85 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl w-max max-w-[92vw] sm:max-w-fit"
          >
            {/* Header info bar displaying current skin name */}
            <div className="w-full flex items-center justify-between gap-3 border-b border-white/10 pb-2 px-0.5">
              <span className="text-[10px] font-mono tracking-wider text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                <Paintbrush className="w-3.5 h-3.5 text-cyan-400" />
              </span>
              <span className="text-[10px] font-mono tracking-widest text-cyan-200 uppercase bg-cyan-950/90 px-2.5 py-0.5 rounded border border-cyan-500/40 shadow-sm truncate max-w-[200px]">
                {hoveredColorName || getSkinName(selectedColor.id)}
              </span>
            </div>

            {/* Locked banner if hovering or selected Planeta Terra, Supernova or Sucata Espacial without requirement */}
            {currentHoveredOrActiveLocked && (
              <div className="w-full text-[10px] font-mono text-amber-300 bg-amber-950/80 border border-amber-500/50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                <span>
                  {isEarthLocked(activeOrHoveredId) ? (
                    language === "pt"
                      ? "Conclua o Voo de Certificação para liberar"
                      : language === "es"
                      ? "Completa el Vuelo de Certificación para desbloquear"
                      : language === "fr"
                      ? "Terminez le Vol de Certification pour débloquer"
                      : "Complete Certification Flight to unlock"
                  ) : isSupernovaLocked(activeOrHoveredId) ? (
                    language === "pt"
                      ? "Conclua a rota Remanescente de Supernova para liberar"
                      : language === "es"
                      ? "Completa la ruta Remanente de Supernova para desbloquear"
                      : language === "fr"
                      ? "Terminez la route Rémanent de Supernova pour débloquer"
                      : "Complete Supernova Remnant route to unlock"
                  ) : (
                    language === "pt"
                      ? "Conclua a rota Sucata de Dyson para liberar"
                      : language === "es"
                      ? "Completa la ruta Chatarra de Dyson para desbloquear"
                      : language === "fr"
                      ? "Terminez la route Débris de Dyson pour débloquer"
                      : "Complete Dyson Scraps route to unlock"
                  )}
                </span>
              </div>
            )}

            {/* Container for all color/skin buttons in a single horizontal line */}
            <div className="flex flex-nowrap items-center justify-start sm:justify-end gap-1.5 sm:gap-2 pt-0.5 w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 px-0.5">
              {sortedSkins.map((colorObj) => {
                const isActive = colorObj.id === selectedColor.id;
                const skinName = getSkinName(colorObj.id);
                const isLockedSkin = isSkinLocked(colorObj.id);
                
                const isMK2 = colorObj.id === "prototype-wing-2";
                const isSupernova = colorObj.id === "supernova";
                const isSucata = colorObj.id === "sucata-espacial";
                
                const bgColor = isMK2 ? "#000000" : (isSupernova ? "#ff9900" : (isSucata ? "#cbd5e1" : colorObj.colorHex));
                const borderColorClass = isLockedSkin
                  ? "border-amber-400 border-2"
                  : isMK2 
                    ? "border-amber-400 border-2" 
                    : isSupernova
                      ? "border-black border-2"
                      : isSucata
                        ? "border-[#c86432] border-2"
                        : isActive 
                          ? "border-white ring-2 ring-cyan-400 z-10" 
                          : "border-white/30 hover:border-white/80";

                return (
                  <button
                    key={colorObj.id}
                    onClick={() => {
                      playSound("paint", isMuted);
                      handleSelectColor(colorObj);
                    }}
                    onMouseEnter={() => {
                      setHoveredColorName(skinName);
                      setHoveredColorId(colorObj.id);
                      onHoverColor?.(colorObj);
                    }}
                    onMouseLeave={() => {
                      setHoveredColorName(null);
                      setHoveredColorId(null);
                      onHoverColor?.(null);
                    }}
                    className={`
                      w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-200 relative flex items-center justify-center shrink-0 cursor-pointer hover:scale-110 active:scale-95
                      ${borderColorClass}
                      ${isActive ? "scale-110 shadow-lg z-10" : isLockedSkin ? "opacity-80" : "opacity-80 hover:opacity-100"}
                      ${isMK2 && isActive ? "ring-2 ring-amber-300" : ""}
                      ${isSupernova && isActive ? "ring-2 ring-amber-400" : ""}
                      ${isSucata && isActive ? "ring-2 ring-[#e57c35]" : ""}
                      ${isLockedSkin ? "ring-1 ring-amber-400/60" : ""}
                    `}
                    style={{
                      backgroundColor: bgColor,
                      boxShadow: isMK2
                        ? isActive
                          ? `0 0 18px #f59e0b, inset 0 0 8px #f59e0b`
                          : `0 0 8px rgba(245, 158, 11, 0.6)`
                        : isSupernova
                          ? isActive
                            ? `0 0 20px #ff9900, inset 0 0 8px #000000`
                            : `0 0 10px rgba(255, 153, 0, 0.9)`
                          : isSucata
                            ? isActive
                              ? `0 0 18px #c86432, inset 0 0 6px #ca6f1e`
                              : `0 0 10px rgba(200, 100, 50, 0.8)`
                            : isLockedSkin
                              ? `0 0 10px rgba(245, 158, 11, 0.8)`
                              : isActive 
                                ? `0 0 16px ${colorObj.colorHex}, inset 0 0 6px rgba(255,255,255,0.6)` 
                                : `0 0 8px ${colorObj.colorHex}55`
                    }}
                    title={
                      isLockedSkin
                        ? `${skinName} (${
                            isEarthLocked(colorObj.id)
                              ? (language === "pt" ? "Bloqueado: Conclua o Voo de Certificação" : "Locked: Complete Certification Flight")
                              : isSupernovaLocked(colorObj.id)
                                ? (language === "pt" ? "Bloqueado: Conclua a rota Remanescente de Supernova" : "Locked: Complete Supernova Remnant route")
                                : (language === "pt" ? "Bloqueado: Conclua a rota Sucata de Dyson" : "Locked: Complete Dyson Scraps route")
                          })`
                        : skinName
                    }
                  >
                    {/* Inner copper accent for Sucata */}
                    {isSucata && (
                      <span className="absolute w-4 h-4 rounded-full border border-[#ca6f1e]/80 bg-[#c86432]/10 pointer-events-none" />
                    )}
                    {isLockedSkin ? (
                      <Lock className="w-4 h-4 text-amber-300 stroke-[2.5] z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                    ) : isActive ? (
                      <Check className={`w-4 h-4 stroke-[3] z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${isMK2 ? "text-amber-400" : (isSupernova ? "text-black" : (isSucata ? "text-[#7a3306]" : (colorObj.colorHex === "#ffffff" ? "text-slate-900 drop-shadow-none" : "text-white")))}`} />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          playSound("click", isMuted);
          setIsColorPanelOpen(!isColorPanelOpen);
        }}
        className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/80 border transition-all duration-300 flex items-center justify-center cursor-pointer pointer-events-auto backdrop-blur-md active:scale-95 shadow-2xl relative group shrink-0
          ${isColorPanelOpen ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] ring-2 ring-cyan-400/50' : 'border-white/20 hover:border-cyan-400/70'}
        `}
        title={isColorPanelOpen ? t.closeSelection : t.openSelection}
      >
        <div className="relative">
          <Paintbrush className={`w-5 h-5 transition-transform duration-300 ${isColorPanelOpen ? 'text-cyan-400 rotate-12 scale-110' : 'text-white/90 group-hover:text-cyan-300 group-hover:-rotate-12'}`} />
          <span 
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 shadow-md transition-colors duration-300 ${selectedColor.id === "prototype-wing-2" ? "border-amber-400" : (selectedColor.id === "sucata-espacial" ? "border-[#c86432]" : "border-black")}`} 
            style={{ backgroundColor: selectedColor.id === "prototype-wing-2" ? "#000000" : (selectedColor.id === "sucata-espacial" ? "#cbd5e1" : selectedColor.colorHex) }}
          />
          {isSkinLocked(selectedColor.id) && (
            <Lock className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-amber-300 bg-black/90 rounded-full p-0.5 border border-amber-400/80" />
          )}
        </div>
      </button>
    </div>
  );
}
