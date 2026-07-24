import React from "react";
import { Rocket, Lock, Play, Clock } from "lucide-react";

interface ChooseShipButtonProps {
  t: any;
  onClick: () => void;
  isLocked: boolean;
  requiredLevel: number;
  tempLicenseTimeLeft: number;
  onGetTempLicense: () => void;
  isMobile: boolean;
  allowTempLicense?: boolean;
}

export function ChooseShipButton({
  t,
  onClick,
  isLocked,
  requiredLevel,
  tempLicenseTimeLeft,
  onGetTempLicense,
  allowTempLicense = true,
}: ChooseShipButtonProps) {
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Active Temporary License Badge */}
      {tempLicenseTimeLeft > 0 && allowTempLicense && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 font-mono text-[10px] font-bold uppercase shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{t.tempLicenseActive}: {formatTime(tempLicenseTimeLeft)}</span>
        </div>
      )}

      {/* Main Choose/Locked Button */}
      {isLocked ? (
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center gap-2 px-5 py-3.5 bg-zinc-900/90 border border-zinc-700/80 rounded-full text-zinc-400 font-mono text-xs font-black tracking-widest uppercase shadow-lg">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>{t.requiredLevel} {requiredLevel}</span>
          </div>

          {allowTempLicense && (
            <button
              onClick={onGetTempLicense}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-cyan-600 via-teal-500 to-cyan-400 border border-cyan-300/50 rounded-full text-white font-mono text-xs font-black tracking-widest uppercase cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] group"
            >
              <Play className="w-3.5 h-3.5 fill-white group-hover:scale-125 transition-transform" />
              <span>{t.testFor15Min}</span>
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={onClick}
          className="flex items-center gap-3 px-8 py-4 border rounded-full text-white font-black font-mono text-xs tracking-[0.2em] uppercase cursor-pointer pointer-events-auto transition-all duration-300 group hover:scale-105 active:scale-95 bg-gradient-to-r from-cyan-600 to-teal-400 border-cyan-300/40 shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:shadow-[0_0_45px_rgba(34,211,238,0.6)]"
        >
          <Rocket className="w-4 h-4 text-white group-hover:translate-y-[-2px] group-hover:translate-x-[2px] transition-transform duration-300 animate-pulse" />
          {t.chooseShip || "ESCOLHER NAVE"}
        </button>
      )}
    </div>
  );
}
