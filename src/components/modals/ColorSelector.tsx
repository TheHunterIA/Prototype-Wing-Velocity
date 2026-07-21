import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Paintbrush } from "lucide-react";
import { SKINS_DATA } from "../../data";

interface ColorSelectorProps {
  selectedColor: typeof SKINS_DATA[0];
  isColorPanelOpen: boolean;
  setIsColorPanelOpen: (open: boolean) => void;
  handleSelectColor: (colorObj: typeof SKINS_DATA[0]) => void;
  playSound: (type: string, isMuted: boolean) => void;
  isMuted: boolean;
}

export function ColorSelector({
  selectedColor,
  isColorPanelOpen,
  setIsColorPanelOpen,
  handleSelectColor,
  playSound,
  isMuted
}: ColorSelectorProps) {
  const [hoveredColorName, setHoveredColorName] = useState<string | null>(null);

  return (
    <div className="absolute right-8 bottom-6 z-20 flex items-center justify-end gap-3">
      <AnimatePresence initial={false}>
        {isColorPanelOpen && (
          <motion.div
            initial={{ opacity: 0, x: 25, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 25, scale: 0.9 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-end gap-1.5 pointer-events-auto"
          >
            {/* Active/Hovered sci-fi color name indicator */}
            <div className="flex flex-col items-end gap-2">
              <span className="text-[9px] font-mono tracking-widest text-orange-400 uppercase bg-black/80 px-2.5 py-1 rounded-md border border-white/10 shadow-lg select-none backdrop-blur-md">
                {hoveredColorName || selectedColor.name}
              </span>
            </div>

            {/* Horizontal strip of color buttons */}
            <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-xl border border-white/10 p-2.5 rounded-full shadow-2xl max-w-lg overflow-x-auto scrollbar-none shrink-0">
              {SKINS_DATA.map((colorObj) => {
                const isActive = colorObj.id === selectedColor.id;
                return (
                  <button
                    key={colorObj.id}
                    onClick={() => handleSelectColor(colorObj)}
                    onMouseEnter={() => setHoveredColorName(colorObj.name)}
                    onMouseLeave={() => setHoveredColorName(null)}
                    className={`
                      w-7 h-7 rounded-full transition-all duration-300 relative flex items-center justify-center cursor-pointer hover:scale-115 active:scale-90 border shrink-0
                      ${isActive ? "scale-110 shadow-lg border-white/60" : "opacity-75 hover:opacity-100 border-white/20"}
                    `}
                    style={{
                      backgroundColor: colorObj.colorHex,
                      boxShadow: isActive ? `0 0 14px ${colorObj.colorHex}88, inset 0 0 4px rgba(255,255,255,0.4)` : 'none'
                    }}
                    title={colorObj.name}
                  >
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                    )}
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
          w-14 h-14 rounded-full bg-black/50 hover:bg-black/75 border transition-all duration-500 flex items-center justify-center cursor-pointer pointer-events-auto backdrop-blur-md active:scale-95 shadow-2xl relative group shrink-0
          ${isColorPanelOpen ? 'border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-white/10 hover:border-orange-500/50'}
        `}
        title={isColorPanelOpen ? "Fechar seleção de cores" : "Abrir seleção de cores"}
      >
        <div className="relative">
          <Paintbrush className={`w-5 h-5 transition-transform duration-500 ${isColorPanelOpen ? 'text-orange-500 rotate-12 scale-110' : 'text-white/80 group-hover:text-orange-400 group-hover:-rotate-12'}`} />
          <span 
            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-black/80 shadow-md transition-colors duration-500" 
            style={{ backgroundColor: selectedColor.colorHex }}
          />
        </div>
      </button>
    </div>
  );
}
