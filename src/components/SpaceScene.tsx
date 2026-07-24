import { Suspense, useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useProgress, Html, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ToneMapping, ChromaticAberration } from "@react-three/postprocessing";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Paintbrush, ChevronUp, ChevronDown, Rocket, Gauge, TrendingUp, Flame, Battery, Scale, Lock, Compass, Settings, Globe, X, Sparkles, Sliders, User, Trophy, BarChart3, Star, Play, Wrench } from "lucide-react";
import Spaceship from "./Spaceship";
import SpaceSimulator from "./SpaceSimulator";
import { SHIPS_DATA, calculateShipStats, SHIP_CLASS_PROFILES, ROUTES_DATA, SKINS_DATA } from "../data";
import { RouteData, GraphicsQuality } from "../types";
import { translations, routeTranslations, translateDifficulty, translateClass, Language } from "../translations";
import { shipDescriptions } from "../shipTranslations";
import { skinTranslations, classProfileTranslations } from "../dataTranslations";
import { crazyGamesService } from "../services/crazyGamesService";
import { playerService } from "../services/playerService";
import { audioService } from "../services/audioService";
import { leaderboardService, LeaderboardEntry } from "../lib/leaderboardService";
import { detectLowEndHardware } from "../utils/hardware";

import { AdModal } from "./modals/AdModal";
import { SimulatedAdOverlay } from "./modals/SimulatedAdOverlay";
import { ChooseShipButton } from "./modals/ChooseShipButton";
import { ColorSelector } from "./modals/ColorSelector";
import { SettingsModal } from "./modals/SettingsModal";
import { RouteSelectionOverlay } from "./modals/RouteSelectionOverlay";
import { PilotProfileModal } from "./modals/PilotProfileModal";
import { LeaderboardModal } from "./modals/LeaderboardModal";
import { ShipUpgradeModal } from "./modals/ShipUpgradeModal";

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

