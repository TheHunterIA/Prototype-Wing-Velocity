import { useProgress } from "@react-three/drei";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export function LoadingScreen({ 
  onProgress, 
  forceExit = false, 
  onExited,
  children
}: { 
  onProgress?: (p: number) => void, 
  forceExit?: boolean, 
  onExited?: () => void,
  children?: React.ReactNode
}) {
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
          </div>

          {/* Renderização da nave 3D em destaque no centro da tela de carregamento */}
          {children && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              {children}
            </div>
          )}
          
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-center w-72 sm:w-80 px-2 pointer-events-none">
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300 shadow-[0_0_8px_rgba(34,211,238,0.4)]" 
                style={{ width: `${progress}%` }} 
              />
            </div>
            <div className="flex justify-between items-center w-full mt-2 font-mono text-[10px] text-zinc-400 uppercase tracking-wider opacity-85">
              <span>
                {progress < 35 ? "ALINHANDO NAVE" : progress < 75 ? "CALIBRANDO SISTEMAS" : "SISTEMAS PRONTOS"}
              </span>
              <span className="text-cyan-400 font-semibold">{Math.round(progress)}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
