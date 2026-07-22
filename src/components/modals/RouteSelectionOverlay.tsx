import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Trophy, Lock } from "lucide-react";
import { ROUTES_DATA } from "../../data";
import { RouteData } from "../../types";
import { Language, translateDifficulty, routeTranslations } from "../../translations";
import { playerService } from "../../services/playerService";

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
    xPos = isMobile ? -50 : -200;
    zPos = 0;
    rotateYPos = 45;
    opacity = 0.4;
    scale = 0.82;
    pointerEvents = "auto";
  } else if (isRight) {
    xPos = isMobile ? 50 : 200;
    zPos = 0;
    rotateYPos = -45;
    opacity = 0.4;
    scale = 0.82;
    pointerEvents = "auto";
  } else {
    xPos = diff > 1 && diff < ROUTES_DATA.length / 2 ? 340 : -340;
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

  const isRouteUnlocked = playerService.data.level >= route.requiredLevel;
  const routeTrans = routeTranslations[language]?.[route.id];
  const routeName = routeTrans ? routeTrans.name : route.name;

  const handleClick = () => {
    if (isActive) {
      if (!isRouteUnlocked) {
        playSound("click", isMuted);
        return;
      }
      playSound("click", isMuted);

      // Solicita o Pointer Lock AQUI, de forma síncrona, dentro do clique real do usuário.
      // É o único momento em que o navegador aceita a chamada sem exigir um novo gesto:
      // se pedirmos depois (ex: num setTimeout após a animação de decolagem, como era feito
      // antes em SpaceSimulator.tsx), a "user activation" do clique já expirou e o navegador
      // rejeita silenciosamente. Travamos em document.body porque o container do simulador
      // ainda nem existe no DOM neste instante (o SpaceSimulator só monta a seguir).
      if (document.body.requestPointerLock) {
        document.body.requestPointerLock().catch(() => {
          // Alguns navegadores exigem que o documento já esteja em foco/visível; se falhar
          // aqui, o próprio SpaceSimulator ainda tenta de novo no primeiro clique dentro do jogo.
        });
      }

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
      className={`absolute top-0 left-0 right-0 bottom-0 m-auto w-full max-w-[240px] md:max-w-[260px] h-[clamp(290px,42vh,380px)] rounded-2xl flex flex-col items-center justify-between border select-none overflow-visible shadow-2xl transition-all duration-300 ${
        isActive 
          ? "border-cyan-400/60 bg-black/40 backdrop-blur-xl z-30" 
          : "border-white/5 bg-black/40 backdrop-blur-md z-20 grayscale-[0.5] opacity-60 hover:opacity-80 hover:grayscale-0 hover:border-white/20"
      }`}
      style={{
        transformStyle: "preserve-3d",
        pointerEvents,
        boxShadow: isActive ? `
           ${-rotateY * 1.5}px ${rotateX * 1.5}px 40px rgba(0, 0, 0, 0.9),
           0 0 50px rgba(34, 211, 238, ${0.15 + Math.abs(rotateX)/50}),
           0 0 120px rgba(34, 211, 238, 0.08)
        ` : '0 10px 40px rgba(0,0,0,0.6)'
      }}
    >
      {/* Internal Glow Pulse */}
      {isActive && (
        <motion.div 
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-cyan-400/5 rounded-2xl pointer-events-none"
        />
      )}

      {isActive && (
        <div 
          className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-300 opacity-40 z-10"
          style={{
            background: `radial-gradient(circle 250px at ${glowX}% ${glowY}%, rgba(34, 211, 238, 0.3), transparent 80%)`
          }}
        />
      )}

      {/* Sci-fi corners with scanning animation */}
      {isActive && (
        <>
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/80 rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/80 rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/80 rounded-br-2xl" />
          
          {/* Animated Scanning Line */}
          <motion.div 
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent z-20 pointer-events-none"
          />
        </>
      )}

      <motion.div
        className="w-full h-[clamp(100px,18vh,160px)] shrink-0 relative bg-zinc-950 rounded-t-2xl overflow-hidden border-b border-white/10 group/img"
        style={{ 
          transform: isActive ? "translateZ(40px)" : "none", 
          transformStyle: "preserve-3d" 
        }}
      >
        <img 
          src={route.image} 
          alt={routeName}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${isActive ? 'scale-125 opacity-100' : 'scale-100 opacity-60'}`}
          referrerPolicy="no-referrer"
          style={{
            transform: isActive ? `translateX(${rotateY * 0.4}px) translateY(${-rotateX * 0.4}px)` : 'none'
          }}
        />
        
        {/* Holographic Overlay Layer */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%),linear-gradient(90deg,rgba(34,211,238,0.1),rgba(255,255,255,0.05),rgba(34,211,238,0.1))] bg-[size:100%_2px,12px_100%] opacity-30 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
        
        {isActive && (
          <div className="absolute inset-0 bg-cyan-400/10 z-10 mix-blend-overlay animate-pulse" />
        )}

        {/* Floating ID Tag (Extreme Parallax) */}
        {isActive && (
          <div 
            className="absolute top-4 left-4 z-30 bg-cyan-400 text-black font-black font-mono text-[8px] px-2 py-0.5 rounded-sm shadow-[0_0_15px_rgba(34,211,238,0.5)]"
            style={{ transform: "translateZ(60px)" }}
          >
            HD-DATA
          </div>
        )}
      </motion.div>

      <div 
        className="flex flex-col gap-1.5 md:gap-3 p-2.5 md:p-4 w-full flex-1 min-h-0 justify-between bg-gradient-to-b from-black/40 to-black/95 rounded-b-2xl relative z-20 overflow-hidden"
        style={{ transform: isActive ? "translateZ(80px)" : "none", transformStyle: "preserve-3d" }}
      >
        <div className="flex flex-col gap-2 items-center" style={{ transform: "translateZ(20px)" }}>
          <div className="flex items-center gap-2">
            <div className="h-[1px] w-6 bg-cyan-400/30" />
            <span className="text-cyan-400 font-mono text-[9px] font-black tracking-[0.4em] uppercase">
              {t.system} {index + 1}
            </span>
            <div className="h-[1px] w-6 bg-cyan-400/30" />
          </div>
          <h3 className="text-white font-display text-lg md:text-xl font-black tracking-widest uppercase text-center drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] line-clamp-2" title={routeName}>
            {routeName}
          </h3>
        </div>
        
        <div className="flex flex-col gap-2.5 w-full" style={{ transform: "translateZ(40px)" }}>
          <div className="flex flex-col gap-2 bg-white/5 p-2.5 md:p-3 rounded-xl border border-white/10 backdrop-blur-2xl relative overflow-hidden shadow-inner">
            {/* Display Stats like a Cockpit */}
            <div className="flex justify-between items-center gap-2 text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-tighter opacity-70 truncate min-w-0">{t.testRings}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`w-1 h-3 skew-x-[-20deg] ${i < (route.numRings / 5) ? 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'bg-zinc-800'}`} />
                  ))}
                </div>
                <span className="text-white font-black">{route.numRings}</span>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2 text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-tighter opacity-70 truncate min-w-0">{t.totalDistance}</span>
              <span className="text-white font-black shrink-0">{route.totalDistance.toLocaleString()} M</span>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between items-center gap-2 text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-tighter opacity-70 truncate min-w-0">{t.difficulty}</span>
              <div className="flex items-center gap-2 shrink-0 max-w-[55%]">
                <span className={`font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm text-[9px] truncate ${
                  route.difficulty === "Elite" || route.difficulty === "Sobrevivência" ? "text-red-500 bg-red-500/20 border border-red-500/30" :
                  route.difficulty === "Difícil" ? "text-orange-500 bg-orange-500/20 border border-orange-500/30" :
                  route.difficulty === "Médio" ? "text-amber-400 bg-amber-400/20 border border-amber-400/30" :
                  "text-emerald-400 bg-emerald-400/20 border border-emerald-400/30"
                }`}>
                  {translateDifficulty(route.difficulty, language)}
                </span>
              </div>
            </div>
          </div>
          
          <button className={`w-full py-2.5 md:py-3 text-white font-black font-mono text-[10px] tracking-[0.2em] uppercase rounded-xl transition-all shadow-xl relative overflow-hidden group flex items-center justify-center gap-2 ${
            isActive 
              ? isRouteUnlocked
                ? "bg-gradient-to-br from-cyan-600 via-cyan-400 to-teal-500 cursor-pointer" 
                : "bg-zinc-900/90 text-zinc-400 border border-zinc-700/80 cursor-not-allowed"
              : "bg-zinc-900/50 text-zinc-600 border border-white/5 cursor-default"
          }`}>
            <span className="relative z-10 flex items-center gap-1.5 truncate">
              {!isRouteUnlocked && <Lock className="w-3.5 h-3.5 text-cyan-400 inline shrink-0" />}
              {isActive
                ? isRouteUnlocked
                  ? t.chooseRoute
                  : `${t.requiredLevel} ${route.requiredLevel}`
                : t.selectRoute}
            </span>
            {isActive && isRouteUnlocked && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />
            )}
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
          className="absolute top-4 right-4 z-50 p-2.5 rounded-lg bg-black/85 hover:bg-cyan-400/20 border border-white/15 hover:border-cyan-400/40 text-zinc-400 hover:text-cyan-300 transition-all cursor-pointer flex items-center justify-center shadow-lg group/leaderboard active:scale-95"
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

  const lastScrollTime = useRef(0);

  const nextRoute = () => {
    playSound("click", isMuted);
    setRouteIndex((routeIndex + 1) % ROUTES_DATA.length);
  };
  const prevRoute = () => {
    playSound("click", isMuted);
    setRouteIndex((routeIndex - 1 + ROUTES_DATA.length) % ROUTES_DATA.length);
  };

  React.useEffect(() => {
    const handleWindowWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastScrollTime.current < 220) return;
      if (Math.abs(e.deltaY) > 8 || Math.abs(e.deltaX) > 8) {
        if (e.deltaY > 0 || e.deltaX > 0) {
          playSound("click", isMuted);
          setRouteIndex((routeIndex + 1) % ROUTES_DATA.length);
        } else {
          playSound("click", isMuted);
          setRouteIndex((routeIndex - 1 + ROUTES_DATA.length) % ROUTES_DATA.length);
        }
        lastScrollTime.current = now;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        playSound("click", isMuted);
        setRouteIndex((routeIndex + 1) % ROUTES_DATA.length);
      } else if (e.key === "ArrowLeft") {
        playSound("click", isMuted);
        setRouteIndex((routeIndex - 1 + ROUTES_DATA.length) % ROUTES_DATA.length);
      } else if (e.key === "Escape") {
        playSound("click", isMuted);
        setIsRouteSelectionOpen(false);
      }
    };

    window.addEventListener("wheel", handleWindowWheel, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("wheel", handleWindowWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMuted, setIsRouteSelectionOpen, setRouteIndex, routeIndex, playSound]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 z-50 bg-gradient-to-b from-black/50 via-zinc-950/70 to-black/90 backdrop-blur-sm flex flex-col justify-center items-center p-4 md:p-8 overflow-y-auto"
      >
        <button
          onClick={() => {
            playSound("click", isMuted);
            setIsRouteSelectionOpen(false);
          }}
          className="absolute top-4 left-4 md:top-8 md:left-8 z-50 px-4 py-2 bg-black/60 hover:bg-zinc-800/80 border border-white/10 rounded-lg text-zinc-400 hover:text-white font-mono text-[10px] font-bold tracking-widest uppercase transition-all cursor-pointer shadow-xl flex items-center gap-1.5 hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 text-cyan-400" />
          {t.backToHangar}
        </button>
        
        <div className="flex flex-col items-center mb-2 md:mb-5 text-center max-w-2xl relative shrink-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-10 inset-x-0 flex justify-center pointer-events-none"
          >
            <div className="w-64 h-24 bg-cyan-400/5 blur-3xl rounded-full" />
          </motion.div>

          <span className="text-[10px] font-mono tracking-[0.4em] text-cyan-400 uppercase font-black mb-2 flex items-center gap-3 justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            {t.navSystem}
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </span>
          <h2 className="text-white font-display text-2xl md:text-4xl font-black tracking-tighter uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            {t.selectRoute}
          </h2>
          <div className="h-[2px] w-28 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-2 md:mt-3 relative overflow-hidden">
            <motion.div 
              animate={{ left: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 bottom-0 w-8 bg-white/40 skew-x-[-20deg]"
            />
          </div>
        </div>
        
        <div className="relative w-full max-w-[1100px] flex items-center gap-2 md:gap-6 group/carousel shrink-0">
          <button
            onClick={prevRoute}
            className="z-50 w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-black/40 hover:bg-cyan-400/20 border border-white/5 hover:border-cyan-400/50 text-white/40 hover:text-cyan-300 transition-all flex items-center justify-center cursor-pointer backdrop-blur-xl active:scale-95 shadow-2xl shrink-0 group"
          >
            <ChevronLeft className="w-5 h-5 md:w-7 md:h-7 group-hover:-translate-x-1 transition-transform" />
          </button>
          
          <div 
            className="flex-1 relative h-[clamp(320px,48vh,420px)] flex items-center justify-center overflow-visible py-2 md:py-6" 
            style={{ perspective: "2000px", transformStyle: "preserve-3d" }}
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
            className="z-50 w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-black/40 hover:bg-cyan-400/20 border border-white/5 hover:border-cyan-400/50 text-white/40 hover:text-cyan-300 transition-all flex items-center justify-center cursor-pointer backdrop-blur-xl active:scale-95 shadow-2xl shrink-0 group"
          >
            <ChevronRight className="w-5 h-5 md:w-7 md:h-7 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
