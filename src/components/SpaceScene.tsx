import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls, useProgress, Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Paintbrush, ChevronUp, ChevronDown, Rocket, Gauge, TrendingUp, Flame, Battery, Scale, Lock, Compass, Settings, Globe, X, Sparkles, Sliders, User, Trophy, BarChart3, Star, Play } from "lucide-react";
import Spaceship from "./Spaceship";
import SpaceSimulator from "./SpaceSimulator";
import { SHIPS_DATA, calculateShipStats, SHIP_CLASS_PROFILES, ROUTES_DATA, SKINS_DATA } from "../data";
import { RouteData } from "../types";
import { translations, routeTranslations, translateDifficulty, translateClass, Language } from "../translations";
import { crazyGamesService } from "../services/crazyGamesService";
import { playerService } from "../services/playerService";
import { audioService } from "../services/audioService";
import { leaderboardService, LeaderboardEntry } from "../lib/leaderboardService";

import { AdModal } from "./modals/AdModal";
import { SimulatedAdOverlay } from "./modals/SimulatedAdOverlay";
import { ChooseShipButton } from "./modals/ChooseShipButton";
import { ColorSelector } from "./modals/ColorSelector";
import { SettingsModal } from "./modals/SettingsModal";
import { RouteSelectionOverlay } from "./modals/RouteSelectionOverlay";
import { PilotProfileModal } from "./modals/PilotProfileModal";
import { LeaderboardModal } from "./modals/LeaderboardModal";


// Immersive sci-fi sound effects using audioService
const playSound = (type: "click" | "transition" | "paint", isMuted: boolean) => {
  if (isMuted) return;
  if (type === "click") audioService.playSfx("click");
  else if (type === "transition") audioService.playSfx("ability");
  else if (type === "paint") audioService.playSfx("laser");
};

function Loader() {
  return null;
}

