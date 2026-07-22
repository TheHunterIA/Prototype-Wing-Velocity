import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Play } from "lucide-react";
import { ModalCard } from "../ui/ModalCard";
import { SciFiButton } from "../ui/SciFiButton";

interface AdModalProps {
  showAdModal: boolean;
  isAdShowing: boolean;
  adTarget: { id: string; type: 'ship' | 'skin'; name: string } | null;
  t: any; // translation dict
  onClose: () => void;
  onRequestLicense: () => void;
}

export function AdModal({
  showAdModal,
  isAdShowing,
  adTarget,
  t,
  onClose,
  onRequestLicense
}: AdModalProps) {
  return (
    <AnimatePresence>
      {showAdModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
      <ModalCard
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="p-8 max-w-sm w-full relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-300" />
        
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center border border-white/10 shadow-inner">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-display font-black text-white uppercase tracking-tighter">
              {adTarget?.type === 'ship' ? t.prototypeLocked : t.skinLocked}
            </h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {adTarget?.name}
            </p>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {t.adAuthDesc}
            <br /><br />
            {t.watchAdDesc} <span className="text-white font-bold">{t.temporaryLicense} (15 Minutos)</span>.
          </p>
          <div className="flex flex-col gap-3 w-full mt-2">
            <SciFiButton
              variant="orange"
              onClick={onRequestLicense}
              disabled={isAdShowing}
              className="w-full py-4 rounded-xl text-[10px] tracking-[0.2em] group"
            >
              {isAdShowing ? (
                <span className="animate-pulse">{t.tuning}</span>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-black group-hover:scale-125 transition-transform duration-500" />
                  ▶ {t.temporaryLicense}
                </>
              )}
            </SciFiButton>
            
            <div className="flex justify-between items-center px-1">
              <span className="text-[8px] font-mono text-zinc-600 uppercase">{t.validity15Min}</span>
              <span className="text-[8px] font-mono text-zinc-600 uppercase italic">{t.temporaryLicense}</span>
            </div>
            
            <SciFiButton
              variant="ghost"
              onClick={onClose}
              disabled={isAdShowing}
              className="w-full py-3 rounded-xl text-[9px] tracking-widest text-zinc-500 hover:text-white"
            >
              {t.cancel}
            </SciFiButton>
          </div>
        </div>
      </ModalCard>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
