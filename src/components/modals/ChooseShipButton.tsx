import React from "react";
import { Rocket, Lock } from "lucide-react";

interface ChooseShipButtonProps {
  t: any;
  onClick: () => void;
  isLocked: boolean;
  isMobile: boolean;
}

export function ChooseShipButton({ t, onClick, isLocked }: ChooseShipButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-8 py-4 border rounded-full text-white font-black font-mono text-xs tracking-[0.2em] uppercase cursor-pointer pointer-events-auto transition-all duration-300 group hover:scale-105 active:scale-95 ${
        isLocked 
          ? "bg-zinc-800 border-zinc-600 text-zinc-400 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
          : "bg-gradient-to-r from-orange-600 to-amber-500 border-orange-400/40 shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:shadow-[0_0_45px_rgba(249,115,22,0.6)]"
      }`}
    >
      {isLocked ? (
        <>
          <Lock className="w-4 h-4 text-zinc-400" />
          {t.prototypeLocked || "PROTÓTIPO BLOQUEADO"}
        </>
      ) : (
        <>
          <Rocket className="w-4 h-4 text-white group-hover:translate-y-[-2px] group-hover:translate-x-[2px] transition-transform duration-300 animate-pulse" />
          {t.chooseShip}
        </>
      )}
    </button>
  );
}
