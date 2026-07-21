import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { ROUTES_DATA } from "../../data";
import { RouteData } from "../../types";
import { Language, translateDifficulty } from "../../translations";

interface RouteCard3DProps {
  route: RouteData;
  index: number;
  activeIndex: number;
  setRouteIndex: (i: number) => void;
  isMobile: boolean;
  language: Language;
  t: any;
  isMuted: boolean;
  setSelectedRoute: (route: RouteData) => void;
  setIsSimulatorActive: (active: boolean) => void;
  onOpenLeaderboard: (routeId: string) => void;
  playSound: (type: string, isMuted: boolean) => void;
}

function RouteCard3D({
  route,
  index,
  activeIndex,
  setRouteIndex,
  isMobile,
  language,
  t,
  isMuted,
  setSelectedRoute,
  setIsSimulatorActive,
  onOpenLeaderboard,
  playSound
}: RouteCard3DProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowX, setGlowX] = useState(50);
  const [glowY, setGlowY] = useState(50);
  const cardRef = useRef<HTMLDivElement>(null);

  const isActive = index === activeIndex;
  
  const diff = (index - activeIndex + ROUTES_DATA.length) % ROUTES_DATA.length;
  const isLeft = diff === ROUTES_DATA.length - 1;
  const isRight = diff === 1;

  let xPos = 0;
  let zPos = 0;
  let rotateYPos = 0;
  let opacity = 0;
  let scale = 1;
  let pointerEvents: "auto" | "none" = "none";

  if (isActive) {
    xPos = 0;
    zPos = 200;
    rotateYPos = 0;
    opacity = 1;
    scale = 1.05;
    pointerEvents = "auto";
  } else if (isLeft) {
    xPos = isMobile ? -60 : -250;
    zPos = 0;
    rotateYPos = 45;
    opacity = 0.4;
    scale = 0.85;
    pointerEvents = "auto";
  } else if (isRight) {
    xPos = isMobile ? 60 : 250;
    zPos = 0;
    rotateYPos = -45;
    opacity = 0.4;
    scale = 0.85;
    pointerEvents = "auto";
  } else {
    xPos = diff > 1 && diff < ROUTES_DATA.length / 2 ? 400 : -400;
    zPos = -300;
    rotateYPos = 0;
    opacity = 0;
    scale = 0.5;
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setGlowX((mouseX / width) * 100);
    setGlowY((mouseY / height) * 100);

    const rX = -((mouseY - height / 2) / height) * 20;
    const rY = ((mouseX - width / 2) / width) * 20;
    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    if (!isActive) return;
    setRotateX(0);
    setRotateY(0);
    setGlowX(50);
    setGlowY(50);
  };

  const handleMouseEnter = () => {
    if (isActive) return;
    playSound("hover", isMuted);
  };

  const handleClick = () => {
    if (isActive) {
      playSound("click", isMuted);
      setSelectedRoute(route);
      setIsSimulatorActive(true);
    } else {
      playSound("click", isMuted);
      setRouteIndex(index);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      animate={{
        x: xPos,
        z: zPos,
        rotateY: rotateYPos + (isActive ? rotateY : 0),
        rotateX: isActive ? rotateX : 0,
        opacity,
        scale
      }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`absolute top-0 left-0 right-0 bottom-0 m-auto w-full max-w-[280px] h-[400px] rounded-xl flex flex-col items-center justify-between border-2 select-none overflow-visible shadow-2xl ${
        isActive 
          ? "border-orange-500/50 bg-black/80 z-30" 
          : "border-white/10 bg-black/60 z-20 hover:border-white/30"
      }`}
      style={{
        transformStyle: "preserve-3d",
        pointerEvents,
        boxShadow: isActive ? `
           ${-rotateY * 1.5}px ${rotateX * 1.5}px 30px rgba(0, 0, 0, 0.8),
           0 0 40px rgba(249, 115, 22, ${0.1 + Math.abs(rotateX)/40}),
           0 0 100px rgba(249, 115, 22, 0.05)
        ` : '0 10px 30px rgba(0,0,0,0.5)'
      }}
    >
      {isActive && (
        <div 
          className="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-300 opacity-60 z-10"
          style={{
            background: `radial-gradient(circle 200px at ${glowX}% ${glowY}%, rgba(249, 115, 22, 0.15), transparent 70%)`
          }}
        />
      )}

      {isActive && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(249,115,22,0.06),rgba(255,255,255,0.02),rgba(249,115,22,0.06))] bg-[size:100%_4px,6px_100%] opacity-20 pointer-events-none" />
      )}

      {isActive && (
        <>
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-orange-500" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-orange-500" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-orange-500" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-orange-500" />
        </>
      )}

      <div 
        className="w-full h-1/2 relative bg-zinc-900 rounded-t-xl overflow-hidden border-b border-white/10"
        style={{ transform: isActive ? "translateZ(20px)" : "none", transformStyle: "preserve-3d" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
        {isActive && (
          <div className="absolute inset-0 bg-orange-500/10 z-10 mix-blend-overlay" />
        )}
        <div className="absolute inset-0 flex items-center justify-center text-white/5 opacity-50 z-0">
          <span className="font-display font-black text-6xl rotate-[-15deg] whitespace-nowrap uppercase tracking-widest">{route.name}</span>
        </div>
      </div>

      <div 
        className="flex flex-col gap-4 p-5 w-full h-1/2 justify-between bg-gradient-to-b from-black/50 to-black rounded-b-xl relative z-20"
        style={{ transform: isActive ? "translateZ(35px)" : "none", transformStyle: "preserve-3d" }}
      >
        <div className="flex flex-col gap-1 items-center">
          <span className="text-orange-500 font-mono text-[9px] font-bold tracking-[0.2em] uppercase bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
            {t.system} {index + 1}
          </span>
          <h3 className="text-white font-display text-xl font-bold tracking-wider uppercase text-center drop-shadow-md">
            {route.name}
          </h3>
        </div>
        
        <div className="flex flex-col gap-3 w-full" style={{ transform: isActive ? "translateZ(10px)" : "none" }}>
          <div className="flex flex-col gap-1.5 bg-black/40 p-2.5 rounded-lg border border-white/5">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-500 uppercase">{t.testRings}:</span>
              <span className="text-white font-bold">{route.numRings}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-500 uppercase">{t.totalDistance}:</span>
              <span className="text-white font-bold">{route.totalDistance.toLocaleString()} m</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-500 uppercase">{t.difficulty}:</span>
              <span className={`font-bold uppercase tracking-wider ${
                route.difficulty === "Elite" || route.difficulty === "Sobrevivência" ? "text-red-500" :
                route.difficulty === "Difícil" ? "text-orange-500" :
                route.difficulty === "Médio" ? "text-amber-400" :
                "text-emerald-400"
              }`}>
                {translateDifficulty(route.difficulty, language)}
              </span>
            </div>
          </div>
          
          <button className={`w-full mt-2 py-3 text-white font-bold font-mono text-[10px] tracking-widest uppercase rounded transition-all cursor-pointer shadow-md ${
            isActive ? "bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400" : "bg-zinc-800 text-zinc-400 cursor-default"
          }`}>
            {isActive ? t.chooseRoute : t.selectRoute}
          </button>
        </div>
      </div>

      <div
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute inset-0 z-40 cursor-pointer rounded-xl"
      />

      {route.id !== "route-certification" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            playSound("click", isMuted);
            onOpenLeaderboard(route.id);
          }}
          style={{
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(30px)`,
            transformStyle: "preserve-3d",
          }}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-lg bg-black/85 hover:bg-orange-500/20 border border-white/15 hover:border-orange-500/40 text-zinc-400 hover:text-orange-400 transition-all cursor-pointer flex items-center justify-center shadow-lg group/leaderboard active:scale-95"
          title="Ver Classificação"
        >
          <Trophy className="w-5 h-5 group-hover/leaderboard:animate-pulse text-amber-400" />
        </button>
      )}
    </motion.div>
  );
}

interface RouteSelectionOverlayProps {
  isRouteSelectionOpen: boolean;
  setIsRouteSelectionOpen: (open: boolean) => void;
  routeIndex: number;
  setRouteIndex: (i: number) => void;
  isMobile: boolean;
  language: Language;
  t: any;
  isMuted: boolean;
  setSelectedRoute: (route: RouteData) => void;
  setIsSimulatorActive: (active: boolean) => void;
  onOpenLeaderboard: (routeId: string) => void;
  playSound: (type: string, isMuted: boolean) => void;
}

export function RouteSelectionOverlay({
  isRouteSelectionOpen,
  setIsRouteSelectionOpen,
  routeIndex,
  setRouteIndex,
  isMobile,
  language,
  t,
  isMuted,
  setSelectedRoute,
  setIsSimulatorActive,
  onOpenLeaderboard,
  playSound
}: RouteSelectionOverlayProps) {
  if (!isRouteSelectionOpen) return null;

  const nextRoute = () => {
    playSound("click", isMuted);
    setRouteIndex((routeIndex + 1) % ROUTES_DATA.length);
  };
  const prevRoute = () => {
    playSound("click", isMuted);
    setRouteIndex((routeIndex - 1 + ROUTES_DATA.length) % ROUTES_DATA.length);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 z-50 bg-gradient-to-b from-black/50 via-zinc-950/70 to-black/90 backdrop-blur-sm flex flex-col justify-center items-center p-6 md:p-12 overflow-hidden"
      >
        <button
          onClick={() => {
            playSound("click", isMuted);
            setIsRouteSelectionOpen(false);
          }}
          className="absolute top-6 left-6 md:top-12 md:left-12 z-50 px-5 py-2.5 bg-black/60 hover:bg-zinc-800/80 border border-white/10 rounded-lg text-zinc-400 hover:text-white font-mono text-[11px] font-bold tracking-widest uppercase transition-all cursor-pointer shadow-xl flex items-center gap-1.5 hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 text-orange-500" />
          {t.backToHangar}
        </button>
        
        <div className="flex flex-col items-center mb-8 text-center max-w-xl">
          <span className="text-[10px] font-mono tracking-[0.3em] text-orange-500 uppercase font-semibold mb-1.5 flex items-center gap-1.5 justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            {t.navSystem}
          </span>
          <h2 className="text-white font-display text-3xl font-extrabold tracking-[0.1em] uppercase">
            {t.selectRoute}
          </h2>
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-orange-500 to-transparent my-3" />
        </div>
        
        <div className="relative w-full max-w-7xl flex items-center gap-4 group/carousel">
          <button
            onClick={prevRoute}
            className="z-50 w-14 h-14 rounded-full bg-black/40 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/50 text-white/50 hover:text-orange-400 transition-all flex items-center justify-center cursor-pointer backdrop-blur-md active:scale-95 shadow-xl shrink-0"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <div 
            className="flex-1 relative h-[480px] flex items-center justify-center overflow-visible py-8" 
            style={{ perspective: "1500px", transformStyle: "preserve-3d" }}
          >
            {ROUTES_DATA.map((route, i) => (
              <RouteCard3D 
                key={route.id}
                route={route}
                index={i}
                activeIndex={routeIndex}
                setRouteIndex={setRouteIndex}
                isMobile={isMobile}
                language={language}
                t={t}
                isMuted={isMuted}
                setSelectedRoute={setSelectedRoute}
                setIsSimulatorActive={setIsSimulatorActive}
                onOpenLeaderboard={onOpenLeaderboard}
                playSound={playSound}
              />
            ))}
          </div>
          <button
            onClick={nextRoute}
            className="z-50 w-14 h-14 rounded-full bg-black/40 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/50 text-white/50 hover:text-orange-400 transition-all flex items-center justify-center cursor-pointer backdrop-blur-md active:scale-95 shadow-xl shrink-0"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