export default function SpaceScene() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(() => {
    const defaultColor = SKINS_DATA[0];
    try {
      const saved = localStorage.getItem("starSparrow_color");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migration for renamed fields/paths
        const textureFile = parsed.textureFile || parsed.file;
        let finalPath = textureFile;
        if (finalPath && !finalPath.startsWith('/')) finalPath = '/' + finalPath;

        if (finalPath === "/StarSparrow_Camouflage.webp" || finalPath === "/StarSparrow_Cammo.webp") {
          parsed.textureFile = "/StarSparrow_Special.webp";
        } else {
          parsed.textureFile = finalPath;
        }

        const exists = SKINS_DATA.find(c => c.textureFile === parsed.textureFile);
        if (exists) return exists;
      }
    } catch (e) {
      console.error("Error loading color from localStorage", e);
    }
    return defaultColor;
  });
  const [isMuted, setIsMuted] = useState(false); // Default to unmuted as per user request
  const [isColorPanelOpen, setIsColorPanelOpen] = useState(false);
  const [hoveredColorName, setHoveredColorName] = useState<string | null>(null);
  const [isSimulatorActive, setIsSimulatorActive] = useState(false);
  const [isSimulatorHangarActive, setIsSimulatorHangarActive] = useState(false);
  const [isRouteSelectionOpen, setIsRouteSelectionOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteData>(ROUTES_DATA[0]);
  const [routeIndex, setRouteIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);

  // Leaderboard States
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardRouteId, setLeaderboardRouteId] = useState<string | null>(null);
  const [leaderboardScores, setLeaderboardScores] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  const handleOpenLeaderboard = async (routeId: string) => {
    setLeaderboardRouteId(routeId);
    setIsLeaderboardOpen(true);
    setIsLoadingLeaderboard(true);
    try {
      const scores = await leaderboardService.getTopScores(routeId, 10);
      setLeaderboardScores(scores);
    } catch (err) {
      console.error("Error loading leaderboard:", err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setSelectedRoute(ROUTES_DATA[routeIndex]);
  }, [routeIndex]);

  useEffect(() => {
    crazyGamesService.init();
  }, []);

  const [graphicsQuality, setGraphicsQuality] = useState<"high" | "low">(() => {
    try {
      return (localStorage.getItem("graphicsQuality") as "high" | "low") || "low";
    } catch {
      return "low";
    }
  });
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("gameLanguage") as Language | null;
      if (saved && ["pt", "en", "es", "fr"].includes(saved)) return saved;
    } catch {}
    try {
      const browserLang = navigator.language.slice(0, 2);
      if (["pt", "en", "es", "fr"].includes(browserLang)) return browserLang as Language;
    } catch {}
    return "pt";
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 3D Card Hover States for Profile
  const profileCardRef = useRef<HTMLDivElement>(null);
  const [profileRotateX, setProfileRotateX] = useState(0);
  const [profileRotateY, setProfileRotateY] = useState(0);
  const [profileGlowX, setProfileGlowX] = useState(50);
  const [profileGlowY, setProfileGlowY] = useState(50);

  const handleProfileMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!profileCardRef.current) return;
    const rect = profileCardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Percentage for glow gradient
    const pX = (mouseX / width) * 100;
    const pY = (mouseY / height) * 100;
    setProfileGlowX(pX);
    setProfileGlowY(pY);

    // Maximum 15 degree rotation
    const rX = -((mouseY - height / 2) / height) * 15;
    const rY = ((mouseX - width / 2) / width) * 15;
    setProfileRotateX(rX);
    setProfileRotateY(rY);
  };

  const handleProfileMouseLeave = () => {
    setProfileRotateX(0);
    setProfileRotateY(0);
    setProfileGlowX(50);
    setProfileGlowY(50);
  };

  const [isAdShowing, setIsAdShowing] = useState(false);
  const [adTarget, setAdTarget] = useState<{ id: string, type: 'ship' | 'skin', name: string } | null>(null);
  const [, setTick] = useState(0);
  // Update UI every second to refresh license timers
  useEffect(() => {
    audioService.init();
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    audioService.setMute(isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (isSimulatorActive) {
      audioService.stopMusic();
    } else {
      audioService.startMusic("hangar");
    }
  }, [isSimulatorActive]);

  useEffect(() => {
    const unlockAudio = () => {
      audioService.init();
    };
    window.addEventListener("click", unlockAudio);
    return () => window.removeEventListener("click", unlockAudio);
  }, []);

  useEffect(() => {
    // Pre-fetch route images to improve loading speed
    ROUTES_DATA.forEach(route => {
      const img = new Image();
      img.src = route.image;
    });
  }, []);

  // Preload adjacent spaceship models and color textures to ensure instant, jank-free rendering
  useEffect(() => {
    const nextIdx = (currentIndex + 1) % SHIPS_DATA.length;
    const prevIdx = (currentIndex - 1 + SHIPS_DATA.length) % SHIPS_DATA.length;

    const nextShip = SHIPS_DATA[nextIdx];
    const prevShip = SHIPS_DATA[prevIdx];

    // Preload next and previous 3D models immediately
    useLoader.preload(GLTFLoader, nextShip.modelFile);
    useLoader.preload(GLTFLoader, prevShip.modelFile);

    // Preload all available hangar color textures to keep color swapping seamless
    SKINS_DATA.forEach((colorObj) => {
      useTexture.preload(colorObj.textureFile);
    });

    // Preload PBR maps
    ["/StarSparrow_Normal.webp", "/StarSparrow_Roughness.webp", "/StarSparrow_Metallic.webp", "/StarSparrow_Emission.webp"].forEach(path => {
      useTexture.preload(path);
    });
  }, [currentIndex]);

  const t = translations[language];

  const nextRoute = () => {
    playSound("transition", isMuted);
    setRouteIndex((prev) => (prev + 1) % ROUTES_DATA.length);
  };

  const prevRoute = () => {
    playSound("transition", isMuted);
    setRouteIndex((prev) => (prev - 1 + ROUTES_DATA.length) % ROUTES_DATA.length);
  };

  const currentShip = useMemo(() => {
    return SHIPS_DATA[currentIndex];
  }, [currentIndex]);

  const stats = useMemo(() => {
    return calculateShipStats(currentShip);
  }, [currentShip]);

  const classProfile = useMemo(() => {
    return SHIP_CLASS_PROFILES[currentShip.class] || {
      name: currentShip.class,
      focus: "Geral",
      advantage: "Equilibrado",
      disadvantage: "Nenhuma"
    };
  }, [currentShip]);

  const handleNext = () => {
    playSound("transition", isMuted);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % SHIPS_DATA.length);
  };

  const handlePrev = () => {
    playSound("transition", isMuted);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + SHIPS_DATA.length) % SHIPS_DATA.length);
  };

  const handleSelectColor = (colorObj: any) => {
    setSelectedColor(colorObj);
    playSound("paint", isMuted);
  };

  // Keyboard navigation for arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMuted]);

  if (isSimulatorActive) {
    return (
      <SpaceSimulator
        currentShip={currentShip}
        selectedColor={selectedColor}
        isMuted={isMuted}
        selectedRoute={selectedRoute}
        onExit={() => {
          setIsSimulatorActive(false);
          setIsSimulatorHangarActive(false);
        }}
        graphicsQuality={graphicsQuality}
        setGraphicsQuality={setGraphicsQuality}
        language={language}
        onHangarStateChange={setIsSimulatorHangarActive}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-0 bg-[#020205] text-slate-100 overflow-hidden select-none font-sans flex flex-col justify-between">
      
      {/* Background Uploaded Hangar Image Scenario with a clean sci-fi vignette */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-in-out scale-105"
        style={{ backgroundImage: "url('/hangar_bg.webp')" }}
      >
        {/* Dark vignette overlay to make the ship and text highly legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/60" />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Top minimal header with ship title and active index */}
      {!isRouteSelectionOpen && (
        <header className="z-10 px-12 py-6 flex justify-between items-start shrink-0 pointer-events-none">
          <div className="flex flex-col pointer-events-auto">
            {/* Active indicator */}
            <span className="text-[10px] font-mono tracking-[0.3em] text-orange-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              {t.prototypeWing}
            </span>
            {/* Animating Name of the Ship */}
            <AnimatePresence mode="wait">
              <motion.h1
                key={currentShip.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="text-white font-display text-4xl font-extrabold tracking-[0.15em] uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              >
                {currentShip.name}
              </motion.h1>
            </AnimatePresence>
            {/* Subtitle / Category */}
            <AnimatePresence mode="wait">
              <motion.span
                key={`class-${currentShip.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-zinc-400 font-mono text-[10px] tracking-[0.2em] uppercase mt-1"
              >
                {t.classLabel}: {translateClass(currentShip.class, language)}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Settings, Mute, Profile and index indicator */}
          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              onClick={() => {
                setIsProfileOpen(true);
                playSound("click", isMuted);
              }}
              className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/20 rounded-full text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-lg flex items-center justify-center group"
              title="Perfil do Piloto"
            >
              <User className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
            </button>

            <button
              onClick={() => {
                setIsSettingsOpen(true);
                playSound("click", isMuted);
              }}
              className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/20 rounded-full text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-lg flex items-center justify-center group"
              title={t.settings}
            >
              <Settings className="w-4 h-4 text-orange-400 group-hover:rotate-45 transition-transform duration-300" />
            </button>

            <button
              onClick={() => {
                const newMuted = !isMuted;
                setIsMuted(newMuted);
                playSound("click", newMuted);
              }}
              className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/20 rounded-full text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-lg flex items-center justify-center"
              title={isMuted ? "Ativar som" : "Mutar som"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />}
            </button>
            
            <div className="px-4 py-1.5 bg-black/40 border border-white/10 rounded-full backdrop-blur-md shadow-lg font-mono text-xs text-white/80 tracking-widest">
              <span className="text-white font-bold">{(currentIndex + 1).toString().padStart(2, '0')}</span>
              <span className="text-white/30 mx-1.5">/</span>
              <span>{SHIPS_DATA.length.toString().padStart(2, '0')}</span>
            </div>
          </div>
        </header>
      )}

      {/* Main interactive viewport */}
      <main className="flex-1 relative min-h-0 z-0">
        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 1.5, 16], fov: 40 }} dpr={[1, 2]}>
            <OrbitControls 
              enablePan={false} 
              enableZoom={!isRouteSelectionOpen} 
              makeDefault 
              autoRotate={isRouteSelectionOpen}
              autoRotateSpeed={1.5}
              maxDistance={25}
              minDistance={8}
              maxPolarAngle={Math.PI / 2 + 0.1}
              minPolarAngle={Math.PI / 4}
            />
            
             {/* Scene lighting configured to match the hangar mood */}
            <ambientLight intensity={0.15} />
            <hemisphereLight color="#ffffff" groundColor="#1e1e2f" intensity={0.3} />
            
            {/* Front main light */}
            <directionalLight position={[5, 10, 8]} intensity={1.0} castShadow />
            
            {/* Saturated cinematic side/rim lights to give high-end metallic highlights */}
            <directionalLight position={[-8, 2, -5]} intensity={0.8} color="#00ffff" />
            <directionalLight position={[8, -2, -5]} intensity={0.8} color="#ffaa00" />
            <directionalLight position={[0, 8, -6]} intensity={0.6} color="#ffffff" />

            {/* Localized Suspense boundary to prevent unmounting lights and controls during load */}
            <Suspense fallback={null}>
              <Spaceship 
                key={currentShip.id}
                modelFile={currentShip.modelFile} 
                textureFile={selectedColor.textureFile}
                position={[0, -0.6, 0]} 
              />
            </Suspense>
          </Canvas>
        </div>

        {/* Telemetry Dashboard (Left Side) - Super Compact & Low-Profile */}
        {!isRouteSelectionOpen && (
          <div className="absolute left-6 bottom-4 z-20 pointer-events-none w-48">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentShip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-black/70 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl flex flex-col gap-2 pointer-events-auto text-[10px] font-mono select-none"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[8px] tracking-widest text-zinc-400">
                  <span className="font-bold flex items-center gap-2 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    {t.telemetry}
                  </span>
                </div>

                {/* Segmented Stats Rows */}
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: t.speed, value: stats.maxVelocity, color: "bg-orange-400", empty: "bg-orange-950/40" },
                    { label: t.acceleration, value: stats.acceleration, color: "bg-amber-400", empty: "bg-amber-950/40" },
                    { label: t.turbo, value: stats.turbo, color: "bg-red-400", empty: "bg-red-950/40" },
                    { label: t.energy, value: stats.energy, color: "bg-emerald-400", empty: "bg-emerald-950/40" },
                    { label: t.mass, value: (stats.mass / 160) * 100, color: "bg-cyan-400", empty: "bg-cyan-950/40" }
                  ].map(stat => (
                    <div key={stat.label} className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 uppercase text-[9px] tracking-wider">{stat.label}</span>
                      </div>
                      <div className="flex items-center gap-0.5 w-full">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const threshold = (i / 11) * 100;
                          const isActive = stat.value >= threshold;
                          return (
                            <div 
                              key={i} 
                              className={`h-1.5 flex-1 rounded-sm transition-colors duration-300 ${isActive ? stat.color : stat.empty}`} 
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {!isRouteSelectionOpen && (
          <>
            {/* Elegant side navigation arrows on desktop */}
            <div className="absolute inset-x-0 top-1/3 -translate-y-1/2 px-10 flex justify-between pointer-events-none z-10">
              <button
                onClick={handlePrev}
                className="w-14 h-14 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/30 text-white/80 hover:text-white transition-all flex items-center justify-center cursor-pointer pointer-events-auto backdrop-blur-md active:scale-95 hover:scale-105 shadow-xl group"
              >
                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              
              <button
                onClick={handleNext}
                className="w-14 h-14 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/30 text-white/80 hover:text-white transition-all flex items-center justify-center cursor-pointer pointer-events-auto backdrop-blur-md active:scale-95 hover:scale-105 shadow-xl group"
              >
                <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Centered Space Launch / Select Ship Button */}
            <div className="absolute left-1/2 bottom-6 -translate-x-1/2 z-20 pointer-events-none">
              <div className="flex flex-col items-center gap-3">
                <ChooseShipButton 
                  t={t}
                  onClick={() => {
                    playSound('transition', isMuted);
                    setIsRouteSelectionOpen(true);
                  }}
                  isLocked={false}
                  isMobile={isMobile}
                />
              </div>
            </div>

            <ColorSelector 
              selectedColor={selectedColor}
              isColorPanelOpen={isColorPanelOpen}
              setIsColorPanelOpen={setIsColorPanelOpen}
              handleSelectColor={handleSelectColor}
              playSound={playSound}
              isMuted={isMuted}
            />
          </>
        )}
      </main>

      {/* Bottom footer helper text */}
      {!isRouteSelectionOpen && (
        <footer className="z-10 px-6 py-6 flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] font-mono tracking-widest text-white/30 uppercase">
            {t.dragToRotate}
          </span>
        </footer>
      )}


      <AdModal 
        showAdModal={showAdModal}
        isAdShowing={isAdShowing}
        adTarget={adTarget}
        t={t}
        onClose={() => setShowAdModal(false)}
        onRequestLicense={async () => {
          if (!adTarget) {
            setShowAdModal(false);
            return;
          }
          setIsAdShowing(true);
          const isDev = window.location.hostname.includes('run.app') || window.location.hostname.includes('localhost');
          
          const grantLicense = async () => {
            const success = await crazyGamesService.requestRewardedAd();
            if (success && adTarget) {
              playerService.grantTemporaryLicense(adTarget.id, 15);
              setTick(prev => prev + 1);
              setShowAdModal(false);
              if (adTarget.type === 'ship') {
                setIsRouteSelectionOpen(true);
              }
            }
            setIsAdShowing(false);
          };
          
          if (isDev) {
            setTimeout(grantLicense, 500);
          } else {
            setTimeout(grantLicense, 3000);
          }
        }}
      />

      <SimulatedAdOverlay isAdShowing={isAdShowing} />

      <RouteSelectionOverlay 
        isRouteSelectionOpen={isRouteSelectionOpen}
        setIsRouteSelectionOpen={setIsRouteSelectionOpen}
        routeIndex={routeIndex}
        setRouteIndex={setRouteIndex}
        isMobile={isMobile}
        language={language}
        t={t}
        isMuted={isMuted}
        setSelectedRoute={setSelectedRoute}
        setIsSimulatorActive={setIsSimulatorActive}
        onOpenLeaderboard={handleOpenLeaderboard}
        playSound={playSound}
      />

      <SettingsModal 
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        language={language}
        setLanguage={setLanguage}
        graphicsQuality={graphicsQuality}
        setGraphicsQuality={setGraphicsQuality}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        t={t}
        playSound={playSound}
      />

      <PilotProfileModal t={t} 
        isProfileOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          playSound('click', isMuted);
        }}
      />

      <LeaderboardModal 
        isLeaderboardOpen={isLeaderboardOpen}
        leaderboardRouteId={leaderboardRouteId}
        isLoadingLeaderboard={isLoadingLeaderboard}
        leaderboardScores={leaderboardScores as any}
        onClose={() => setIsLeaderboardOpen(false)}
        playSound={playSound}
        isMuted={isMuted}
      />
    </div>
  );
}
