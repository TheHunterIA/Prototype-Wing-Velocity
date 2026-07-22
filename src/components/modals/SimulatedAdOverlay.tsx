import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, TerminalSquare } from "lucide-react";

import { Language, translations } from "../../translations";

interface SimulatedAdOverlayProps {
  isAdShowing: boolean;
  language: Language;
}

export function SimulatedAdOverlay({ isAdShowing, language }: SimulatedAdOverlayProps) {
  const [step, setStep] = useState(0);
  const t = translations[language];

  useEffect(() => {
    if (isAdShowing) {
      setStep(0);
      const s1 = setTimeout(() => setStep(1), 800);
      const s2 = setTimeout(() => setStep(2), 1600);
      const s3 = setTimeout(() => setStep(3), 2800);
      const s4 = setTimeout(() => setStep(4), 3800);
      return () => {
        clearTimeout(s1);
        clearTimeout(s2);
        clearTimeout(s3);
        clearTimeout(s4);
      };
    }
  }, [isAdShowing]);

  return (
    <AnimatePresence>
      {isAdShowing && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-left font-mono"
        >
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900 via-black to-black" />
        <div className="h-full w-full absolute top-0 left-0 animate-scanline bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent" />
      </div>
      
      <div className="relative w-full max-w-md border border-emerald-900/50 bg-emerald-950/20 p-6 rounded shadow-[0_0_50px_rgba(16,185,129,0.1)]">
        <div className="flex items-center gap-3 mb-6 border-b border-emerald-900/50 pb-4">
          <TerminalSquare className="w-6 h-6 text-emerald-500" />
          <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">
            STARSPARROW SECURE TERMINAL
          </h3>
        </div>

        <div className="space-y-4 text-xs tracking-wider text-emerald-400">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {`> ${t.authRequest}`}
          </motion.div>

          {step >= 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {`> ${t.connecting}`}
              <div className="mt-1 animate-pulse">██████░░░░░░░</div>
            </motion.div>
          )}

          {step >= 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {`> ${t.checkingLicense}`}
              <div className="mt-1 animate-pulse">█████████░░░</div>
            </motion.div>
          )}

          {step >= 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-amber-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              {`> ${t.tempLicenseFound}`}
            </motion.div>
          )}

          {step >= 4 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white mt-4 font-bold">
              {`> ${t.openingHangar}`}
            </motion.div>
          )}
        </div>

        {/* Simulation Progress Bar */}
        <div className="w-full h-1 bg-zinc-900 mt-8 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "linear" }}
            className="h-full bg-emerald-500"
          />
        </div>
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
