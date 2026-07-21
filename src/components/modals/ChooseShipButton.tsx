import React from "react";
import { Play } from "lucide-react";
import { SciFiButton } from "../ui/SciFiButton";

interface ChooseShipButtonProps {
  t: any;
  onClick: () => void;
  isLocked: boolean;
  isMobile: boolean;
}

export function ChooseShipButton({ t, onClick, isLocked, isMobile }: ChooseShipButtonProps) {
  return (
    <div className={`absolute ${isMobile ? 'bottom-8' : 'bottom-12'} left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4 group`}>
      <SciFiButton
        variant="orange"
        onClick={onClick}
        className="w-full py-4 text-[12px] font-black uppercase tracking-[0.2em] relative overflow-hidden"
      >
        <span className="relative z-10 flex items-center gap-3">
          {isLocked ? (
            <>
              {t.prototypeLocked}
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-black group-hover:scale-125 transition-transform duration-500" />
              {t.openHangar || "[ OPEN HANGAR ]"}
            </>
          )}
        </span>
        {/* Glow effect passing over the button */}
        {!isLocked && (
          <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />
        )}
      </SciFiButton>
    </div>
  );
}