// Monitor de FPS no hangar: faz downgrade automático para modo "low" se a GPU travar
// (cobre a lacuna onde o PerformanceController só existia dentro do SpaceSimulator)
function HangarPerformanceMonitor({ graphicsQuality, setGraphicsQuality }: { graphicsQuality: GraphicsQuality; setGraphicsQuality: (q: GraphicsQuality) => void }) {
  const frameTimesRef = useRef<number[]>([]);
  const mountTimeRef = useRef(performance.now());

  useFrame((_state, dt) => {
    if (performance.now() - mountTimeRef.current < 4000) return;
    try { if (localStorage.getItem("graphicsQualityManual") === "true") return; } catch {}
    if (graphicsQuality === "low") return;

    const times = frameTimesRef.current;
    times.push(dt);
    if (times.length > 120) times.shift();
    if (times.length === 120) {
      const avgFPS = 120 / times.reduce((s, t) => s + t, 0);
      if (graphicsQuality === "high" && avgFPS < 35) {
        console.warn(`[HangarMonitor] FPS médio ${avgFPS.toFixed(1)}. Ajustando para modo medium.`);
        setGraphicsQuality("medium");
        times.length = 0;
      } else if (graphicsQuality === "medium" && avgFPS < 28) {
        console.warn(`[HangarMonitor] FPS médio ${avgFPS.toFixed(1)}. Ajustando para modo low.`);
        setGraphicsQuality("low");
        times.length = 0;
      }
    }
  });

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

        const exists = SKINS_DATA.find(c => c.textureFile === parsed.textureFile || c.id === parsed.id);
        if (exists) {
          if (playerService.isSkinLocked(exists.id)) {
            return defaultColor;
          }
          return exists;
        }
      }
    } catch (e) {
      console.error("Error loading color from localStorage", e);
    }
    return defaultColor;
  });
  const [lastUnlockedColor, setLastUnlockedColor] = useState(selectedColor);
  const [hoveredColor, setHoveredColor] = useState<typeof SKINS_DATA[0] | null>(null);
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

  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>(() => {
    try {
      const saved = localStorage.getItem("graphicsQuality") as GraphicsQuality | null;
      if (saved === "high" || saved === "medium" || saved === "low") return saved;
      return detectLowEndHardware() ? "low" : "high";
    } catch {
      return "high";
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

  const handleExitSimulator = useCallback(() => {
    setIsSimulatorActive(false);
    setIsSimulatorHangarActive(false);
  }, []);
  const [isAdShowing, setIsAdShowing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [adTarget, setAdTarget] = useState<{ id: string, type: 'ship' | 'skin', name: string } | null>(null);
  const [tick, setTick] = useState(0);
  // Atualiza a UI periodicamente para refletir a expiração de licenças/boosts temporários.
  // - Não roda se não houver tempo ativo, prevenindo re-renders constantes.
  useEffect(() => {
    audioService.init();
    if (isSimulatorActive) return;
    const boostLeft = SHIPS_DATA[currentIndex] ? playerService.getShipBoostTimeLeft(SHIPS_DATA[currentIndex].id) : 0;
    const tempLicenseLeft = SHIPS_DATA[currentIndex] ? playerService.getTempLicenseTimeLeft(SHIPS_DATA[currentIndex].id) : 0;
    
    if (boostLeft > 0 || tempLicenseLeft > 0) {
      const interval = setInterval(() => {
        setTick(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isSimulatorActive, currentIndex, tick]);

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
  }, [currentShip, tick]);

  const classProfile = useMemo(() => {
    return classProfileTranslations[language]?.[currentShip.class] || SHIP_CLASS_PROFILES[currentShip.class] || {
      name: currentShip.class,
      focus: t.general,
      advantage: t.balanced,
      disadvantage: t.none
    };
  }, [currentShip, language, t]);

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
    const isLocked = playerService.isSkinLocked(colorObj.id);
    if (!isLocked) {
      setLastUnlockedColor(colorObj);
      try {
        localStorage.setItem("starSparrow_color", JSON.stringify(colorObj));
      } catch (e) {}
    }
    playSound("paint", isMuted);
  };

  // Revert previewed locked skin back to last unlocked color when closing panel or starting flight
  useEffect(() => {
    if (!isColorPanelOpen || isSimulatorActive || isRouteSelectionOpen) {
      if (playerService.isSkinLocked(selectedColor.id)) {
        setSelectedColor(lastUnlockedColor);
      }
    }
  }, [isColorPanelOpen, isSimulatorActive, isRouteSelectionOpen, selectedColor, lastUnlockedColor]);

  // Keyboard navigation for arrow keys (Somente quando no Hangar, NÃO durante a partida no simulador!)
  useEffect(() => {
    if (isSimulatorActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMuted, isSimulatorActive]);

  const isCurrentShipLocked = !playerService.hasLicense(currentShip.id, currentShip.requiredLevel);

  if (isSimulatorActive) {
    return (
      <SpaceSimulator
        currentShip={currentShip}
        selectedColor={selectedColor}
        isMuted={isMuted}
        selectedRoute={selectedRoute}
        onExit={handleExitSimulator}
        graphicsQuality={graphicsQuality}
        setGraphicsQuality={setGraphicsQuality}
        language={language}
        onHangarStateChange={setIsSimulatorHangarActive}
        isMobile={isMobile}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-0 bg-[#020205] text-slate-100 overflow-hidden select-none font-sans flex flex-col justify-between">
      
      {/* Background Uploaded Hangar Image Scenario with a clean sci-fi vignette - scale-115 para cortar faixas pretas das bordas */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-in-out scale-115 overflow-hidden"
        style={{ backgroundImage: "url('/hangar_bg.webp')" }}
      >
        {/* Dark vignette overlay to make the ship and text highly legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/60" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 hud-vignette" />
        <div className="absolute inset-0 hud-grid-overlay opacity-30" />
      </div>

      {/* Sci-Fi Center Target Reticle framing the 3D Ship */}
      {!isRouteSelectionOpen && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] border border-cyan-500/10 rounded-full relative animate-pulse-slow">
            {/* Crosshair marks */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-cyan-400/40" />
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-cyan-400/40" />
            <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-3 h-0.5 bg-cyan-400/40" />
            <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-3 h-0.5 bg-cyan-400/40" />
            
            {/* Corner Bracket Reticles */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400/50" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400/50" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400/50" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400/50" />
          </div>
        </div>
      )}

      {/* Top minimal header with ship title and active index */}
      {!isRouteSelectionOpen && (
        <header className="z-10 px-12 py-6 flex justify-between items-start shrink-0 pointer-events-none">
          <div className="flex flex-col pointer-events-auto">
            {/* Active indicator */}
            <span className="text-[10px] font-mono tracking-[0.3em] text-cyan-400 uppercase font-semibold mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {t.prototypeWing}
            </span>
            {/* Animating Name and Description of the Ship in single AnimatePresence */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentShip.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col"
              >
                <h1 className="text-white font-display text-4xl font-extrabold tracking-[0.15em] uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  {currentShip.name}
                </h1>
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-zinc-400 font-mono text-[10px] tracking-[0.2em] uppercase">
                    {t.classLabel}: {translateClass(currentShip.class, language)}
                  </span>
                  <p className="text-zinc-300 font-serif text-sm max-w-md leading-relaxed mt-1 italic">
                    {shipDescriptions[language][currentShip.id] || currentShip.description}
                  </p>
                </div>
              </motion.div>
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
              title={t.pilotProfile}
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
              <Settings className="w-4 h-4 text-cyan-300 group-hover:rotate-45 transition-transform duration-300" />
            </button>

            <button
              onClick={() => {
                const newMuted = !isMuted;
                setIsMuted(newMuted);
                playSound("click", newMuted);
              }}
              className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/20 rounded-full text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-lg flex items-center justify-center"
              title={isMuted ? t.activateSound : t.muteSound}
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
          <Canvas 
            camera={{ position: [0, 1.5, 16], fov: 40 }} 
            shadows={graphicsQuality === "low" ? false : "soft"}
            dpr={graphicsQuality === "low" ? 0.5 : [1, 1.5]}
            gl={graphicsQuality === "low" 
              ? { alpha: true, antialias: false, powerPreference: "high-performance", precision: "lowp" }
              : { alpha: true, antialias: true, powerPreference: "high-performance" }
            }
          >
            {/* Monitor de FPS do hangar — downgrade automático se GPU não aguentar */}
            <HangarPerformanceMonitor graphicsQuality={graphicsQuality} setGraphicsQuality={setGraphicsQuality} />
            <OrbitControls 
              enablePan={false} 
              enableZoom={!isRouteSelectionOpen} 
              enableRotate={true}
              makeDefault 
              autoRotate={true}
              autoRotateSpeed={1.0}
              maxDistance={25}
              minDistance={8}
              maxPolarAngle={Math.PI / 2 + 0.1}
              minPolarAngle={Math.PI / 4}
              enableDamping={true}
              dampingFactor={0.05}
            />
            
             {/* ─── Iluminação do Hangar calibrada pela imagem de fundo ─────────────────
                 A imagem mostra: ambiente muito escuro (aço azulado), spots brancos
                 frios no teto, rim âmbar/laranja nas laterais, sotaque azul elétrico
                 em pontos específicos das paredes, e claridade azul-fria suave vinda
                 da abertura do hangar (o espaço exterior).
                 ──────────────────────────────────────────────────────────────────── */}

            {/* Ambiente base: iluminação difusa aumentada sem gerar reflexos concentrados */}
            <ambientLight
              intensity={isCurrentShipLocked ? 0.25 : 0.95}
              color={isCurrentShipLocked ? "#1e293b" : "#475569"}
            />

            {/* Luz hemisférica: preenchimento suave do teto e do piso */}
            <hemisphereLight
              color={isCurrentShipLocked ? "#1e293b" : "#94a3b8"}
              groundColor="#1e293b"
              intensity={isCurrentShipLocked ? 0.25 : 0.95}
            />

            {/* Spot frontal suave para revelar a pintura sem gerar ponto cego de brilho */}
            <directionalLight
              position={[0, 6, 8]}
              intensity={isCurrentShipLocked ? 0.10 : 0.60}
              color="#ffffff"
            />

            {/* Luzes superiores de preenchimento amplo (baixa intensidade pontual = sem reflexo forte) */}
            <pointLight
              position={[-3, 8, 2]}
              intensity={isCurrentShipLocked ? 0.0 : 0.6}
              color="#d8e5ff"
              distance={25}
              decay={2.0}
            />
            <pointLight
              position={[3, 8, -1]}
              intensity={isCurrentShipLocked ? 0.0 : 0.55}
              color="#e0edff"
              distance={25}
              decay={2.0}
            />
            <pointLight
              position={[0, 9, 4]}
              intensity={isCurrentShipLocked ? 0.0 : 0.5}
              color="#cce0ff"
              distance={22}
              decay={2.0}
            />

            {/* Rims suaves para recorte lateral */}
            <directionalLight
              position={[-9, 2, 1]}
              intensity={isCurrentShipLocked ? 0.08 : 0.35}
              color={isCurrentShipLocked ? "#1e293b" : "#38bdf8"}
            />

            <directionalLight
              position={[9, 2, 1]}
              intensity={isCurrentShipLocked ? 0.08 : 0.32}
              color={isCurrentShipLocked ? "#1e293b" : "#0ea5e9"}
            />

            {/* Luzes de sotaque difusas */}
            <pointLight
              position={[-7, 2, -3]}
              intensity={isCurrentShipLocked ? 0.0 : 0.4}
              color="#3b82f6"
              distance={15}
              decay={2.0}
            />
            <pointLight
              position={[6, 3, -2]}
              intensity={isCurrentShipLocked ? 0.0 : 0.35}
              color="#2563eb"
              distance={12}
              decay={2.0}
            />

            {/* Preenchimento vindo da abertura do hangar */}
            <directionalLight
              position={[0, 1, 12]}
              intensity={isCurrentShipLocked ? 0.10 : 0.50}
              color={isCurrentShipLocked ? "#0f1e36" : "#e2e8f0"}
            />

            {/* Preenchimento traseiro para silhueta */}
            <directionalLight
              position={[0, 5, -10]}
              intensity={isCurrentShipLocked ? 0.10 : 0.45}
              color={isCurrentShipLocked ? "#1e2d4a" : "#475569"}
            />

            {/* Localized Suspense boundary to prevent unmounting lights and controls during load */}
            <Suspense fallback={null}>
              {/* Environment night: iluminação sideral coerente com o tom azulado do hangar */}
              <Environment preset="night" environmentIntensity={isCurrentShipLocked ? 0.02 : 0.12} />
              <Spaceship 
                modelFile={currentShip.modelFile} 
                textureFile={(hoveredColor || selectedColor).textureFile}
                position={[0, -0.6, 0]} 
                isLocked={isCurrentShipLocked}
                graphicsQuality={graphicsQuality}
              />
            </Suspense>

            {graphicsQuality === "high" && (
              <EffectComposer key="scene-effect-composer" multisampling={0}>
                <Bloom luminanceThreshold={0.88} mipmapBlur intensity={0.25} />
              </EffectComposer>
            )}
          </Canvas>
        </div>

        {/* Telemetry Dashboard (Left Side) - Super Compact & Low-Profile */}
        {!isRouteSelectionOpen && (
          <div className="absolute left-6 bottom-4 z-20 w-48">
            <AnimatePresence>
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
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {t.telemetry}
                  </span>
                </div>

                {/* Segmented Stats Rows */}
                <div className="flex flex-col gap-1.5">
                  {[
                    { id: 'vel', label: t.speed, score: stats.vel, color: "bg-cyan-400", empty: "bg-cyan-950/40" },
                    { id: 'ace', label: t.acceleration, score: stats.ace, color: "bg-amber-400", empty: "bg-amber-950/40" },
                    { id: 'tur', label: t.turboPower, score: stats.tur, color: "bg-red-400", empty: "bg-red-950/40" },
                    { id: 'eng', label: t.energy, score: stats.eng, color: "bg-emerald-400", empty: "bg-emerald-950/40" },
                    { id: 'mas', label: t.mass, score: stats.mas, color: "bg-purple-400", empty: "bg-purple-950/40" }
                  ].map(stat => (
                    <div key={stat.id} className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-center text-[9px] font-mono">
                        <span className="text-zinc-400 uppercase tracking-wider">{stat.label}</span>
                        <span className="text-amber-400 font-bold">{stat.score}/10</span>
                      </div>
                      <div className="flex items-center gap-0.5 w-full">
                        {Array.from({ length: 10 }).map((_, i) => {
                          const isActive = i < stat.score;
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
            <div className="absolute left-1/2 bottom-6 -translate-x-1/2 z-20">
              <div className="flex flex-col items-center gap-3">
                <ChooseShipButton 
                  t={t}
                  onClick={() => {
                    playSound('transition', isMuted);
                    setIsRouteSelectionOpen(true);
                  }}
                  isLocked={!playerService.hasLicense(currentShip.id, currentShip.requiredLevel)}
                  requiredLevel={currentShip.requiredLevel}
                  tempLicenseTimeLeft={playerService.getTempLicenseTimeLeft(currentShip.id)}
                  onGetTempLicense={() => {
                    if (currentShip.id === "sparrow-20") return;
                    playSound('click', isMuted);
                    setAdTarget({ id: currentShip.id, type: 'ship', name: currentShip.name });
                    setShowAdModal(true);
                  }}
                  allowTempLicense={currentShip.id !== "sparrow-20"}
                  isMobile={isMobile}
                />
              </div>
            </div>

            {/* Right side controls: Upgrade button & Color picker */}
            <div className="absolute right-8 bottom-6 z-20 flex flex-col items-end gap-3 pointer-events-auto">
              {/* Upgrade Button above Color Selector */}
              <div className="relative flex items-center gap-2">
                {(() => {
                  const boostTimeLeft = playerService.getShipBoostTimeLeft(currentShip.id);
                  const isBoostActive = boostTimeLeft > 0;
                  const totalSec = Math.floor(boostTimeLeft / 1000);
                  const m = Math.floor(totalSec / 60);
                  const s = totalSec % 60;
                  const formattedTime = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

                  return (
                    <button
                      onClick={() => {
                        if (isBoostActive) return;
                        playSound('click', isMuted);
                        setShowUpgradeModal(true);
                      }}
                      disabled={isBoostActive}
                      className={`
                        w-14 h-14 rounded-full border transition-all duration-300 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-md shadow-2xl relative group shrink-0 select-none
                        ${isBoostActive 
                          ? 'border-red-500/80 bg-black/85 shadow-[0_0_20px_rgba(239,68,68,0.5)] cursor-not-allowed' 
                          : 'border-white/10 hover:border-amber-500/50 cursor-pointer active:scale-95 bg-black/50 hover:bg-black/80'}
                      `}
                      title={isBoostActive ? `Boost Ativo (${formattedTime})` : (t.upgradeTitle || "Upgrade Tático / Atributos (+5 Pts)")}
                    >
                      {isBoostActive ? (
                        <div className="flex flex-col items-center justify-center pointer-events-none">
                          <Wrench className="w-3.5 h-3.5 text-red-400 opacity-80 mb-0.5" />
                          <span className="font-mono text-[10px] font-black tracking-tighter text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]">
                            {formattedTime}
                          </span>
                        </div>
                      ) : (
                        <Wrench className="w-6 h-6 text-amber-400/90 group-hover:scale-115 group-hover:rotate-12 transition-transform duration-500" />
                      )}
                    </button>
                  );
                })()}
              </div>

              <ColorSelector 
                selectedColor={selectedColor}
                isColorPanelOpen={isColorPanelOpen}
                setIsColorPanelOpen={setIsColorPanelOpen}
                handleSelectColor={handleSelectColor}
                onHoverColor={setHoveredColor}
                playSound={playSound}
                isMuted={isMuted}
                language={language}
                t={t}
              />
            </div>
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

      <SimulatedAdOverlay isAdShowing={isAdShowing} language={language} />

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
        language={language}
        isProfileOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        playSound={playSound}
        isMuted={isMuted}
      />

      <LeaderboardModal 
        language={language}
        isLeaderboardOpen={isLeaderboardOpen}
        leaderboardRouteId={leaderboardRouteId}
        isLoadingLeaderboard={isLoadingLeaderboard}
        leaderboardScores={leaderboardScores as any}
        onClose={() => setIsLeaderboardOpen(false)}
        playSound={playSound}
        isMuted={isMuted}
      />

      <ShipUpgradeModal 
        showUpgradeModal={showUpgradeModal}
        ship={currentShip}
        t={t}
        language={language}
        onClose={() => setShowUpgradeModal(false)}
        onBoostApplied={() => {
          setTick(prev => prev + 1);
        }}
        playSound={playSound}
        isMuted={isMuted}
      />
    </div>
  );
}
