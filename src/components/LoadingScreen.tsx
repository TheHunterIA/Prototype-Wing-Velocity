import { useProgress } from "@react-three/drei";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export function LoadingScreen({ onProgress, forceExit = false, onExited }: { onProgress?: (p: number) => void, forceExit?: boolean, onExited?: () => void }) {
  const { progress, active } = useProgress();
  const [shouldExit, setShouldExit] = useState(false);
  const onExitedRef = useRef(onExited);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onExitedRef.current = onExited;
    onProgressRef.current = onProgress;
  }, [onExited, onProgress]);
  
  useEffect(() => {
    if (onProgressRef.current) onProgressRef.current(progress);
    if (!active && progress === 100) {
      // Small delay to ensure everything is initialized
      const timer = setTimeout(() => {
        setShouldExit(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [progress, active]);

  return (
    <AnimatePresence onExitComplete={() => { if (onExitedRef.current) onExitedRef.current(); }}>
      {(!shouldExit && !forceExit) && (
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center select-none overflow-hidden bg-black"
        >
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <img 
              src="/loading_bg.webp" 
              alt="Loading Background" 
              className="w-full h-full object-cover opacity-100"
            />
          </div>
          
          <div className="absolute bottom-12 left-0 right-0 z-10 flex flex-col items-center justify-center px-4">
            <div className="px-6 py-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md flex flex-col items-center shadow-2xl">
              <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden mb-3 border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-600 via-teal-400 to-cyan-300 transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.5)]" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="font-mono text-[10px] font-bold tracking-[0.3em] text-white/90 uppercase">
                SISTEMAS ONLINE ... {Math.round(progress)}%
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
