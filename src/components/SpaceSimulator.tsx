import { Suspense, useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Html, useGLTF, useTexture, useProgress, Billboard } from "@react-three/drei";
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration, BrightnessContrast, HueSaturation } from "@react-three/postprocessing";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import { 
  Volume2, 
  VolumeX, 
  Wrench, 
  ShieldAlert, 
  RotateCcw, 
  ArrowLeft, 
  Compass,
  Gauge,
  Trophy,
  Rocket,
  Sparkles,
  Award,
  Zap,
  CheckCircle2,
  BarChart2,
  Flag,
  Star,
  ShieldCheck
} from "lucide-react";
import { SHIPS_DATA, calculateShipStats } from "../data";
import { ShipData, RouteData, GraphicsQuality } from "../types";
import { LoadingScreen } from "./LoadingScreen";
import { AAADeepSpaceBackground } from "./AAADeepSpaceBackground";
import { translations, routeTranslations, translateDifficulty, translateClass, Language } from "../translations";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { crazyGamesService } from "../services/crazyGamesService";
import { playerService } from "../services/playerService";
import { leaderboardService } from "../lib/leaderboardService";
import { getRouteBehavior } from "../routes/routeBehaviors";

import { audioService } from "../services/audioService";
import { GameEngine } from "./simulator/GameEngine";
import { TelemetryHUD } from "./simulator/ui/TelemetryHUD";
import { SimulatorCanvas } from "./simulator/SimulatorCanvas";
import { 
  DeepSpaceEnvironment, 
  RenderBackgroundStars, 
  RenderMilkyWay, 
  RenderNebulas 
} from "./simulator/environment/DeepSpaceEnvironment";
import { PlanetModel, EarthModel, BlackHoleModel } from "./simulator/environment/Planets";
import { DestroyedSatelliteModel } from "./simulator/environment/Satellites";
import { RenderAsteroids } from "./simulator/environment/RenderAsteroids";
import { 
  PilotShip, 
  Takeoff3DShipCanvas, 
  BossShipModel, 
  ShipThrusters, 
  ShipCrosshair 
} from "./simulator/environment/PilotShip";
import { RenderNeonRings } from "./simulator/fx/RenderNeonRings";
import { RenderExplosions } from "./simulator/fx/RenderExplosions";
import { SpaceDust } from "./simulator/fx/SpaceDust";
import { SpeedParticles } from "./simulator/fx/SpeedParticles";

// Aliases para manter compatibilidade com o código legado
const playSimSound = (type: any, _muted: boolean) => audioService.playSfx(type);

const LOOK_AHEAD_MS = 100;
const SCHEDULE_AHEAD_TIME = 0.200;



function useSafeTexture(url: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let active = true;
    let loadedTexture: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        if (!active) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture = tex;
        setTexture(tex);
      },
      undefined,
      (err) => {
        console.warn("Could not load texture safely: " + url + ", using procedural fallback.", err);
      }
    );
    return () => {
      active = false;
      if (loadedTexture) {
        loadedTexture.dispose();
      }
    };
  }, [url]);
  return texture;
}

const textureCache = new Map<string, THREE.CanvasTexture>();

function generateNoiseTexture(width: number, height: number, type: string, baseColor: string) {
  const cacheKey = `${type}_${width}_${height}_${baseColor}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Aplica um filtro de desfoque (blur) suave ao canvas 2D para eliminar detalhes com formato geométrico/duro
  let blurAmount = "2px";
  if (type === "jupiter" || type === "saturn") {
    blurAmount = "3.5px"; // Desfoque suave para bandas de gás gigantesgasosas
  } else if (type === "venus") {
    blurAmount = "4.5px"; // Nuvens espessas e ultra-suaves de ácido sulfúrico
  } else if (type === "earth") {
    blurAmount = "1.8px"; // Continentes naturais integrados de forma realista
  } else if (type === "mars") {
    blurAmount = "2.2px"; // Suaviza desertos de poeira marciana
  } else if (type === "asteroid" || type === "mercury") {
    blurAmount = "1.5px"; // Suaviza as bordas geométricas das crateras
  } else if (type === "sun") {
    blurAmount = "0px";   // O sol mantém suas labaredas solares puras
  }
  
  if (blurAmount !== "0px") {
    ctx.filter = `blur(${blurAmount})`;
  }
  
  const drawBlob = (x: number, y: number, r: number, color: string, alpha: number) => {
    ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - width, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + width, y, r, 0, Math.PI * 2); ctx.fill();
  };

  const isSmall = width <= 256;

  if (type === "asteroid") {
    const starLoops = isSmall ? 400 : 1200;
    const craterLoops = isSmall ? 25 : 60;
    const fissureLoops = isSmall ? 3 : 6;

    // Desenhar poeira de grão fino (ruído de areia cósmica)
    for (let i = 0; i < starLoops; i++) {
      const x = Math.random() * width; const y = Math.random() * height;
      ctx.globalAlpha = 0.05 + Math.random() * 0.15;
      ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#130e0a";
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    // Crateras com sombreamento próprio e manta de ejeção de impacto
    for (let i = 0; i < craterLoops; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height;
      const r = 2 + Math.pow(Math.random(), 3) * (isSmall ? 12 : 35); // a maioria pequenas, poucas gigantes
      
      // Manta de ejeção (halo brilhante de detritos acumulados)
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = "#ebd9c8";
      ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - width, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + width, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();
      
      // Sombra interior profunda da cratera
      drawBlob(cx, cy, r, "#120e0a", 0.75);
      
      // Borda iluminada em crescente para efeito 3D real de relevo
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = "#9c8e7f";
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath(); ctx.arc(cx + r * 0.15, cy + r * 0.15, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - width + r * 0.15, cy + r * 0.15, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + width + r * 0.15, cy + r * 0.15, r, 0, Math.PI * 2); ctx.stroke();
    }
    // Fissuras, rachaduras e ranhuras tectônicas
    for (let i = 0; i < fissureLoops; i++) {
      ctx.beginPath();
      ctx.strokeStyle = "#100a06";
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.globalAlpha = 0.35;
      let lx = Math.random() * width;
      let ly = Math.random() * height;
      ctx.moveTo(lx, ly);
      for (let j = 0; j < 5; j++) {
        lx += (Math.random() - 0.5) * (isSmall ? 20 : 60);
        ly += (Math.random() - 0.5) * (isSmall ? 20 : 60);
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }
  } else if (type === "sun") {
    // Densidade escala com a área do canvas para que a superfície continue detalhada em texturas maiores (1024x512)
    const areaFactor = Math.max(1, (width * height) / (512 * 256));
    const blobLoops = Math.round((isSmall ? 40 : 120) * areaFactor);
    const flareLoops = Math.round((isSmall ? 20 : 60) * areaFactor);
    const sunspots = Math.round((isSmall ? 3 : 9) * areaFactor);
    const granulation = Math.round((isSmall ? 300 : 1400) * areaFactor);

    // Fundação convectiva profunda de calor solar (vermelho escuro / laranja), com variação de tom para dar profundidade
    for (let i = 0; i < blobLoops; i++) {
      const deep = Math.random() > 0.5;
      drawBlob(Math.random() * width, Math.random() * height, 12 + Math.random() * 34, deep ? "#c22c00" : "#ff6a00", 0.32);
    }
    // Rede de células de supergranulação (bordas mais claras entre células convectivas)
    for (let i = 0; i < blobLoops * 0.6; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = 6 + Math.random() * 14;
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "#ffd873";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }
    // Erupções solares, proeminências e filamentos brilhantes (arcos dourados)
    for (let i = 0; i < flareLoops; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = 8 + Math.random() * 22;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "rgba(255, 230, 130, 0.95)");
      g.addColorStop(0.45, "rgba(255, 140, 0, 0.5)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    // Manchas Solares (manchas magnéticas frias: umbra escura com penumbra quente), agrupadas como pares/grupos reais
    for (let i = 0; i < sunspots; i++) {
      const groupCx = Math.random() * width; const groupCy = Math.random() * height;
      const groupSize = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < groupSize; j++) {
        const cx = groupCx + (Math.random() - 0.5) * 24; const cy = groupCy + (Math.random() - 0.5) * 14;
        const r = 2.5 + Math.random() * 6;
        drawBlob(cx, cy, r * 2.6, "#8a1c00", 0.7); // Penumbra
        drawBlob(cx, cy, r, "#170300", 0.95);    // Umbra profunda
      }
    }
    // Granulação solar microscópica (células de convecção de alta frequência)
    for (let i = 0; i < granulation; i++) {
      ctx.globalAlpha = Math.random() * 0.16;
      ctx.fillStyle = "#fff4d6";
      ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }
  } else if (type === "earth") {
    // Continentes desenhados como cadeias de elipses alongadas e rotacionadas (em vez de
    // círculos concêntricos), para lembrar silhuetas reais de massas terrestres em vez de manchas.
    const drawEllipse = (x: number, y: number, rx: number, ry: number, rot: number, color: string, alpha: number) => {
      ctx.globalAlpha = alpha; ctx.fillStyle = color;
      [x, x - width, x + width].forEach((wx) => {
        ctx.beginPath();
        ctx.ellipse(wx, y, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const continents = isSmall ? 7 : 11;
    const coastals = isSmall ? 8 : 16;
    const lights = isSmall ? 20 : 60;

    for (let i = 0; i < continents; i++) {
      // Restringe o centro das massas terrestres a latitudes não-polares, como na Terra real
      const cx = Math.random() * width;
      const cy = height * 0.14 + Math.random() * height * 0.72;
      const spine = isSmall ? 26 + Math.random() * 34 : 90 + Math.random() * 130;
      const aspect = 0.4 + Math.random() * 0.35; // massas alongadas, não circulares
      const rot = Math.random() * Math.PI;
      const segments = 3 + Math.floor(Math.random() * 3);

      // Espinha do continente: várias elipses encadeadas ao longo de um eixo para criar contorno irregular
      const dx = Math.cos(rot); const dy = Math.sin(rot);
      for (let s = 0; s < segments; s++) {
        const t = (s / (segments - 1 || 1)) - 0.5;
        const sx = cx + dx * spine * t * 1.3;
        const sy = cy + dy * spine * t * 1.3 * 0.6;
        const segR = spine * (0.55 + Math.random() * 0.35) * (1 - Math.abs(t) * 0.3);
        drawEllipse(sx, sy, segR, segR * aspect, rot + (Math.random() - 0.5) * 0.6, "#d9b382", 0.92); // praias/desertos
        drawEllipse(sx, sy, segR * 0.8, segR * aspect * 0.8, rot, "#1e5225", 0.85); // florestas
        if (Math.random() > 0.35) {
          drawEllipse(sx + (Math.random() - 0.5) * segR * 0.3, sy, segR * 0.35, segR * aspect * 0.35, rot, "#404a3e", 0.7); // cordilheiras
        }
        if (Math.random() > 0.6) {
          drawEllipse(sx, sy, segR * 0.14, segR * aspect * 0.14, rot, "#ffffff", 0.9); // picos nevados
        }
      }
    }
    // Águas costeiras rasas (efeito de recifes e plataforma continental turquesa em transparência)
    ctx.globalCompositeOperation = "destination-over";
    for (let i = 0; i < coastals; i++) {
      drawBlob(Math.random() * width, height * 0.1 + Math.random() * height * 0.8, (isSmall ? 30 : 100) + Math.random() * (isSmall ? 50 : 160), "#0e7490", 0.35);
    }
    ctx.globalCompositeOperation = "source-over";
    
    // Luzes das cidades (pontos de ouro e âmbar que acendem no lado escuro da Terra)
    for (let i = 0; i < lights; i++) {
      const cx = Math.random() * width; const cy = height * 0.15 + Math.random() * height * 0.7;
      drawBlob(cx, cy, 1 + Math.random() * 3, "#fef08a", 0.35);
    }

    // Calotas polares: gelo real cobrindo os polos (linhas superior e inferior da projeção equiretangular)
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#f4faff";
    ctx.fillRect(0, 0, width, height * 0.06);
    ctx.fillRect(0, height * 0.94, width, height * 0.06);
    ctx.filter = "blur(4px)";
    for (let i = 0; i < (isSmall ? 10 : 24); i++) {
      drawBlob(Math.random() * width, height * 0.06 + Math.random() * height * 0.03, 6 + Math.random() * 14, "#f4faff", 0.5);
      drawBlob(Math.random() * width, height * 0.94 - Math.random() * height * 0.03, 6 + Math.random() * 14, "#f4faff", 0.5);
    }
  } else if (type === "mars") {
    const plains = isSmall ? 4 : 8;
    const storms = isSmall ? 6 : 12;
    const craters = isSmall ? 10 : 30;
    const icecaps = isSmall ? 6 : 14;

    // Planícies vulcânicas de basalto escuro e magnetita (Syrtis Major, Acidalia Planitia)
    for (let i = 0; i < plains; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = (isSmall ? 30 : 100) + Math.random() * (isSmall ? 60 : 200);
      drawBlob(cx, cy, r, "#36160d", 0.6);
    }
    // Tempestades de areia de alta altitude (argilas férricas mais claras)
    for (let i = 0; i < storms; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = (isSmall ? 40 : 140) + Math.random() * (isSmall ? 70 : 240);
      drawBlob(cx, cy, r, "#e28d68", 0.4);
    }
    // Grandes crateras de impacto (Valles Marineris / Cratera de Gale)
    for (let i = 0; i < craters; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = 2 + Math.random() * (isSmall ? 8 : 25);
      drawBlob(cx, cy, r, "#2d0f08", 0.75); // Sombra interior
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = "#f3bca2";
      ctx.lineWidth = Math.max(1, r * 0.15);
      ctx.beginPath(); ctx.arc(cx + r * 0.1, cy + r * 0.1, r, 0, Math.PI * 2); ctx.stroke();
    }
    // Calotas polares marcianas de dióxido de carbono e gelo de água
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.98;
    ctx.fillRect(0, 0, width, height * 0.05); // Calota norte
    ctx.fillRect(0, height * 0.93, width, height * 0.07); // Calota sul
    for (let i = 0; i < icecaps; i++) {
      drawBlob(Math.random() * width, height * 0.05 + Math.random() * 5, 5 + Math.random() * 10, "#ffffff", 0.6);
      drawBlob(Math.random() * width, height * 0.93 - Math.random() * 5, 5 + Math.random() * 10, "#ffffff", 0.6);
    }
  } else if (type === "venus") {
    const cloudLoops = isSmall ? 10 : 25;
    const vortexLoops = isSmall ? 4 : 10;

    // Camadas de nuvens de ácido sulfúrico super densas
    // Padrões de ondas atmosféricas em forma de chevron (em V)
    for (let i = 0; i < cloudLoops; i++) {
      const y = Math.random() * height;
      const x = Math.random() * width;
      ctx.globalAlpha = 0.2 + Math.random() * 0.3;
      ctx.fillStyle = Math.random() > 0.5 ? "#eedfa0" : "#d9bf80";
      ctx.beginPath();
      ctx.ellipse(x, y, (isSmall ? 40 : 120) + Math.random() * (isSmall ? 80 : 280), (isSmall ? 3 : 10) + Math.random() * (isSmall ? 8 : 28), Math.PI / 18, 0, Math.PI * 2);
      ctx.fill();
    }
    // Vórtices e tempestades circulares de alta pressão
    for (let i = 0; i < vortexLoops; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = (isSmall ? 10 : 35) + Math.random() * (isSmall ? 25 : 85);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "rgba(255, 240, 180, 0.45)");
      g.addColorStop(0.6, "rgba(209, 180, 106, 0.15)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === "jupiter" || type === "saturn") {
    const bands = type === "jupiter" 
      ? ["#b07f56", "#a1694d", "#c88b67", "#e3cda4", "#703a22", "#d4ac8c", "#fff8f0"] 
      : ["#e3d0b1", "#ccbb99", "#d4c5b0", "#a89a80", "#ebd8bf", "#bfb095"];
    
    const bandCount = isSmall ? 15 : 35;
    const stormLoops = isSmall ? 40 : 120;

    // Desenhar bandas de nuvens de gás paralelas
    for (let i = 0; i < bandCount; i++) {
      const y = (i / bandCount) * height;
      ctx.fillStyle = bands[Math.floor(Math.random() * bands.length)];
      ctx.globalAlpha = 0.8 + Math.random() * 0.2;
      ctx.fillRect(0, y, width, height / bandCount);
    }
    
    // Adicionar cisalhamento de vento de alta turbulência e pequenas tempestades nas bordas das bandas
    for (let i = 0; i < stormLoops; i++) {
      const y = Math.random() * height; const x = Math.random() * width;
      ctx.globalAlpha = 0.15 + Math.random() * 0.4; 
      ctx.fillStyle = bands[Math.floor(Math.random() * bands.length)];
      
      const rx = type === "jupiter" 
        ? (isSmall ? 20 : 80) + Math.random() * (isSmall ? 80 : 300) 
        : (isSmall ? 30 : 120) + Math.random() * (isSmall ? 100 : 400);
      const ry = type === "jupiter" ? 2 + Math.random() * 5 : 1 + Math.random() * 4;
      const angle = type === "jupiter" ? (Math.random() - 0.5) * 0.05 : 0;
      
      ctx.beginPath(); 
      ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2); 
      ctx.fill();
    }
    
    if (type === "jupiter") { 
      // A Grande Mancha Vermelha (The Great Red Spot) com ciclones e anticiclones gasosos realistas
      drawBlob(width * 0.45, height * 0.7, isSmall ? 15 : 50, "#8a1c0d", 0.95); // Contorno escuro da tempestade
      drawBlob(width * 0.45, height * 0.7, isSmall ? 13 : 45, "#b83d1d", 0.98); // Corpo principal avermelhado
      drawBlob(width * 0.47, height * 0.71, isSmall ? 8 : 25, "#ef4444", 0.8);  // Centro brilhante de alta energia
      drawBlob(width * 0.44, height * 0.69, isSmall ? 4 : 15, "#ffffff", 0.35); // Cristas de nuvens brancas de alta altitude
      
      // Óvalos brancos adicionais
      for (let i = 0; i < 4; i++) {
        drawBlob(width * (0.1 + i * 0.22), height * 0.8, isSmall ? 4 : 12, "#ffffff", 0.85);
      }
    }
  } else {
    // Mercúrio e outros satélites (Corpos rochosos altamente craterados, estilo lunar)
    const plainLoops = isSmall ? 3 : 6;
    const craterLoops = isSmall ? 50 : 180;

    // Maria (grandes planícies escuras de basalto)
    for (let i = 0; i < plainLoops; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = (isSmall ? 30 : 120) + Math.random() * (isSmall ? 50 : 200);
      drawBlob(cx, cy, r, "#1a1a1a", 0.45);
    }
    // Cratera com raios de impacto jovens brilhantes (ex. crateras Tycho ou Kuiper)
    for (let i = 0; i < craterLoops; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = 1 + Math.pow(Math.random(), 2.5) * (isSmall ? 8 : 25);
      
      if (r > (isSmall ? 5 : 12) && Math.random() > 0.85) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = "#ffffff";
        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * r * 3, cy + Math.sin(angle) * r * 3);
          ctx.stroke();
        }
      }
      
      drawBlob(cx, cy, r, "#111111", 0.8); // Sombra interna
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = "#e5e5e5";
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath(); ctx.arc(cx + r * 0.15, cy + r * 0.15, r, 0, Math.PI * 2); ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, texture);
  return texture;
}

const normalMapCache = new Map<string, THREE.CanvasTexture>();

// Deriva um normal map real a partir do mesmo canvas usado como albedo (filtro Sobel sobre
// a luminância). Isso troca o "bumpMap reaproveitando a textura de cor" atual — que só
// perturba a altura numa única direção escalar e é bem mais fraco — por normais de
// verdade em X/Y, com resposta de luz por pixel muito mais próxima de um relevo real.
// É o maior ganho de realismo possível nos planetas SEM depender de texturas fotográficas
// baixadas — este ambiente de execução não tem acesso à rede para buscar assets PBR reais.
function generateNormalMapFromAlbedo(albedo: THREE.CanvasTexture, cacheKey: string, strength = 1.4) {
  if (normalMapCache.has(cacheKey)) return normalMapCache.get(cacheKey)!;

  const src = albedo.image as HTMLCanvasElement;
  if (!src || !src.getContext) return null;
  const width = src.width, height = src.height;
  const srcCtx = src.getContext("2d");
  if (!srcCtx) return null;
  const srcData = srcCtx.getImageData(0, 0, width, height).data;

  // Luminância por pixel usada como "altura" do relevo
  const heights = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = srcData[i * 4], g = srcData[i * 4 + 1], b = srcData[i * 4 + 2];
    heights[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const outData = ctx.createImageData(width, height);

  const at = (x: number, y: number) => {
    const wx = (x + width) % width; // esfera é contínua horizontalmente - wrap em X
    const wy = Math.min(height - 1, Math.max(0, y)); // clamp nos polos - sem wrap em Y
    return heights[wy * width + wx];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Kernel Sobel 3x3 para estimar o gradiente de altura em X e Y
      const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
      const l = at(x - 1, y), r = at(x + 1, y);
      const bl = at(x - 1, y + 1), b = at(x, y + 1), br = at(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

      const idx = (y * width + x) * 4;
      outData.data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
      outData.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      outData.data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      outData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(outData, 0, 0);
  const normalTexture = new THREE.CanvasTexture(canvas);
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.ClampToEdgeWrapping;
  normalMapCache.set(cacheKey, normalTexture);
  return normalTexture;
}

function generateSunGlowTexture(size: number = 512) {
  const cacheKey = `sun_glow_${size}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.12, "rgba(255, 230, 110, 0.9)");
  grad.addColorStop(0.28, "rgba(255, 125, 25, 0.55)");
  grad.addColorStop(0.5, "rgba(255, 35, 0, 0.22)");
  grad.addColorStop(0.75, "rgba(180, 8, 0, 0.07)");
  grad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, texture);
  return texture;
}

function generateSunFlareTexture(size: number = 512) {
  const cacheKey = `sun_flare_${size}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Brilho central suave
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  grad.addColorStop(0, "rgba(255, 255, 240, 0.6)");
  grad.addColorStop(0.15, "rgba(255, 180, 50, 0.25)");
  grad.addColorStop(0.4, "rgba(230, 50, 0, 0.07)");
  grad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // 4 raios principais cruzados
  for (let angle of [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    
    const gradRay = ctx.createLinearGradient(-size / 2, 0, size / 2, 0);
    gradRay.addColorStop(0, "rgba(255, 80, 0, 0)");
    gradRay.addColorStop(0.5, "rgba(255, 210, 120, 0.12)");
    gradRay.addColorStop(1, "rgba(255, 80, 0, 0)");
    
    ctx.fillStyle = gradRay;
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0);
    ctx.lineTo(0, -8);
    ctx.lineTo(size / 2, 0);
    ctx.lineTo(0, 8);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, texture);
  return texture;
}

function generatePlanetGlowTexture(colorHex: string, size: number = 256) {
  const cacheKey = `planet_glow_${colorHex}_${size}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  const hexToRgba = (hex: string, alpha: number) => {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(clean.length === 3 ? 1 : 4, clean.length === 3 ? 2 : 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  grad.addColorStop(0.0, "rgba(255, 255, 255, 0.7)");
  grad.addColorStop(0.25, hexToRgba(colorHex, 0.45));
  grad.addColorStop(0.55, hexToRgba(colorHex, 0.15));
  grad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, texture);
  return texture;
}

function generateSaturnRingsTexture(size: number = 1024) {
  const cacheKey = `saturn_rings_${size}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  const maxRadius = size / 2;
  const minRadius = maxRadius * 0.45;
  const step = 2;

  for (let r = minRadius; r < maxRadius; r += step) {
    const t = (r - minRadius) / (maxRadius - minRadius);
    let opacity = 0.45 + Math.sin(t * Math.PI * 6.0) * 0.35;

    // Divisões e gaps realistas (Cassini, Encke)
    if (t > 0.48 && t < 0.54) {
      opacity = 0.01; // Divisão de Cassini
    } else if (t > 0.82 && t < 0.84) {
      opacity = 0.05; // Divisão de Encke
    } else if (t < 0.12) {
      opacity *= 0.2; // Anel C interno tênue
    } else if (t > 0.94) {
      opacity *= 0.15; // Borda externa fina
    }

    // Tons quentes e sutis de cinza-bege de Saturno
    const rColor = Math.floor(222 - t * 35 + Math.sin(t * 12) * 8);
    const gColor = Math.floor(202 - t * 45 + Math.sin(t * 15) * 10);
    const bColor = Math.floor(174 - t * 55 + Math.sin(t * 9) * 8);

    ctx.strokeStyle = `rgba(${rColor}, ${gColor}, ${bColor}, ${opacity})`;
    ctx.lineWidth = step + 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, texture);
  return texture;
}

function SaturnRingsInstanced({ radius }: { radius: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 5000;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const loadedAsteroidTexture = useSafeTexture("/asteroid_texture.webp");
  const proceduralAsteroidTexture = useMemo(() => generateNoiseTexture(128, 128, "asteroid", "#4a443f"), []);
  const activeTexture = loadedAsteroidTexture || proceduralAsteroidTexture;

  const ringsTexture = useMemo(() => generateSaturnRingsTexture(1024), []);

  useEffect(() => {
    return () => {
      if (proceduralAsteroidTexture) proceduralAsteroidTexture.dispose();
    };
  }, [proceduralAsteroidTexture]);

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      const r = radius * 1.15 + Math.random() * (radius * 0.95);
      const theta = Math.random() * Math.PI * 2;
      // Espessura volumétrica aumentada para 450 unidades para criar um "oceano de rochas" ao redor do trajeto
      const x = Math.cos(theta) * r; const y = (Math.random() - 0.5) * 450; const z = Math.sin(theta) * r;
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      // Tamanhos de asteroides maiores e mais variados nos anéis
      const s = 1.0 + Math.random() * 5.5;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [radius, count, dummy]);
  
  useFrame((state, delta) => { if (meshRef.current) meshRef.current.rotation.y += delta * 0.015; });
  
  return (
    // Rotação alinhada perfeitamente sem inclinação em Z para cruzar exatamente a coordenada Y=0 do trajeto
    <group rotation={[Math.PI / 18, 0, 0]}>
      {/* 1. O plano de poeira contínuo e translúcido dos anéis de Saturno */}
      {ringsTexture && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[radius * 4.2, radius * 4.2]} />
          <meshStandardMaterial 
            map={ringsTexture} 
            transparent={true} 
            opacity={0.85} 
            side={THREE.DoubleSide} 
            roughness={0.6}
            metalness={0.15}
            depthWrite={false} // Evita bugs de recorte na transparência dos asteroides
          />
        </mesh>
      )}

      {/* 2. As rochas volumétricas 3D do cinturão de poeira */}
      <instancedMesh ref={meshRef} args={[null as any, null as any, count]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#d4c5b0" map={activeTexture || undefined} roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

const MoonModel = memo(function MoonModel({ moon }: { moon: { id: string; distance: number; radius: number; color: string; speed: number } }) {
  const groupRef = useRef<THREE.Group>(null); const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * moon.speed;
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.08;
  });
  const texture = useMemo(() => generateNoiseTexture(256, 128, "asteroid", moon.color), [moon.color]);

  // Cor emissiva derivada da cor da lua — 25% para brilhar no lado escuro
  const emissiveColor = useMemo(() => new THREE.Color(moon.color).multiplyScalar(0.25), [moon.color]);

  useEffect(() => {
    return () => { if (texture) texture.dispose(); };
  }, [texture]);

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} position={[moon.distance, 0, 0]}>
        <sphereGeometry args={[moon.radius, 28, 28]} />
        <meshStandardMaterial
          map={texture || undefined}
          color={moon.color}
          emissive={emissiveColor}
          emissiveIntensity={0.60}
          roughness={0.85}
          metalness={0.05}
          envMapIntensity={0.9}
        />
      </mesh>
    </group>
  );
});



function generateCloudsTexture(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, width, height);
  
  ctx.filter = "blur(4px)";
  const drawBlob = (cx: number, cy: number, r: number, color: string, alpha: number) => {
    ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - width, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + width, cy, r, 0, Math.PI * 2); ctx.fill();
  };
  const isSmall = width <= 256;
  const count = isSmall ? 20 : 65; // Nuvens bem mais escassas e sutis
  for (let i = 0; i < count; i++) {
    const y = Math.random() * height;
    const x = Math.random() * width;
    drawBlob(x, y, (isSmall ? 4 : 12) + Math.random() * (isSmall ? 10 : 35), "#ffffff", 0.08 + Math.random() * 0.16);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function generateAccretionDiskTexture(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  for (let i = 0; i < 1500; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = (size * 0.15) + Math.random() * (size * 0.35);
    const arcLength = 0.1 + Math.random() * 0.8;
    const width = 1 + Math.random() * 4;
    ctx.strokeStyle = Math.random() > 0.4 ? "#f43f5e" : "#a855f7";
    if (Math.random() > 0.85) ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.12 + Math.random() * 0.38;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(cx, cy, r, angle, angle + arcLength);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const EarthModelLegacy = memo(function EarthModel({ planet }: { planet: { id: string; pos: THREE.Vector3; radius: number; color: string; emissive: string; moons?: any[] } }) {
  const planetRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // Textura fotográfica real Blue Marble (public/earth_texture.webp)
  const realEarthTexture = useSafeTexture("/earth_texture.webp");

  // Fallback procedural de alta definição enquanto a textura webp é carregada
  const proceduralEarthTexture = useMemo(() => {
    return generateNoiseTexture(1024, 512, "earth", "#0a3b8c");
  }, []);

  const activeEarthTexture = realEarthTexture || proceduralEarthTexture;

  const cloudsTexture = useMemo(() => {
    return generateCloudsTexture(1024, 512);
  }, []);

  const earthGlowTexture = useMemo(() => {
    return generatePlanetGlowTexture(planet.color || "#3b82f6");
  }, [planet.color]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.needsUpdate = true;
    }
  }, [activeEarthTexture]);

  useEffect(() => {
    return () => {
      if (proceduralEarthTexture) proceduralEarthTexture.dispose();
      if (cloudsTexture) cloudsTexture.dispose();
    };
  }, [proceduralEarthTexture, cloudsTexture]);

  useFrame((state, delta) => {
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.015;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.022;
      cloudsRef.current.rotation.x += delta * 0.003;
    }
  });

  return (
    <group position={[planet.pos.x, planet.pos.y, planet.pos.z]}>
      {/* Corpo principal da Terra usando /earth_texture.webp (NASA Blue Marble) */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[planet.radius, 48, 48]} />
        <meshStandardMaterial
          ref={materialRef}
          map={activeEarthTexture}
          emissiveMap={activeEarthTexture}
          emissive="#ffffff"
          emissiveIntensity={0.85}
          color="#ffffff"
          roughness={0.35}
          metalness={0.05}
          fog={false}
        />
      </mesh>

      {/* Camada Dinâmica de Nuvens em Paralaxe — mais sutil e translúcida */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[planet.radius * 1.025, 48, 48]} />
        <meshStandardMaterial
          map={cloudsTexture || undefined}
          transparent
          opacity={0.35}
          roughness={0.9}
          metalness={0.0}
          blending={THREE.NormalBlending}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {planet.moons && planet.moons.map((moon) => <MoonModel key={moon.id} moon={moon} />)}
    </group>
  );
});


const BlackHoleModelLegacy = memo(function BlackHoleModel({ planet }: { planet: { id: string; pos: THREE.Vector3; radius: number; color: string; emissive: string } }) {
  const diskRef = useRef<THREE.Mesh>(null);
  const lensRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const diskTexture = useMemo(() => {
    return generateAccretionDiskTexture(512);
  }, []);

  const particleCount = 1000;
  const [positions] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = planet.radius * (1.3 + Math.random() * 3.0);
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * planet.radius * 0.08;
      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);
    }
    return [pos];
  }, [planet.radius]);

  useEffect(() => {
    return () => {
      if (diskTexture) diskTexture.dispose();
    };
  }, [diskTexture]);

  useFrame((state, delta) => {
    if (diskRef.current) {
      diskRef.current.rotation.z += delta * 0.25;
    }
    if (lensRef.current) {
      lensRef.current.rotation.y += delta * 0.15;
      lensRef.current.rotation.x += delta * 0.08;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group position={[planet.pos.x, planet.pos.y, planet.pos.z]}>
      {/* Horizonte de Eventos - Esfera Negra Absoluta */}
      <mesh>
        <sphereGeometry args={[planet.radius, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Disco de Acreção Horizontal */}
      <mesh ref={diskRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[planet.radius * 1.1, planet.radius * 4.0, 64]} />
        <meshBasicMaterial
          map={diskTexture || undefined}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Distorção Gravitacional (Gravitational Lensing) - Disco Vertical */}
      <mesh ref={lensRef} rotation={[0, Math.PI / 4, 0]}>
        <ringGeometry args={[planet.radius * 1.15, planet.radius * 3.0, 64]} />
        <meshBasicMaterial
          map={diskTexture || undefined}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Partículas de Plasma Giratórias */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={planet.radius * 0.06}
          color="#d946ef"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Halos de Energia Gravitacional Extrema */}
      <mesh>
        <sphereGeometry args={[planet.radius * 1.15, 32, 32]} />
        <meshBasicMaterial
          color="#d946ef"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[planet.radius * 1.35, 32, 32]} />
        <meshBasicMaterial
          color="#4f46e5"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      <pointLight color="#d946ef" intensity={50} distance={planet.radius * 20} decay={1.5} />
    </group>
  );
});

const PlanetModelLegacy = memo(function PlanetModel({ planet }: { planet: { id: string; pos: THREE.Vector3; radius: number; color: string; emissive: string; moons?: any[] } }) {
  if (planet.id === "earth") {
    return <EarthModel planet={planet} />;
  }
  if (planet.id === "blackhole") {
    return <BlackHoleModel planet={planet} />;
  }

  const meshRef = useRef<THREE.Mesh>(null);
  const flareRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => { 
    if (meshRef.current) meshRef.current.rotation.y += delta * (planet.id === 'sun' ? 0.05 : 0.02); 
    if (flareRef.current) flareRef.current.rotation.z += delta * 0.012;
  });

  const texture = useMemo(() => {
    const baseColors: Record<string, string> = { sun: "#ff8a00", earth: "#0a3b8c", jupiter: "#c88b67", saturn: "#ccbb99", mars: "#a13213" };
    const size = planet.id === "sun" ? { w: 1024, h: 512 } : { w: 512, h: 256 };
    return generateNoiseTexture(size.w, size.h, planet.id, baseColors[planet.id] || planet.color);
  }, [planet.id, planet.color]);

  // Normal map real derivado do próprio albedo - substitui o bumpMap fraco por relevo
  // com resposta de luz em X/Y de verdade (ver generateNormalMapFromAlbedo)
  const normalTexture = useMemo(() => {
    if (!texture || planet.id === "sun") return null;
    return generateNormalMapFromAlbedo(texture as THREE.CanvasTexture, planet.id);
  }, [texture, planet.id]);

  const sunGlowTexture = useMemo(() => {
    if (planet.id !== "sun") return null;
    return generateSunGlowTexture(512);
  }, [planet.id]);

  const sunFlareTexture = useMemo(() => {
    if (planet.id !== "sun") return null;
    return generateSunFlareTexture(512);
  }, [planet.id]);

  const planetGlowTexture = useMemo(() => {
    if (planet.id === "sun") return null;
    return generatePlanetGlowTexture(planet.color);
  }, [planet.id, planet.color]);

  useEffect(() => {
    return () => {
      if (texture) texture.dispose();
    };
  }, [texture]);

  // Determine material attributes matching the scenery
  const materialProps = useMemo(() => {
    let baseColor = new THREE.Color(planet.color);
    // Emissive = cor do próprio planeta para garantir visibilidade máxima
    let emissiveColor = new THREE.Color(planet.color);
    let emissiveIntensity = 0.45;  // base forte — multiplicado abaixo por tipo
    let roughness = 0.75;
    let metalness = 0.05;
    let toneMapped = true;

    switch (planet.id) {
      case "sun":
        baseColor      = new THREE.Color("#fff8e8");
        emissiveColor  = new THREE.Color("#ffcc80");
        emissiveIntensity = 1.2;
        roughness = 0.1; metalness = 0.0; toneMapped = false;
        break;
      case "jupiter":
        emissiveColor = new THREE.Color(planet.color).lerp(new THREE.Color("#c88b67"), 0.4);
        emissiveIntensity = 0.55;
        roughness = 0.5; metalness = 0.1;
        break;
      case "saturn":
        emissiveColor = new THREE.Color(planet.color).lerp(new THREE.Color("#d4c5b0"), 0.3);
        emissiveIntensity = 0.45;
        roughness = 0.55; metalness = 0.15;
        break;
      case "mars":
        emissiveColor = new THREE.Color("#b04020");
        emissiveIntensity = 0.55;
        roughness = 0.75; metalness = 0.05;
        break;
      case "venus":
        emissiveColor = new THREE.Color("#e8c060");
        emissiveIntensity = 0.50;
        roughness = 0.9; metalness = 0.05;
        break;
      default:
        // Para planetas custom (ocean-world, plasma-sun, etc.) usar a própria cor
        emissiveColor = new THREE.Color(planet.emissive || planet.color);
        emissiveIntensity = 0.50;
        roughness = 0.75; metalness = 0.08;
        break;
    }

    // Para o sol: nenhuma dessaturação
    if (planet.id === "sun") {
      emissiveColor.lerp(new THREE.Color("#cca47a"), 0.2);
    }

    return {
      color: baseColor,
      emissive: emissiveColor,
      emissiveIntensity,
      roughness,
      metalness,
      toneMapped,
    };
  }, [planet.id, planet.color, planet.emissive]);

  return (
    <group position={[planet.pos.x, planet.pos.y, planet.pos.z]}>
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[planet.radius, 48, 48]} />
        <meshStandardMaterial 
          map={texture || undefined} 
          emissiveMap={planet.id === "sun" ? (texture || undefined) : undefined}
          normalMap={normalTexture || undefined}
          normalScale={normalTexture ? new THREE.Vector2(1.3, 1.3) : undefined}
          color={materialProps.color} 
          emissive={materialProps.emissive}
          emissiveIntensity={materialProps.emissiveIntensity}
          roughness={materialProps.roughness} 
          metalness={materialProps.metalness} 
          toneMapped={materialProps.toneMapped}
          envMapIntensity={planet.id !== "sun" ? 1.6 : 0.5}
          fog={false}
        />
      </mesh>
      {planet.moons && planet.moons.map((moon) => <MoonModel key={moon.id} moon={moon} />)}
      {planet.id === "sun" ? (
        <>
          {/* 1. Halo luminoso difuso gigante (Glow) que acompanha a câmera suavemente - opacidade menor */}
          {sunGlowTexture && (
            <Billboard>
              <mesh>
                <planeGeometry args={[planet.radius * 3.4, planet.radius * 3.4]} />
                <meshBasicMaterial 
                  map={sunGlowTexture} 
                  transparent 
                  opacity={0.35} 
                  blending={THREE.AdditiveBlending} 
                  depthWrite={false}
                />
              </mesh>
            </Billboard>
          )}

          {/* 2. Alargamento de lens estelar (Lens Flares) que gira lentamente dando dinamismo - opacidade menor */}
          {sunFlareTexture && (
            <Billboard>
              <mesh ref={flareRef}>
                <planeGeometry args={[planet.radius * 4.6, planet.radius * 4.6]} />
                <meshBasicMaterial 
                  map={sunFlareTexture} 
                  transparent 
                  opacity={0.25} 
                  blending={THREE.AdditiveBlending} 
                  depthWrite={false}
                />
              </mesh>
            </Billboard>
          )}

          {/* 3. Atmosfera de borda 3D sutil para integrar a esfera sólida com o glow espacial - opacidade menor */}
          <mesh>
            <sphereGeometry args={[planet.radius * 1.025, 32, 32]} />
            <meshBasicMaterial 
              color="#ffd38c" 
              transparent 
              opacity={0.15} 
              blending={THREE.AdditiveBlending} 
              side={THREE.BackSide} 
            />
          </mesh>
        </>
      ) : (
        // Atmosfera limb: duas camadas para criar o efeito de gradiente atmosférico realista
        planet.id !== "mercury" && (
          <>
            <mesh>
              <sphereGeometry args={[planet.radius * 1.05, 36, 36]} />
              <meshBasicMaterial
                color={planet.color}
                transparent
                opacity={0.18}
                blending={THREE.AdditiveBlending}
                side={THREE.BackSide}
                depthWrite={false}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[planet.radius * 1.12, 24, 24]} />
              <meshBasicMaterial
                color={planet.color}
                transparent
                opacity={0.07}
                blending={THREE.AdditiveBlending}
                side={THREE.BackSide}
                depthWrite={false}
              />
            </mesh>
          </>
        )
      )}

      {/* Glow Billboard — opacidade aumentada para visibilidade no espaço escuro */}
      {planetGlowTexture && (
        <Billboard>
          <mesh>
            <planeGeometry args={[planet.radius * 2.6, planet.radius * 2.6]} />
            <meshBasicMaterial 
              map={planetGlowTexture} 
              transparent 
              opacity={0.28} 
              blending={THREE.AdditiveBlending} 
              depthWrite={false}
            />
          </mesh>
        </Billboard>
      )}

      {planet.id === "saturn" && <SaturnRingsInstanced radius={planet.radius} />}
      {planet.id === "sun" && (
        <>
          {/* Luz solar de longo alcance (apenas o sol emite luz — não adicionar pointLights em outros planetas) */}
          <pointLight distance={150000} decay={1.2} intensity={5.0} color={planet.color} castShadow={false} />
          {/* Fill ambiente ao redor do sol */}
          <pointLight distance={35000} decay={1.8} intensity={1.8} color="#90a2be" />
        </>
      )}
    </group>
  );
});

const DestroyedSatelliteModelLegacy = memo(function DestroyedSatelliteModel({ position, rotation, scale, selectedRoute }: { position: [number, number, number], rotation: [number, number, number], scale: number, selectedRoute: RouteData }) {
  const meshRef = useRef<THREE.Group>(null);
  useFrame((state, delta) => { if (meshRef.current) { meshRef.current.rotation.x += delta * 0.05; meshRef.current.rotation.y += delta * 0.08; } });
  
  const satelliteStyle = useMemo(() => {
    return getRouteBehavior(selectedRoute.id).satelliteStyle;
  }, [selectedRoute.id]);

  return (
    <group ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <mesh><cylinderGeometry args={[0.5, 0.5, 3, 8]} /><meshStandardMaterial color={satelliteStyle.metalColor} metalness={0.8} roughness={0.4} /></mesh>
      <mesh position={[1.5, 0, 0]} rotation={[0, 0, 0.2]}><boxGeometry args={[2, 0.1, 1]} /><meshStandardMaterial color={satelliteStyle.panelColor} metalness={0.9} roughness={0.2} /></mesh>
      <mesh position={[-1.5, 0.5, 0]} rotation={[0.5, 0, -0.4]}><boxGeometry args={[2, 0.1, 1]} /><meshStandardMaterial color="#333333" metalness={0.9} roughness={0.8} /></mesh>
      <pointLight color={satelliteStyle.lightColor} distance={25} intensity={2.0} />
    </group>
  );
});

const asteroidGeometryCache = new Map<string, THREE.DodecahedronGeometry>();

const RenderAsteroidsLegacy = memo(function RenderAsteroids({ asteroids, texture, selectedRoute, graphicsQuality, asteroidsChangedRef }: { asteroids: any[], texture: THREE.Texture | null, selectedRoute: RouteData, graphicsQuality: GraphicsQuality, asteroidsChangedRef: React.RefObject<boolean> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = asteroids.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Criar uma geometria de asteroide procedural altamente realista, craterada e irregular (formato de batata cósmica)
  const asteroidGeometry = useMemo(() => {
    if (asteroidGeometryCache.has(graphicsQuality)) {
      return asteroidGeometryCache.get(graphicsQuality)!;
    }
    const detail = graphicsQuality === "high" ? 2 : 0; // Subdivisão 0 no modo de baixa qualidade (Dodecaedro simples)
    const geo = new THREE.DodecahedronGeometry(1, detail);
    const posAttr = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      const originalLength = v.length();
      v.normalize();
      
      // Camada 1: Ruído de baixa frequência e alta amplitude (forma geral elipsoide/irregular)
      let noise = Math.sin(v.x * 2.0) * Math.cos(v.y * 2.0) * Math.sin(v.z * 2.0) * 0.22;
      
      // Camada 2: Ruído de média frequência (vales tectônicos e elevações crateradas)
      noise += Math.cos(v.x * 4.5) * Math.sin(v.y * 4.5) * 0.08;
      
      // Camada 3: Ruído de alta frequência (rugosidade fina e micro-crateras)
      noise += Math.sin(v.x * 10.0) * Math.cos(v.z * 10.0) * 0.035;
      
      // Elongação assimétrica em cada eixo para criar o formato de batata realista (não-esférico)
      const shapeFactorX = 1.25;
      const shapeFactorY = 0.85;
      const shapeFactorZ = 0.95;
      
      v.multiplyScalar(originalLength * (1.0 + noise));
      v.x *= shapeFactorX;
      v.y *= shapeFactorY;
      v.z *= shapeFactorZ;
      
      posAttr.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    asteroidGeometryCache.set(graphicsQuality, geo);
    return geo;
  }, [graphicsQuality]);

  const materialProps = useMemo(() => {
    return getRouteBehavior(selectedRoute.id).asteroidMaterialProps;
  }, [selectedRoute.id]);

  // Normal map real derivado da textura procedural do asteroide (mesma técnica dos planetas) -
  // troca o bumpMap fraco por relevo com resposta de luz em X/Y de verdade nas crateras
  const asteroidNormalTexture = useMemo(() => {
    if (!texture) return null;
    return generateNormalMapFromAlbedo(texture as THREE.CanvasTexture, "asteroid_field");
  }, [texture]);

  // Geometria de estilhaço metálico irregular e retorcido para a Rota de Dyson (sem retângulos/caixas)
  const dysonScrapGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.5, 0.9, 1.4, 5);
    const posAttr = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      const angle = Math.atan2(v.z, v.x);
      
      // Dobrar e cisalhar o cilindro para tirar qualquer traço simétrico
      v.x += Math.sin(v.y * 3.0) * 0.4;
      v.z += Math.cos(v.y * 3.0) * 0.4;
      
      // Ondulações e dentes de metal retorcido
      const spikes = Math.sin(angle * 5.0) * 0.2 + Math.cos(v.y * 8.0) * 0.15;
      v.x *= (1.0 + spikes);
      v.z *= (1.0 + spikes);
      
      // Assimetria de topo/base
      if (v.y > 0) {
        v.x *= 0.7;
        v.z *= 1.3;
      } else {
        v.x *= 1.2;
        v.z *= 0.6;
      }
      posAttr.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const highwayGeometry = useMemo(() => new THREE.ConeGeometry(0.6, 1.2, 4), []);
  const plasmaGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);

  // Liberar recursos de forma segura para evitar vazamento de memória de GPU
  useEffect(() => {
    return () => {
      dysonScrapGeometry.dispose();
      highwayGeometry.dispose();
      plasmaGeometry.dispose();
    };
  }, [dysonScrapGeometry, highwayGeometry, plasmaGeometry]);

  const geometryToUse = useMemo(() => {
    const obstacleType = getRouteBehavior(selectedRoute.id).obstacleGeometryType;
    if (obstacleType === "dysonScrap") {
      return dysonScrapGeometry;
    } else if (obstacleType === "highway") {
      return highwayGeometry;
    } else if (obstacleType === "plasma") {
      return plasmaGeometry;
    } else {
      return asteroidGeometry;
    }
  }, [selectedRoute.id, asteroidGeometry, dysonScrapGeometry, highwayGeometry, plasmaGeometry]);

  const updateAsteroidMatrices = () => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      const a = asteroids[i];
      if (!a) continue;
      dummy.position.copy(a.pos);
      dummy.rotation.set(a.rot[0], a.rot[1], a.rot[2]);
      const s = a.scale * 2.5;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  };

  // Definir matrizes estáticas apenas quando asteroides ou geometria mudarem
  useEffect(() => {
    const t = setTimeout(() => {
      updateAsteroidMatrices();
    }, 50);
    return () => clearTimeout(t);
  }, [asteroids, count, geometryToUse]);

  // Executar a rotação e animação contínua de todos os asteroides a cada frame para dar sensação de universo em movimento
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const a = asteroids[i];
      if (!a) continue;

      // Rotação orbital contínua de cada asteroide
      a.rot[0] += (a.rotSpeedX || 0.15) * dt;
      a.rot[1] += (a.rotSpeedY || 0.25) * dt;
      a.rot[2] += (a.rotSpeedZ || 0.10) * dt;

      // Deriva de movimento para trajetos com asteroides dinâmicos
      if (selectedRoute.hasMovingAsteroids) {
        a.pos.x += Math.sin(time * 0.8 + i) * 10 * dt;
        a.pos.y += Math.cos(time * 0.6 + i * 2) * 6 * dt;
      }

      dummy.position.copy(a.pos);
      dummy.rotation.set(a.rot[0], a.rot[1], a.rot[2]);
      const s = a.scale * 2.5;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (asteroidsChangedRef) {
      asteroidsChangedRef.current = false;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geometryToUse as any, null as any, count]} frustumCulled={true}>
      <meshStandardMaterial 
        map={materialProps.useTexture ? (texture || undefined) : undefined} 
        normalMap={materialProps.useTexture ? (asteroidNormalTexture || undefined) : undefined}
        normalScale={asteroidNormalTexture ? new THREE.Vector2(1.1, 1.1) : undefined}
        color={materialProps.color} 
        emissive={materialProps.emissive}
        emissiveIntensity={materialProps.emissiveIntensity}
        roughness={materialProps.roughness} 
        metalness={materialProps.metalness} 
        flatShading={false}
      />
    </instancedMesh>
  );
});

interface PilotShipViewProps {
  scene: THREE.Group;
  currentShip: ShipData;
  selectedColor: any;
  abilityActive: boolean;
  isHangarActive: boolean;
  graphicsQuality?: GraphicsQuality;
}

function PilotShipViewLegacy({
  scene,
  currentShip,
  selectedColor,
  abilityActive,
  isHangarActive,
  graphicsQuality = "high",
}: PilotShipViewProps) {
  const texture = useTexture(selectedColor.textureFile) as THREE.Texture;
  
  // PBR Maps (Common for all StarSparrow models)
  const pbrMaps = useTexture({
    normalMap: "/StarSparrow_Normal.webp",
    roughnessMap: "/StarSparrow_Roughness.webp",
    metalnessMap: "/StarSparrow_Metallic.webp",
    emissiveMap: "/StarSparrow_Emission.webp",
  });

  const isLow = graphicsQuality === "low";

  const shipMesh = useMemo(() => {
    const clone = scene.clone();

    // Configure textures
    const allTextures = isLow ? [texture] : [texture, ...Object.values(pbrMaps)];
    allTextures.forEach(t => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = isLow ? 1 : 16;
      t.flipY = false;
      t.needsUpdate = true;
    });

    texture.colorSpace = THREE.SRGBColorSpace;
    
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.computeVertexNormals();
        }
        mesh.castShadow = !isLow;
        mesh.receiveShadow = !isLow;
        mesh.material = isLow
          ? new THREE.MeshLambertMaterial({
              map: texture,
              transparent: true,
              opacity: 1.0,
              color: new THREE.Color("#ffffff"),
              side: THREE.DoubleSide,
            })
          : new THREE.MeshStandardMaterial({
              map: texture, 
              normalMap: pbrMaps.normalMap,
              roughnessMap: pbrMaps.roughnessMap,
              metalnessMap: pbrMaps.metalnessMap,
              emissiveMap: pbrMaps.emissiveMap,
              emissive: new THREE.Color(0xffffff),
              emissiveIntensity: 0.5,
              roughness: 1.0, 
              metalness: 1.0, 
              transparent: true, 
              opacity: 1.0, 
              color: new THREE.Color("#ffffff"), 
              side: THREE.DoubleSide,
            });
      }
    });
    const box = new THREE.Box3().setFromObject(clone); const center = new THREE.Vector3(); box.getCenter(center); clone.children.forEach((child) => { child.position.sub(center); });
    return clone;
  }, [scene, texture, pbrMaps, currentShip.id, isLow]);

  // Atualiza as propriedades do material do clone de forma ultra-eficiente e sem re-alocar memória na GPU
  useEffect(() => {
    const isCloaked = abilityActive && currentShip.id === "sparrow-03";
    shipMesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as any;
        if (mat) {
          if (mat.emissive) {
            mat.emissive.set(isCloaked ? "#00ffea" : "#ffffff");
          }
          if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = isCloaked ? 0.8 : 0.5;
          if (mat.roughness !== undefined) mat.roughness = isCloaked ? 0.9 : 1.0;
          if (mat.metalness !== undefined) mat.metalness = isCloaked ? 0.1 : 1.0;
          mat.opacity = isCloaked ? 0.25 : 1.0;
          mat.color.set(isCloaked ? "#00ffea" : "#ffffff");
          // Atualização dinâmica via Uniforms sem recompilar Shaders da GPU
        }
      }
    });
  }, [shipMesh, abilityActive, currentShip.id]);

  useEffect(() => {
    return () => {
      shipMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => mat.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        }
      });
    };
  }, [shipMesh]);

  // Apply a slight nose-down tilt (pitch) when in space to show more of the ship's top
  const tiltX = !isHangarActive ? 0.03 : 0;
  const massScale = 0.015 * (1.0 + ((currentShip.massa || 2) - 2) * 0.04);
  return <primitive object={shipMesh} scale={massScale} rotation={[tiltX, Math.PI, 0]} />;
}

function PilotShipLegacy({ currentShip, selectedColor, abilityActive, isHangarActive, graphicsQuality }: { currentShip: ShipData, selectedColor: any, abilityActive: boolean, isHangarActive: boolean, graphicsQuality?: GraphicsQuality }) {
  const gltf = useLoader(GLTFLoader, currentShip.modelFile);
  return <PilotShipViewLegacy scene={gltf.scene} currentShip={currentShip} selectedColor={selectedColor} abilityActive={abilityActive} isHangarActive={isHangarActive} graphicsQuality={graphicsQuality} />;
}

function Takeoff3DShipView({ scene, currentShip, selectedColor, takeoffPercent, takeoffStarted, graphicsQuality }: { scene: THREE.Group, currentShip: ShipData, selectedColor: any, takeoffPercent: number, takeoffStarted: boolean, graphicsQuality?: GraphicsQuality }) {
  const texture = useTexture(selectedColor.textureFile) as THREE.Texture;
  const pbrMaps = useTexture({
    normalMap: "/StarSparrow_Normal.webp",
    roughnessMap: "/StarSparrow_Roughness.webp",
    metalnessMap: "/StarSparrow_Metallic.webp",
    emissiveMap: "/StarSparrow_Emission.webp",
  });

  const isLow = graphicsQuality === "low";

  const shipMesh = useMemo(() => {
    const clone = scene.clone();

    const allTextures = isLow ? [texture] : [texture, ...Object.values(pbrMaps)];
    allTextures.forEach(t => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = isLow ? 1 : 16;
      t.flipY = false;
      t.needsUpdate = true;
    });

    texture.colorSpace = THREE.SRGBColorSpace;

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.computeVertexNormals();
        }
        mesh.castShadow = !isLow;
        mesh.receiveShadow = !isLow;
        mesh.material = isLow
          ? new THREE.MeshLambertMaterial({
              map: texture,
              transparent: true,
              opacity: 1.0,
              color: new THREE.Color("#ffffff"),
              side: THREE.DoubleSide,
            })
          : new THREE.MeshStandardMaterial({
              map: texture, 
              normalMap: pbrMaps.normalMap,
              roughnessMap: pbrMaps.roughnessMap,
              metalnessMap: pbrMaps.metalnessMap,
              emissiveMap: pbrMaps.emissiveMap,
              emissive: new THREE.Color(0xffffff),
              emissiveIntensity: 0.5,
              roughness: 1.0, 
              metalness: 1.0, 
              transparent: true, 
              opacity: 1.0, 
              color: new THREE.Color("#ffffff"), 
              side: THREE.DoubleSide,
            });
      }
    });

    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    clone.children.forEach((child) => { child.position.sub(center); });

    return clone;
  }, [scene, texture, pbrMaps, currentShip.id, isLow]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const baseShipScale = 0.015 * (1.0 + ((currentShip.massa || 2) - 2) * 0.04);

    if (!takeoffStarted) {
      // Estado em repouso no Hangar: nave estacionada no centro com leve levitação sci-fi
      const idleHover = Math.sin(state.clock.elapsedTime * 2.0) * 0.12;
      groupRef.current.position.set(0, idleHover, 0);
      groupRef.current.scale.setScalar(baseShipScale);
      groupRef.current.rotation.set(0.02, Math.PI, Math.sin(state.clock.elapsedTime * 1.5) * 0.02);
    } else {
      // Estado de decolagem ativa: avança em velocidade em direção ao horizonte em Z e diminui
      const progress = Math.min(1.0, takeoffPercent / 100);
      const zPos = -progress * 175;
      const yPos = progress * 12;
      const scale = Math.max(0.0005, (1.0 - progress * 0.94) * baseShipScale);

      groupRef.current.position.set(0, yPos, zPos);
      groupRef.current.scale.setScalar(scale);
      groupRef.current.rotation.set(progress * 0.08, Math.PI, Math.sin(progress * Math.PI * 2) * 0.04);
    }
  });

  const thrusterOffsets = useMemo(() => scanShipThrusterPositions(scene, currentShip.modelFile), [scene, currentShip.modelFile]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={shipMesh} />
      {/* Propulsores quânticos: posicionados nos bocais reais escaneados da geometria 3D da nave */}
      {thrusterOffsets.map((o, idx) => (
        <pointLight 
          key={idx}
          position={[o[0] * 65, o[1] * 65, -5]} 
          intensity={takeoffStarted ? Math.max(25, 65 * (takeoffPercent / 35)) : 5} 
          distance={45} 
          color={selectedColor.colorHex} 
        />
      ))}
    </group>
  );
}

function Takeoff3DShipLoader({ currentShip, selectedColor, takeoffPercent, takeoffStarted, graphicsQuality }: { currentShip: ShipData, selectedColor: any, takeoffPercent: number, takeoffStarted: boolean, graphicsQuality?: GraphicsQuality }) {
  const gltf = useLoader(GLTFLoader, currentShip.modelFile);
  return <Takeoff3DShipView scene={gltf.scene} currentShip={currentShip} selectedColor={selectedColor} takeoffPercent={takeoffPercent} takeoffStarted={takeoffStarted} graphicsQuality={graphicsQuality} />;
}

function Takeoff3DShipCanvasLegacy({ currentShip, selectedColor, takeoffPercent, takeoffStarted, graphicsQuality }: { currentShip: ShipData, selectedColor: any, takeoffPercent: number, takeoffStarted: boolean, graphicsQuality?: GraphicsQuality }) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <Canvas 
        camera={{ position: [0, 2, 16], fov: 50 }}
        shadows={graphicsQuality === "low" ? false : "soft"}
        dpr={graphicsQuality === "low" ? 0.75 : [1, 1.5]}
        gl={graphicsQuality === "low" 
          ? { alpha: true, antialias: false, powerPreference: "high-performance", precision: "lowp" }
          : { alpha: true, antialias: true, powerPreference: "high-performance" }
        }
      >
        <ambientLight intensity={0.4} color="#8090b0" />
        <directionalLight position={[10, 15, 10]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-10, -5, -10]} intensity={0.6} color={selectedColor.colorHex} />
        <Suspense fallback={null}>
          <Takeoff3DShipLoader currentShip={currentShip} selectedColor={selectedColor} takeoffPercent={takeoffPercent} takeoffStarted={takeoffStarted} graphicsQuality={graphicsQuality} />
        </Suspense>
      </Canvas>
    </div>
  );
}

function BossShipModelLegacy({ position, rotation, scale }: { position: THREE.Vector3, rotation: [number, number, number], scale: number }) {
  const gltf = useLoader(GLTFLoader, "/StarSparrow18.glb");
  const shipMesh = useMemo(() => {
    const clone = gltf.scene.clone();
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.material = new THREE.MeshStandardMaterial({ color: new THREE.Color("#ff3300"), metalness: 0.9, roughness: 0.1, emissive: new THREE.Color("#660000"), emissiveIntensity: 0.5 });
      }
    });
    return clone;
  }, [gltf.scene]);

  useEffect(() => {
    return () => {
      shipMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => mat.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        }
      });
    };
  }, [shipMesh]);

  return <primitive object={shipMesh} position={position} rotation={rotation} scale={scale} />;
}



function RenderNeonRingsLegacy({ ringsRef, shipRef }: { ringsRef: React.MutableRefObject<any[]>, shipRef: React.MutableRefObject<THREE.Group | null> }) {
  const groupRef = useRef<THREE.Group>(null);
  
  
  // Criar a geometria apenas UMA VEZ e reutilizar em todos os aros para evitar Garbage Collection e lag de recriação de buffer WebGL
  // Engrossamos o tubo de 1.4 para 2.6 para dar maior área de superfície brilhante (super-neon)
  const torusGeo = useMemo(() => new THREE.TorusGeometry(120, 2.6, 8, 32), []);
  const torusGlowGeo = useMemo(() => new THREE.TorusGeometry(120, 7.5, 8, 32), []);
 
  // Criar os materiais apenas UMA VEZ e reutilizar para evitar compilação repetida de Shaders na GPU
  // Aumentamos o emissiveIntensity de 3.5 para 9.0 para um brilho incrivelmente intenso
  const materials = useMemo(() => {
    return {
      green: new THREE.MeshStandardMaterial({
        color: "#10b981",
        emissive: "#10b981",
        emissiveIntensity: 12.0,
        toneMapped: false,
      }),
      purple: new THREE.MeshStandardMaterial({
        color: "#a855f7",
        emissive: "#a855f7",
        emissiveIntensity: 12.0,
        toneMapped: false,
      }),
      red: new THREE.MeshStandardMaterial({
        color: "#ef4444",
        emissive: "#ef4444",
        emissiveIntensity: 12.0,
        toneMapped: false,
      }),
    };
  }, []);

  // Materiais de brilho básico aditivo (100% emissivos e auto-iluminados) para a aura volumétrica externa
  const glowMaterials = useMemo(() => {
    return {
      green: new THREE.MeshBasicMaterial({
        color: "#10b981",
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      purple: new THREE.MeshBasicMaterial({
        color: "#c084fc", // Roxo ligeiramente mais claro para sobressair no espaço
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      red: new THREE.MeshBasicMaterial({
        color: "#f87171", // Vermelho mais vibrante para a linha de chegada
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    };
  }, []);
 
  // Liberar recursos da memória da GPU ao desmontar o componente
  useEffect(() => {
    return () => {
      torusGeo.dispose();
      torusGlowGeo.dispose();
      materials.green.dispose();
      materials.purple.dispose();
      materials.red.dispose();
      glowMaterials.green.dispose();
      glowMaterials.purple.dispose();
      glowMaterials.red.dispose();
    };
  }, [torusGeo, torusGlowGeo, materials, glowMaterials]);
  
  useFrame((state) => {
     
     if (groupRef.current) {
        const shipPos = shipRef.current ? shipRef.current.position : null;
        const time = state.clock.elapsedTime;
        
        // Fator de oscilação pulsante para simular instabilidade de plasma neon
        const pulseScale = 1.0 + Math.sin(time * 6.5) * 0.08;
        const pulseOpacity = 0.45 + Math.sin(time * 6.5) * 0.12;

        // Atualizar opacidade dos glows dinamicamente para pulsação em uníssono
        glowMaterials.green.opacity = pulseOpacity;
        glowMaterials.purple.opacity = pulseOpacity;
        glowMaterials.red.opacity = pulseOpacity;

        // Encontrar o índice do aro atual (primeiro ainda não ultrapassado)
        let currentRingIndex = -1;
        for (let idx = 0; idx < ringsRef.current.length; idx++) {
          if (!ringsRef.current[idx].passed) {
            currentRingIndex = idx;
            break;
          }
        }

        groupRef.current.children.forEach((child, i) => {
           const ring = ringsRef.current[i];
           if (ring) {
              const meshMain = child.children[0] as THREE.Mesh;
              const meshGlow = child.children[1] as THREE.Mesh;
              const light = child.children[2] as THREE.PointLight;
              
              // Apenas o aro atual a ser atravessado fica visível!
              const isVisible = !ring.passed && (i === currentRingIndex);
              
              if (meshMain) {
                meshMain.visible = isVisible;
              }
              
              if (meshGlow) {
                meshGlow.visible = isVisible;
                if (meshGlow.visible) {
                  meshGlow.scale.set(pulseScale, pulseScale, 1.0);
                  meshGlow.rotation.z = time * 0.4;
                }
              }
              
              if (light) {
                if (!isVisible) {
                  light.intensity = 0;
                } else if (shipPos) {
                  const distSq = shipPos.distanceToSquared(ring.pos);
                  if (distSq < 4840000) { const dist = Math.sqrt(distSq);
                    light.intensity = 12.5 * Math.pow(1.0 - dist / 2200, 1.5);
                  } else {
                    light.intensity = 0;
                  }
                } else {
                  light.intensity = 0;
                }
              }
           }
        });
     }
  });
 
  return (
    <group ref={groupRef}>
      {ringsRef.current.map((ring, i) => {
        let material = materials.purple;
        let glowMaterial = glowMaterials.purple;
        if (i === 0) {
          material = materials.green;
          glowMaterial = glowMaterials.green;
        }
        if (i === ringsRef.current.length - 1) {
          material = materials.red;
          glowMaterial = glowMaterials.red;
        }
 
        return (
          <group key={ring.id} position={ring.pos} scale={[ring.radius / 120, ring.radius / 120, 1]}>
            {/* 1. Aro físico central sólido */}
            <mesh geometry={torusGeo} material={material} />
            {/* 2. Aura de brilho volumétrica translúcida com blending aditivo */}
            <mesh geometry={torusGlowGeo} material={glowMaterial} />
            {/* 3. Point light dinâmico de proximidade */}
            <pointLight color={ring.color} intensity={0} distance={450} decay={1.5} />
          </group>
        );
      })}
    </group>
  );
}

interface ExplosionState { id: string; position: THREE.Vector3; particles: { pos: THREE.Vector3; vel: THREE.Vector3; scale: number; color: string; }[]; life: number; }
interface KeysPressed { w: boolean; s: boolean; a: boolean; d: boolean; ArrowUp: boolean; ArrowDown: boolean; ArrowLeft: boolean; ArrowRight: boolean; Shift: boolean; e: boolean; ' ': boolean; }
interface SpaceSimulatorProps { 
  currentShip: ShipData; 
  selectedColor: any; 
  isMuted: boolean; 
  onExit: () => void; 
  selectedRoute: RouteData;
  graphicsQuality: GraphicsQuality;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  language?: Language;
  onHangarStateChange?: (isActive: boolean) => void;
  isMobile?: boolean;
}

const thrusterPositionsCache = new Map<string, [number, number, number][]>();

function scanShipThrusterPositions(scene: THREE.Group, modelFile: string): [number, number, number][] {
  if (thrusterPositionsCache.has(modelFile)) {
    return thrusterPositionsCache.get(modelFile)!;
  }

  const box = new THREE.Box3().setFromObject(scene);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Escanear vértices dos 15% traseiros da profundidade em Z do modelo
  const rearCutoff = box.max.z - (box.max.z - box.min.z) * 0.15;
  const rearVertices: THREE.Vector3[] = [];

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geom = mesh.geometry;
      if (geom && geom.attributes.position) {
        const posAttr = geom.attributes.position;
        const worldMat = mesh.matrixWorld;
        const v = new THREE.Vector3();

        for (let i = 0; i < posAttr.count; i++) {
          v.fromBufferAttribute(posAttr, i);
          v.applyMatrix4(worldMat);
          v.sub(center);

          if (v.z >= rearCutoff) {
            rearVertices.push(v.clone());
          }
        }
      }
    }
  });

  const zOffset = (box.max.z - center.z) * 0.015;

  let avgY = -0.3;
  if (rearVertices.length > 0) {
    avgY = rearVertices.reduce((acc, v) => acc + v.y, 0) / rearVertices.length;
  }

  // Apenas uma única turbina centralizada por nave (x = 0)
  const singleNozzle: [number, number, number][] = [
    [0, avgY * 0.015, zOffset]
  ];

  thrusterPositionsCache.set(modelFile, singleNozzle);
  return singleNozzle;
}

function ShipThrustersLegacy({ currentShip, selectedColor, keysRef, abilityActive, velocityRef, takeoffProgressRef }: { currentShip: ShipData, selectedColor: any, keysRef: React.RefObject<any>, abilityActive: boolean, velocityRef: React.RefObject<number>, takeoffProgressRef?: React.RefObject<number> }) {
  const gltf = useLoader(GLTFLoader, currentShip.modelFile);
  const scene = gltf.scene;
  const groupRef = useRef<THREE.Group>(null); 
  
  const mat1 = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const mat2 = useMemo(() => new THREE.MeshBasicMaterial({ color: selectedColor.colorHex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), [selectedColor.colorHex]);
  
  // Fogo das turbinas MAIOR e com conicidade de alta pressão
  const geo1 = useMemo(() => { const g = new THREE.ConeGeometry(0.48, 2.4, 16); g.translate(0, 1.2, 0); g.rotateX(Math.PI / 2); return g; }, []);
  const geo2 = useMemo(() => { const g = new THREE.ConeGeometry(0.85, 3.8, 16); g.translate(0, 1.9, 0); g.rotateX(Math.PI / 2); return g; }, []);
  
  const offsets = useMemo(() => scanShipThrusterPositions(scene, currentShip.modelFile), [scene, currentShip.modelFile]);

  const engineLightRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    if (!groupRef.current || !keysRef.current) return;
    
    const isBoost = keysRef.current[' '] || keysRef.current.ArrowUp || keysRef.current.Shift || keysRef.current.e || abilityActive;
    const speed = Math.max(0, velocityRef.current || 0);
    const isBraking = keysRef.current.ArrowDown;
    
    const baseFlameSize = Math.max(0.4, speed / 200.0);
    const targetScaleZ = isBoost ? 1.8 : (isBraking ? 0 : Math.min(1.4, baseFlameSize));
    const targetOpacity = isBoost ? 0.9 : (isBraking ? 0 : Math.max(0.1, Math.min(0.7, speed / 250.0)));
    
    mat1.opacity = THREE.MathUtils.lerp(mat1.opacity, targetOpacity, delta * 15);
    mat2.opacity = THREE.MathUtils.lerp(mat2.opacity, targetOpacity * 0.7, delta * 15);
    
    const pulse = !isBraking ? 0.9 + Math.sin(state.clock.elapsedTime * 45) * 0.15 : 1.0;
    
    groupRef.current.children.forEach(engine => {
       const flame = engine.children.find(c => c.name === "flameScale");
       if (flame) {
         flame.scale.z = THREE.MathUtils.lerp(flame.scale.z, targetScaleZ, delta * 12);
         flame.scale.x = THREE.MathUtils.lerp(flame.scale.x, pulse, delta * 25);
         flame.scale.y = THREE.MathUtils.lerp(flame.scale.y, pulse, delta * 25);
       }
    });

    // Luz do motor: acompanha a opacidade/pulso da chama para que o propulsor realmente
    // ilumine o casco da nave e detritos próximos, em vez de só ter um mesh brilhante.
    // Modulamos a intensidade pelo nível de proximidade da câmera no início (takeoffProgressRef) para evitar ofuscamento.
    if (engineLightRef.current) {
      const progress = takeoffProgressRef ? takeoffProgressRef.current : 1;
      const cameraClosenessFade = progress < 0.1 ? 0 : THREE.MathUtils.smoothstep(progress, 0.1, 0.95);
      
      const targetIntensity = isBraking ? 0 : (isBoost ? 4.5 : THREE.MathUtils.lerp(0.8, 2.8, Math.min(1, speed / 500)));
      engineLightRef.current.intensity = THREE.MathUtils.lerp(engineLightRef.current.intensity, targetIntensity * pulse * cameraClosenessFade, delta * 10);
    }
  });

  if (abilityActive && currentShip.id === "sparrow-03") return null;

  return (
    <group>
      <group ref={groupRef}>
        {offsets.map((o, i) => (
          <group key={i} position={o}>
            <group name="flameScale">
              <mesh geometry={geo1} material={mat1} />
              <mesh geometry={geo2} material={mat2} />
            </group>
            <pointLight
              ref={i === 0 ? engineLightRef : undefined}
              position={[0, 0, 1.0]}
              color={selectedColor.colorHex}
              intensity={0}
              distance={12}
              decay={2}
            />
          </group>
        ))}
      </group>
    </group>
  );
}

function ShipCrosshairLegacy({ selectedColor }: { selectedColor: any }) {
  const crosshairRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!crosshairRef.current) return;
    
    crosshairRef.current.rotation.z = state.clock.elapsedTime * 0.5;
  });
  
  return (
    <group position={[0, 0, -40]}>
      <group ref={crosshairRef}>
        <mesh>
          <ringGeometry args={[0.9, 1.0, 32]} />
          <meshBasicMaterial color={selectedColor.colorHex} transparent opacity={0.3} depthTest={false} blending={THREE.AdditiveBlending} />
        </mesh>
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh key={i} rotation={[0, 0, (Math.PI / 2) * i]} position={[0, 1.2, 0]}>
            <planeGeometry args={[0.05, 0.3]} />
            <meshBasicMaterial color={selectedColor.colorHex} transparent opacity={0.6} depthTest={false} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
        <mesh>
          <circleGeometry args={[0.05, 16]} />
          <meshBasicMaterial color={selectedColor.colorHex} transparent opacity={0.8} depthTest={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </group>
  );
}

function SpeedParallaxDust({ shipRef, velocityRef, keysRef, abilityActive }: any) {
  const count = 1200;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 600,
        z: (Math.random() - 0.5) * 1000 - 300,
        size: 0.15 + Math.random() * 0.5,
        speedFactor: 0.75 + Math.random() * 0.5
      });
    }
    return arr;
  }, []);

  const geo = useMemo(() => new THREE.BoxGeometry(0.25, 0.25, 1.4), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#a0e8ff",
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }), []);

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  useFrame((_, delta) => {
    if (!meshRef.current || !shipRef.current) return;
    const dt = Math.min(delta, 0.05);
    const shipPos = shipRef.current.position;
    const speed = Math.max(0, velocityRef.current || 0);
    const isBoost = (keysRef.current && (keysRef.current[' '] || keysRef.current.ArrowUp || keysRef.current.Shift || keysRef.current.e)) || abilityActive;

    const stretchZ = 1.0 + (speed / 100.0) * (isBoost ? 6.0 : 3.0);
    mat.opacity = isBoost ? 0.95 : Math.min(0.8, 0.25 + (speed / 350.0) * 0.55);

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      p.z += (speed * p.speedFactor + 90.0) * dt;

      if (p.z > shipPos.z + 150) {
        p.z = shipPos.z - 850;
        p.x = shipPos.x + (Math.random() - 0.5) * 600;
        p.y = shipPos.y + (Math.random() - 0.5) * 600;
      }
      if (p.z < shipPos.z - 850) {
        p.z = shipPos.z + 150;
      }

      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.size, p.size, p.size * stretchZ);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geo, mat, count]} />;
}

const SpaceSimulator = memo(function SpaceSimulator({ currentShip, selectedColor, isMuted, onExit, selectedRoute, graphicsQuality, setGraphicsQuality, language, onHangarStateChange, isMobile = false }: SpaceSimulatorProps) {
  const t = translations[language || "pt"];
  const scoreRef = useRef(0);
  const shieldRef = useRef(100);
  const armorRef = useRef(100);
  const [armorState, setArmorState] = useState(100); // Para telas de fim de jogo
  const [shieldState, setShieldState] = useState(100);

  const velocityRef = useRef(0); const baseQuat = useRef(new THREE.Quaternion());
  const energyRef = useRef(100);
  const finalTimeRef = useRef(0);
  const asteroidsChangedRef = useRef(true);
  const [leaderboardInfo, setLeaderboardInfo] = useState<{ isNewRecord: boolean, bestTime: number } | null>(null);
  const [abilityActive, setAbilityActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false); const [isVictory, setIsVictory] = useState(false); const [localMuted, setLocalMuted] = useState(isMuted); const [isHangarActive, setIsHangarActive] = useState(true);

  const [xpGained, setXpGained] = useState(0);
  const [levelUpInfo, setLevelUpInfo] = useState<{ levelUp: boolean, newLevel: number } | null>(null);
  const [isAdShowing, setIsAdShowing] = useState(false);

  // 3D Card Hover States for Victory
  const victoryCardRef = useRef<HTMLDivElement>(null);
  const [victoryRotateX, setVictoryRotateX] = useState(0);
  const [victoryRotateY, setVictoryRotateY] = useState(0);
  const [victoryGlowX, setVictoryGlowX] = useState(50);
  const [victoryGlowY, setVictoryGlowY] = useState(50);

  const handleVictoryMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!victoryCardRef.current) return;
    const rect = victoryCardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Percentagem para o gradiente de brilho
    const pX = (mouseX / width) * 100;
    const pY = (mouseY / height) * 100;
    setVictoryGlowX(pX);
    setVictoryGlowY(pY);

    // Rotação máxima de 15 graus
    const rX = -((mouseY - height / 2) / height) * 15;
    const rY = ((mouseX - width / 2) / width) * 15;
    setVictoryRotateX(rX);
    setVictoryRotateY(rY);
  };

  const handleVictoryMouseLeave = () => {
    setVictoryRotateX(0);
    setVictoryRotateY(0);
    setVictoryGlowX(50);
    setVictoryGlowY(50);
  };

  // 3D Card Hover States for Game Over
  const gameOverCardRef = useRef<HTMLDivElement>(null);
  const [gameOverRotateX, setGameOverRotateX] = useState(0);
  const [gameOverRotateY, setGameOverRotateY] = useState(0);
  const [gameOverGlowX, setGameOverGlowX] = useState(50);
  const [gameOverGlowY, setGameOverGlowY] = useState(50);

  const handleGameOverMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gameOverCardRef.current) return;
    const rect = gameOverCardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const pX = (mouseX / width) * 100;
    const pY = (mouseY / height) * 100;
    setGameOverGlowX(pX);
    setGameOverGlowY(pY);

    const rX = -((mouseY - height / 2) / height) * 15;
    const rY = ((mouseX - width / 2) / width) * 15;
    setGameOverRotateX(rX);
    setGameOverRotateY(rY);
  };

  const handleGameOverMouseLeave = () => {
    setGameOverRotateX(0);
    setGameOverRotateY(0);
    setGameOverGlowX(50);
    setGameOverGlowY(50);
  };

  useEffect(() => {
    if (isGameOver || isVictory) {
      crazyGamesService.gameplayStop();
      
      const difficultyXpMap: Record<string, number> = {
        "Iniciante": 150,
        "Fácil": 300,
        "Médio": 600,
        "Difícil": 1200,
        "Elite": 2500,
        "Sobrevivência": 5000
      };

      if (isVictory) {
        const reward = difficultyXpMap[selectedRoute.difficulty] || 150;
        setXpGained(reward);
        playerService.data.totalRaces = (playerService.data.totalRaces || 0) + 1;
        const resultXp = playerService.addXp(reward);
        setLevelUpInfo(resultXp);

        // Submit time to leaderboard
        const result = playerService.submitTrackTime(selectedRoute.id, finalTimeRef.current, currentShip.id);
        setLeaderboardInfo(result);
        
        // Submit to Global Firebase Leaderboard if applicable
        leaderboardService.submitScore(selectedRoute.id, finalTimeRef.current, currentShip.id);

        if (result.isNewRecord) {
          crazyGamesService.happyTime();
        }
      } else {
        const reward = 25;
        setXpGained(reward);
        playerService.data.totalRaces = (playerService.data.totalRaces || 0) + 1;
        const resultXp = playerService.addXp(reward);
        setLevelUpInfo(resultXp);
      }
    }
  }, [isGameOver, isVictory, selectedRoute.id, currentShip.id, selectedRoute.difficulty]);

  useEffect(() => {
    if (onHangarStateChange) {
      onHangarStateChange(isHangarActive);
    }
  }, [isHangarActive, onHangarStateChange]);

  const [loadingScreenActive, setLoadingScreenActive] = useState(true);
  const [takeoffStarted, setTakeoffStarted] = useState(false);
  const [takeoffPercent, setTakeoffPercent] = useState(0);
  const takeoffPercentRef = useRef(0);
  const takeoffBarRef = useRef<HTMLDivElement>(null);
  const takeoffOverlayRef = useRef<HTMLDivElement>(null);
  const takeoffProgressRef = useRef(0); const shipRef = useRef<THREE.Group>(null); const containerRef = useRef<HTMLDivElement>(null);
  const multiplierRef = useRef(1);
  const keysRef = useRef<KeysPressed>({ w: false, s: false, a: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Shift: false, e: false, ' ': false });
  const pointerRef = useRef({ x: 0, y: 0 }); const shakeRef = useRef(0);
  const repulsionVelRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const explosionsRef = useRef<ExplosionState[]>([]);
  const customRouteDataRef = useRef({
    heat: 0,
    ice: 0,
    shockwaveTimer: 15,
    draftActive: false,
    fuel: 100,
    controlGlitched: false,
    warningText: "",
    warningActive: false,
  });
  const { progress, active: isLoading } = useProgress();
  
  const stats = useMemo(() => {
    return calculateShipStats(currentShip);
  }, [currentShip]);
  
  useEffect(() => {
    audioService.init();
    crazyGamesService.loadingStart();
  }, []);

  useEffect(() => {
    if (!loadingScreenActive) {
      crazyGamesService.loadingStop();
    }
  }, [loadingScreenActive]);

  // Controle da música de fundo procedural baseada no estado do jogo
  useEffect(() => {
    audioService.setMute(localMuted);
  }, [localMuted]);

  useEffect(() => {
    if (isHangarActive) {
      audioService.startMusic("hangar");
    } else if (!isGameOver && !isVictory) {
      audioService.startMusic("game");
    } else {
      audioService.stopMusic();
    }
  }, [isHangarActive, isGameOver, isVictory]);

  useEffect(() => {
    const unlockAudio = () => {
      audioService.init();
    };
    window.addEventListener("click", unlockAudio);
    return () => window.removeEventListener("click", unlockAudio);
  }, []);

  // Efeito de desmontagem do simulador para garantir o encerramento seguro do agendador musical
  useEffect(() => {
    return () => {
      audioService.stopMusic();
      // Liberar texturas procedurais em cache global
      textureCache.forEach((tex) => tex.dispose());
      textureCache.clear();
      
      normalMapCache.forEach((tex) => tex.dispose());
      normalMapCache.clear();
      
      asteroidGeometryCache.forEach((geo) => geo.dispose());
      asteroidGeometryCache.clear();
    };
  }, []);
  


  const countdown = null;
  
  // Aumentamos a base de asteroides e meteoros nos trajetos para exigir maior habilidade e manobras ágeis
  const baseAsteroidCount = graphicsQuality === "high"
    ? (isMobile ? 250 : 550)
    : (isMobile ? 40 : 60);
  let asteroidCount = Math.round(baseAsteroidCount * selectedRoute.asteroidDensity);
  if (graphicsQuality === "low") {
    asteroidCount = 60;
  }

  // Função mestre para calcular a trajetória tridimensional específica e temática de cada pista
  const calculateRingPosition = useCallback((idx: number) => {
    const seed = selectedRoute.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const ringSpacing = selectedRoute.ringSpacing;
    return getRouteBehavior(selectedRoute.id).calculateRingPosition(idx, seed, ringSpacing, selectedRoute);
  }, [selectedRoute]);

  // Helper para calcular dinamicamente o centro geométrico da rota em qualquer coordenada Z
  const getRouteCenterAtZ = useMemo(() => {
    const numRings = selectedRoute.numRings;
    const ringSpacing = selectedRoute.ringSpacing;
    const totalDist = numRings * ringSpacing;

    // Pré-calcula as coordenadas espaciais de cada anel de forma estática para a rota atual
    const ringPositions: THREE.Vector3[] = [];
    for (let idx = 0; idx < numRings; idx++) {
      ringPositions.push(calculateRingPosition(idx));
    }

    return (z: number) => {
      // Converte a coordenada Z negativa do espaço de jogo na distância positiva percorrida
      const dist = Math.max(0, Math.min(totalDist, -z - 4000));
      const floatIdx = dist / ringSpacing;
      const i = Math.floor(floatIdx);
      const nextI = Math.min(numRings - 1, i + 1);
      const lerpFactor = floatIdx - i;

      const p1 = ringPositions[i] || ringPositions[0];
      const p2 = ringPositions[nextI] || ringPositions[numRings - 1];
      return new THREE.Vector3().lerpVectors(p1, p2, lerpFactor);
    };
  }, [selectedRoute, calculateRingPosition]);

  const asteroids = useMemo(() => {
    const seed = selectedRoute.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (i: number) => {
      const x = Math.sin(seed + i + 500) * 10000;
      return x - Math.floor(x);
    };

    const count = asteroidCount;
    const items = [];
    const totalDist = selectedRoute.numRings * selectedRoute.ringSpacing;
    
    // Preliminary rings path calculation for asteroid placement
    const pathPoints = Array.from({ length: selectedRoute.numRings }).map((_, i) => {
      return calculateRingPosition(i);
    });

    // Part 1: Random background asteroids
    for (let i = 0; i < count * 0.4; i++) {
      const pos = new THREE.Vector3((random(i * 1) - 0.5) * 80000, (random(i * 2) - 0.5) * 25000, (random(i * 3) - 0.5) * 150000);
      if (Math.abs(pos.x) < 200 && Math.abs(pos.y) < 200 && pos.z > -500 && pos.z < 500) {
        pos.x += Math.sign(pos.x || 1) * 200;
      }

      const scale = 1.0 + random(i * 10) * 8.0;

      // Garantir que asteroides de fundo aleatórios não deem spawn em cima dos aros da rota
      if (pos.z < 2000 && pos.z > -totalDist - 10000) {
        const routeCenter = getRouteCenterAtZ(pos.z);
        const dx = pos.x - routeCenter.x;
        const dy = pos.y - routeCenter.y;
        const distXY = Math.sqrt(dx * dx + dy * dy);
        let safetyRadius = scale * 2.5 + 1000; // Raio de segurança robusto para os aros

        if (selectedRoute.id === "route-certification") {
          const progressZ = -pos.z / totalDist;
          if (progressZ < 0.5) {
            safetyRadius = 4500; // Super limpo no início do tutorial
          }
        } else if (pos.z > -4000) {
          safetyRadius = 3500; // Super limpo nos primeiros 4000 metros de voo de qualquer rota
        }

        if (distXY < safetyRadius) {
          const angle = distXY > 1 ? Math.atan2(dy, dx) : (i * 0.5);
          pos.x = routeCenter.x + Math.cos(angle) * (safetyRadius + 200);
          pos.y = routeCenter.y + Math.sin(angle) * (safetyRadius + 200);
        }
      }

      const vel = selectedRoute.hasMovingAsteroids 
        ? new THREE.Vector3((random(i * 4) - 0.5) * selectedRoute.asteroidVelocity, (random(i * 5) - 0.5) * selectedRoute.asteroidVelocity, (random(i * 6) - 0.5) * selectedRoute.asteroidVelocity)
        : new THREE.Vector3(0, 0, 0);

      items.push({ 
        id: `ast-rand-${i}`, pos, 
        rot: [random(i * 7) * Math.PI, random(i * 8) * Math.PI, random(i * 9) * Math.PI] as [number, number, number], 
        scale, 
        speed: selectedRoute.asteroidVelocity, velocity: vel
      });
    }

    // Part 2: Obstacles ON THE PATH between rings (Corredor dinâmico de meteoros)
    for (let i = 0; i < count * 0.8; i++) {
      let ringIdx = Math.floor(random(i * 11) * (pathPoints.length - 1));
      if (selectedRoute.id === "route-certification") {
        ringIdx = 4 + Math.floor(random(i * 11) * (pathPoints.length - 1 - 4));
      }
      const p1 = pathPoints[ringIdx];
      const p2 = pathPoints[ringIdx + 1];
      const t = random(i * 12);
      const pos = new THREE.Vector3().lerpVectors(p1, p2, t);
      
      // Espalhar obstáculos mais próximos ao corredor para exigir manobras rápidas e desvios
      const spread = 450 + (random(i * 13) * 650);
      pos.x += (random(i * 14) - 0.5) * spread;
      pos.y += (random(i * 15) - 0.5) * spread;
      pos.z += (random(i * 16) - 0.5) * 400;

      // Manter entrada imediata dos aros desimpedida para passar com velocidade
      if (pos.distanceTo(p1) < 320 || pos.distanceTo(p2) < 320) continue;

      const vel = selectedRoute.hasMovingAsteroids 
        ? new THREE.Vector3((random(i * 17) - 0.5) * selectedRoute.asteroidVelocity * 0.6, (random(i * 18) - 0.5) * selectedRoute.asteroidVelocity * 0.6, (random(i * 19) - 0.5) * selectedRoute.asteroidVelocity * 0.6)
        : new THREE.Vector3(0, 0, 0);

      items.push({ 
        id: `ast-path-${i}`, pos, 
        rot: [random(i * 20) * Math.PI, random(i * 21) * Math.PI, random(i * 22) * Math.PI] as [number, number, number], 
        scale: 2.5 + random(i * 23) * 16.0, 
        speed: selectedRoute.asteroidVelocity, velocity: vel
      });
    }
    return items;
  }, [asteroidCount, selectedRoute, getRouteCenterAtZ, calculateRingPosition]);

  // Travar as configurações do Canvas e WebGL durante a partida atual para impedir
  // que o contexto WebGL seja destruído ou recompilado no meio do voo.
  const activeQualityRef = useRef(graphicsQuality);

  const canvasGl = useMemo(() => {
    return activeQualityRef.current === "low"
      ? { alpha: false, antialias: false, powerPreference: "high-performance" as const, precision: "lowp" as const }
      : { logarithmicDepthBuffer: true, antialias: true, powerPreference: "high-performance" as const, precision: "highp" as const };
  }, []);

  const envPreset = useMemo(() => {
    const c = selectedRoute.ambientColor.toLowerCase();
    return c === "#09090b" || c === "#1e1b4b" ? "night" :
           c === "#ef4444" || c === "#f97316" || c === "#8b5cf6" ? "sunset" :
           c === "#10b981" || c === "#0c4a6e" ? "dawn" :
           "city";
  }, [selectedRoute.ambientColor]);

  const asteroidTexture = useSafeTexture("/asteroid_texture.webp"); 
  const fallbackAsteroidTexture = useMemo(() => generateNoiseTexture(128, 128, "asteroid", "#4a443f"), []);

  const ringsData = useMemo(() => {
    // Ajusta o raio dos aros de neon dinamicamente com estreitamento progressivo para exigir maior precisão ao avançar na pista
    let baseRadius = 120;
    const diff = selectedRoute.difficulty;
    if (diff === "Iniciante" || diff === "Fácil") {
      baseRadius = 165;
    } else if (diff === "Médio") {
      baseRadius = 125;
    } else if (diff === "Difícil") {
      baseRadius = 90;
    } else if (diff === "Elite" || diff === "Sobrevivência") {
      baseRadius = 75;
    }

    return Array.from({ length: selectedRoute.numRings }).map((_, i, arr) => {
      let color = "#a855f7";
      let emissive = "#a855f7";
      if (i === 0) {
        color = "#10b981";
        emissive = "#10b981";
      } else if (i === arr.length - 1) {
        color = "#ef4444";
        emissive = "#ef4444";
      }

      // Progressão dinâmica de dificuldade: os aros estreitam em até 25% conforme o jogador avança no trajeto
      const progressFactor = i / arr.length;
      const dynamicRadius = Math.max(48, Math.round(baseRadius * (1.0 - progressFactor * 0.25)));

      return {
        id: `ring-${i}`,
        pos: calculateRingPosition(i),
        color,
        emissive,
        passed: false,
        radius: dynamicRadius
      };
    });
  }, [selectedRoute, calculateRingPosition]);

  const neonRingsRef = useRef<any[]>([]);
  useEffect(() => {
    neonRingsRef.current = ringsData;
  }, [ringsData]);

  const trafficShips: any[] = [];

  const ambientColorObj = useMemo(() => new THREE.Color(selectedRoute.ambientColor), [selectedRoute]);

  const planets = useMemo(() => {
    const totalDist = selectedRoute.numRings * selectedRoute.ringSpacing;
    let rawPlanets: any[] = getRouteBehavior(selectedRoute.id).planets(totalDist);

    return rawPlanets.map(p => {
      let finalPos = p.pos.clone();

      const seedVal = p.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const scaleMultiplier = p.id === "saturn" ? 1.8 : p.id === "earth" ? 2.0 : 2.1 + (seedVal % 3) * 0.2;
      const newRadius = p.radius * scaleMultiplier;

      let newMoons = p.moons;
      if (p.moons) {
        newMoons = p.moons.map((m: any) => ({
          ...m,
          radius: m.radius * scaleMultiplier,
          distance: m.distance * 1.25
        }));
      }

      // Posicionamento elegante e visível no horizonte da câmera perto do trajeto dos aros
      const routeCenter = getRouteCenterAtZ(finalPos.z);
      
      let dx = p.pos.x - routeCenter.x;
      let dy = p.pos.y - routeCenter.y;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);

      if (distToCenter > 1) {
        dx /= distToCenter;
        dy /= distToCenter;
      } else {
        dx = 0;
        dy = 1;
      }

      // Distância de segurança para o planeta ficar visível e imponente na visão sem colidir com os aros
      const clearance = p.id === "saturn" ? 1800 : 2200;
      const targetDistance = newRadius + clearance;

      finalPos.x = routeCenter.x + dx * targetDistance;
      finalPos.y = routeCenter.y + dy * targetDistance;

      return { ...p, radius: newRadius, moons: newMoons, pos: finalPos };
    });
  }, [selectedRoute, getRouteCenterAtZ]);

  const nebulas = useMemo(() => {
    const seed = selectedRoute.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (i: number) => {
      const x = Math.sin(seed + i) * 10000;
      return x - Math.floor(x);
    };
    
    // Usar cores da rota se disponíveis, senão fallback vibrante
    const routeNebulaColors = selectedRoute.nebulaColors;
    const nebulaColors = routeNebulaColors
      ? [
          new THREE.Color(routeNebulaColors[0]),
          new THREE.Color(routeNebulaColors[1]),
          new THREE.Color(routeNebulaColors[0]).lerp(new THREE.Color(routeNebulaColors[1]), 0.5),
        ]
      : [
          new THREE.Color("#1a3a5c"), // Azul profundo
          new THREE.Color("#3c1a5c"), // Violeta
          new THREE.Color("#1a5c4a"), // Verde azulado
          new THREE.Color("#5c2a1a"), // Laranja escuro
        ];

    return Array.from({ length: selectedRoute.nebulaCount }).map((_, i) => {
      const idx = Math.floor(random(i * 5) * nebulaColors.length);
      const col = nebulaColors[idx].clone();
      // Variação tonal sutil
      col.addScalar((random(i * 6) - 0.5) * 0.06);
      
      return { 
        pos: new THREE.Vector3((random(i * 1) - 0.5) * 400000, (random(i * 2) - 0.5) * 400000, (random(i * 3) - 0.5) * 400000), 
        scale: 50000 + random(i * 4) * 100000, 
        color: col
      };
    });
  }, [selectedRoute.id, selectedRoute.nebulaCount, selectedRoute.nebulaColors]);

  const satellites = useMemo(() => {
    if (selectedRoute.id === "route-void") return [];
    
    const seed = selectedRoute.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (i: number) => {
      const x = Math.sin(seed + i + 100) * 10000;
      return x - Math.floor(x);
    };

    const totalDist = selectedRoute.numRings * selectedRoute.ringSpacing;

    return Array.from({ length: 8 }).map((_, i) => {
      const pos = new THREE.Vector3(
        (random(i * 1) - 0.5) * 60000, 
        (random(i * 2) - 0.5) * 40000, 
        (random(i * 3) - 0.5) * 60000
      );
      const scale = 8 + random(i * 7) * 12;

      // Garantir que satélites do cenário não fiquem em cima do trajeto dos aros
      if (pos.z < 2000 && pos.z > -totalDist - 10000) {
        const routeCenter = getRouteCenterAtZ(pos.z);
        const dx = pos.x - routeCenter.x;
        const dy = pos.y - routeCenter.y;
        const distXY = Math.sqrt(dx * dx + dy * dy);
        const safetyRadius = scale * 2.0 + 1800;

        if (distXY < safetyRadius) {
          const angle = distXY > 1 ? Math.atan2(dy, dx) : (i * (Math.PI / 4));
          pos.x = routeCenter.x + Math.cos(angle) * (safetyRadius + 500);
          pos.y = routeCenter.y + Math.sin(angle) * (safetyRadius + 500);
        }
      }

      return { 
        id: `sat-${i}`, 
        pos, 
        rot: [random(i * 4) * Math.PI, random(i * 5) * Math.PI, random(i * 6) * Math.PI] as [number, number, number], 
        scale 
      };
    });
  }, [selectedRoute, getRouteCenterAtZ]);

  // Máximo de explosões ativas ao mesmo tempo. Evita que colisões em sequência rápida
  // (ex: bater em vários asteroides seguidos) empilhem partículas e derrubem o FPS.
  const MAX_CONCURRENT_EXPLOSIONS = 8;

  const createExplosion = (pos: THREE.Vector3, color: string) => {
    const parsedColor = new THREE.Color(color);
    const r = parsedColor.r;
    const g = parsedColor.g;
    const b = parsedColor.b;
    const particles = Array.from({ length: 15 }).map(() => ({ 
      pos: pos.clone(), 
      vel: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6), 
      scale: 0.1 + Math.random() * 0.25, 
      r, g, b,
      color 
    }));

    // Se já atingiu o limite, remove a explosão mais antiga antes de adicionar a nova
    if (explosionsRef.current.length >= MAX_CONCURRENT_EXPLOSIONS) {
      explosionsRef.current.shift();
    }

    explosionsRef.current.push({ id: Math.random().toString(), position: pos.clone(), particles, life: 1.0 });
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase(); 
      if (k === 'w') keysRef.current.w = true; 
      if (k === 's') keysRef.current.s = true; 
      if (k === 'a') keysRef.current.a = true; 
      if (k === 'd') keysRef.current.d = true; 
      if (e.key === 'ArrowUp') keysRef.current.ArrowUp = true; 
      if (e.key === 'ArrowDown') keysRef.current.ArrowDown = true; 
      if (e.key === 'ArrowLeft') keysRef.current.ArrowLeft = true; 
      if (e.key === 'ArrowRight') keysRef.current.ArrowRight = true; 
      if (e.key === "Shift") keysRef.current.Shift = true; 
      if (k === "e") keysRef.current.e = true;
      if (e.key === ' ' || k === ' ') keysRef.current[' '] = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase(); 
      if (k === 'w') keysRef.current.w = false; 
      if (k === 's') keysRef.current.s = false; 
      if (k === 'a') keysRef.current.a = false; 
      if (k === 'd') keysRef.current.d = false; 
      if (e.key === 'ArrowUp') keysRef.current.ArrowUp = false; 
      if (e.key === 'ArrowDown') keysRef.current.ArrowDown = false; 
      if (e.key === 'ArrowLeft') keysRef.current.ArrowLeft = false; 
      if (e.key === 'ArrowRight') keysRef.current.ArrowRight = false; 
      if (e.key === "Shift") keysRef.current.Shift = false;
      if (k === "e") keysRef.current.e = false;
      if (e.key === ' ' || k === ' ') keysRef.current[' '] = false;
    };
    const move = (e: MouseEvent) => { 
      if (document.pointerLockElement) {
        // Sensibilidade balanceada para controle preciso com Pointer Lock
        const sens = 0.002;
        pointerRef.current.x += e.movementX * sens;
        pointerRef.current.y -= e.movementY * sens; // Natural: mouse para cima = nariz para cima
        
        pointerRef.current.x = Math.max(-1.5, Math.min(1.5, pointerRef.current.x));
        pointerRef.current.y = Math.max(-1.5, Math.min(1.5, pointerRef.current.y));
      } else {
        // Suporte a controle de mouse livre mesmo fora do Pointer Lock
        const normX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
        const normY = -(e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
        pointerRef.current.x = THREE.MathUtils.clamp(normX * 1.2, -1.2, 1.2);
        pointerRef.current.y = THREE.MathUtils.clamp(normY * 1.2, -1.2, 1.2);
      }
    };
    const pointerLockChange = () => {
      if (!document.pointerLockElement) {
        pointerRef.current.x = 0;
        pointerRef.current.y = 0;
      }
    };
    window.addEventListener("keydown", down); 
    window.addEventListener("keyup", up); 
    window.addEventListener("mousemove", move);
    document.addEventListener("pointerlockchange", pointerLockChange);
    return () => { 
      window.removeEventListener("keydown", down); 
      window.removeEventListener("keyup", up); 
      window.removeEventListener("mousemove", move); 
      document.removeEventListener("pointerlockchange", pointerLockChange);
    };
  }, [isGameOver, localMuted, isHangarActive]);

  useEffect(() => {
    playSimSound("warp", localMuted); baseQuat.current.identity();
    if (shipRef.current) { shipRef.current.position.set(0, 0, 0); shipRef.current.rotation.set(0, 0, 0); }
    return () => {
      // Resource Manager: Limpeza profunda de texturas WebGL procedimentais
      textureCache.forEach((tex) => {
        try {
          tex.dispose();
        } catch (err) {
          console.warn("Error disposing cached texture:", err);
        }
      });
      textureCache.clear();
    };
  }, []);

  // Garantir foco automático imediato para que os comandos de teclado funcionem de imediato
  useEffect(() => {
    const focusGame = () => {
      window.focus();
      if (containerRef.current) {
        containerRef.current.focus();
      }
    };
    
    // Foca imediatamente ao montar
    focusGame();
    
    // Agenda um foco adicional para garantir o foco mesmo após o React atualizar a árvore do DOM
    const timer = setTimeout(focusGame, 100);
    const timer2 = setTimeout(focusGame, 500);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, []);

  // Foca também quando a tela de carregamento some ou quando o hangar é desativado (jogo começa)
  useEffect(() => {
    if ((isGameOver || isVictory) && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [isGameOver, isVictory]);

  useEffect(() => {
    if (!loadingScreenActive || !isHangarActive) {
      window.focus();
      if (containerRef.current) {
        containerRef.current.focus();
      }
    }
  }, [loadingScreenActive, isHangarActive, isGameOver, isVictory]);

  useEffect(() => {
    if (!loadingScreenActive && !takeoffStarted) {
      setTakeoffStarted(true);
    }
  }, [loadingScreenActive, takeoffStarted]);

  useEffect(() => {
    if (isHangarActive && takeoffStarted) {
      setTakeoffPercent(0);
      const startTime = Date.now();
      const duration = 3200; // 3.2 seconds
      
      let animFrame: number;
      let lastUpdate = 0;
      const update = () => {
        const elapsed = Date.now() - startTime;
        const prog = Math.min(100, (elapsed / duration) * 100);
        
        // Throttling: atualizar estado apenas a cada 100ms
        if (elapsed - lastUpdate > 100 || prog >= 100) {
          setTakeoffPercent(prog);
          lastUpdate = elapsed;
        }
        
        if (elapsed < duration) {
          animFrame = requestAnimationFrame(update);
        }
      };
      animFrame = requestAnimationFrame(update);
      return () => cancelAnimationFrame(animFrame);
    } else {
      setTakeoffPercent(0);
    }
  }, [isHangarActive, takeoffStarted]);

  useEffect(() => {
    if (isHangarActive && takeoffStarted) {
      const timer = setTimeout(() => {
        setIsHangarActive(false);
        // Iniciar de forma extremamente veloz e fluida
        const startSpeed = 150 + (stats.maxVelocity / 100) * 280;
        velocityRef.current = startSpeed;
        takeoffProgressRef.current = 1.0; // Inicia direto em 1.0 para impedir salto de câmera (glitch)
        shakeRef.current = 0.0; // Sem tremor na transição
        playSimSound("warp", localMuted);
        crazyGamesService.gameplayStart();
      }, 3200); // Perfeitamente sincronizado com o zoom da tela de decolagem
      return () => clearTimeout(timer);
    }
  }, [isHangarActive, takeoffStarted, localMuted]);

  const flightVectorRef = useRef<HTMLDivElement>(null);

  const resetGame = () => {
    setIsGameOver(false);
    setIsVictory(false);
    setAbilityActive(false);
    velocityRef.current = 0;
    baseQuat.current.identity();
    explosionsRef.current = [];
    scoreRef.current = 0;
    shieldRef.current = 100;
    armorRef.current = 100;
    setShieldState(100);
    setArmorState(100);
    energyRef.current = 100;
    setIsHangarActive(true);
    setTakeoffStarted(false);
    setTakeoffPercent(0);
    takeoffProgressRef.current = 1;
    multiplierRef.current = 1;
    if (shipRef.current) { shipRef.current.position.set(0, 0, 0); shipRef.current.rotation.set(0, 0, 0); }
    if (neonRingsRef.current) {
      neonRingsRef.current.forEach(ring => { ring.passed = false; });
    }
    playSimSound("click", localMuted);
  };


  return (
    <div 
      ref={containerRef} 
      tabIndex={0} 
      onClick={(e) => {
        // Ativar o controle de mouse oculto (pointer lock) ao clicar no simulador durante o voo
        const target = e.target as HTMLElement;
        if (!target.closest('button') && !target.closest('.pointer-events-auto') && !isHangarActive && !isGameOver && !isVictory) {
          if (containerRef.current && !document.pointerLockElement) {
            try {
              const res = (containerRef.current as any).requestPointerLock();
              if (res && typeof res.catch === 'function') res.catch(() => {});
            } catch (e) {}
          }
        }
      }}
      className="absolute inset-0 z-40 bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans outline-none focus:outline-none"
    >
      {loadingScreenActive && (
        <LoadingScreen onExited={() => setLoadingScreenActive(false)}>
          <Takeoff3DShipCanvas
            currentShip={currentShip}
            selectedColor={selectedColor}
            takeoffPercent={0}
            takeoffStarted={false}
            graphicsQuality={graphicsQuality}
          />
        </LoadingScreen>
      )}
      
      {/* SIMULATED AD OVERLAY */}
      <AnimatePresence>
        {isAdShowing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-transparent to-transparent" />
            </div>
            
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full border-4 border-zinc-800 border-t-emerald-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Rocket className="w-8 h-8 text-emerald-500 animate-pulse" />
              </div>
            </div>
            
            <h3 className="text-xl font-display font-black text-white uppercase tracking-[0.2em] mb-2">
              {t.tuningTransmission}
            </h3>
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest max-w-[250px]">
              {t.watchAdDoubleXp}
            </p>
            
            {/* Simulation Progress Bar */}
            <div className="w-full max-w-xs h-1.5 bg-zinc-900 rounded-full mt-8 overflow-hidden border border-white/5 p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
            
            <span className="text-[10px] font-mono text-zinc-600 mt-4 uppercase animate-pulse">
              {t.rewardAvailableSoon}
            </span>

            {!crazyGamesService.isEnabled() && (
              <div className="absolute bottom-10 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-widest italic">
                  {t.simulationActive}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      

      <SimulatorCanvas 
        graphicsQuality={graphicsQuality}
        setGraphicsQuality={setGraphicsQuality}
        velocityRef={velocityRef}
        shipRef={shipRef}
        selectedRoute={selectedRoute}
        isHangarActive={isHangarActive}
        setIsHangarActive={setIsHangarActive}
        takeoffProgressRef={takeoffProgressRef}
        pointerRef={pointerRef}
        keysRef={keysRef}
        scoreRef={scoreRef}
        multiplierRef={multiplierRef}
        planets={planets}
        asteroids={asteroids}
        satellites={satellites}
        abilityActive={abilityActive}
        setAbilityActive={setAbilityActive}
        energyRef={energyRef}
        currentShip={currentShip}
        createExplosion={createExplosion}
        localMuted={localMuted}
        shieldRef={shieldRef}
        armorRef={armorRef}
        flightVectorRef={flightVectorRef}
        setArmorState={setArmorState}
        setShieldState={setShieldState}
        setIsGameOver={setIsGameOver}
        setIsVictory={setIsVictory}
        trafficShips={trafficShips}
        shakeRef={shakeRef}
        explosionsRef={explosionsRef}
        selectedColor={selectedColor}
        countdown={countdown}
        stats={stats}
        neonRingsRef={neonRingsRef}
        customRouteDataRef={customRouteDataRef}
        asteroidsChangedRef={asteroidsChangedRef}
        repulsionVelRef={repulsionVelRef}
        asteroidTexture={asteroidTexture}
        fallbackAsteroidTexture={fallbackAsteroidTexture}
        baseQuat={baseQuat}
        envPreset={envPreset}
      />

      {/* Dynamic Hangar Takeoff Overlay using Custom Image */}
      <AnimatePresence>
        {isHangarActive && (
          <motion.div
            key="hangar-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center overflow-hidden bg-black"
          >
            {/* Imagem nítida e fixa da tela de decolagem (sem a distorção do zoom antigo) - scale-110 para cortar bordas com faixas pretas */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <img 
                id="hangar-image"
                src="/loading_bg.webp"
                className="w-full h-full object-cover select-none brightness-90 scale-110"
                style={{ imageRendering: "auto" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
            </div>

            {/* Renderizar a nave 3D real do jogador com a textura/skin selecionada desde o surgimento do Hangar */}
            <Takeoff3DShipCanvas
              currentShip={currentShip}
              selectedColor={selectedColor}
              takeoffPercent={takeoffPercent}
              takeoffStarted={takeoffStarted}
              graphicsQuality={graphicsQuality}
            />

            {/* Barra fina e discreta de carregamento do trajeto / decolagem (sem card) */}
            {takeoffStarted && (
              <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-72 sm:w-80 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-75 shadow-[0_0_8px_rgba(34,211,238,0.5)]" 
                    style={{ width: `${takeoffPercent}%` }} 
                  />
                </div>
                <div className="flex justify-between items-center w-full mt-2 font-mono text-[10px] text-zinc-400 tracking-wider uppercase opacity-85">
                  <span>
                    {takeoffPercent < 35 ? "IGNIÇÃO DOS PROPULSORES" : takeoffPercent < 75 ? "DECOLANDO PARA O ESPAÇO" : "VELOCIDADE DE ESCAPE"}
                  </span>
                  <span className="text-cyan-300 font-semibold">{Math.round(takeoffPercent)}%</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Controls Bar (Always visible except during Game Over) */}
      {!isGameOver && (
        <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Botão Voltar (Ícone) */}
            <button 
              onClick={() => { 
                playSimSound("click", localMuted); 
                if (document.pointerLockElement) {
                  document.exitPointerLock();
                }
                onExit(); 
              }} 
              title={t.back}
              aria-label={t.back}
              className="flex items-center justify-center w-10 h-10 bg-black/60 hover:bg-zinc-800/80 border border-white/10 rounded-lg transition-all cursor-pointer text-white/80 hover:text-white shadow-xl active:scale-95 group"
            >
              <ArrowLeft className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </button>

            {/* Botão Reiniciar */}
            <button 
              onClick={resetGame} 
              title={t.restart}
              aria-label={t.restart}
              className="flex items-center justify-center w-10 h-10 bg-black/60 hover:bg-zinc-800/80 border border-white/10 rounded-lg transition-all cursor-pointer text-white/80 hover:text-white shadow-xl active:scale-95 group"
            >
              <RotateCcw className="w-4.5 h-4.5 text-amber-500 group-hover:rotate-[-45deg] transition-transform" />
            </button>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button onClick={() => { const m = !localMuted; setLocalMuted(m); playSimSound("click", m); }} className="p-1.5 bg-black/40 hover:bg-black/60 border border-white/5 rounded-full text-white/60 hover:text-white transition-all cursor-pointer flex items-center justify-center">
              {localMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Game HUD */}
      <AnimatePresence>
        {!isHangarActive && !isGameOver && (
          <motion.div
            key="game-hud"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 1.0, ease: "easeOut" }}
            className="absolute inset-0 pointer-events-none z-10"
          >
            <TelemetryHUD 
              velocityRef={velocityRef} 
              energyRef={energyRef} 
              multiplierRef={multiplierRef}
              neonRingsRef={neonRingsRef}
              shipRef={shipRef}
              selectedRoute={selectedRoute}
              customRouteDataRef={customRouteDataRef}
              language={language}
              finalTimeRef={finalTimeRef}
              selectedColor={selectedColor}
              shieldRef={shieldRef}
              armorRef={armorRef}
              flightVectorRef={flightVectorRef}
            />

            {/* Desktop Control Info Panel (positioned on the right side of the screen) */}
            <div className="flex absolute bottom-6 right-6 z-10 pointer-events-none flex-col gap-1.5 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/5 w-[210px] font-mono select-none shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[8px] tracking-wider text-zinc-400">
                <span className="font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                  {t.flightControls}
                </span>
                <span className="text-[7px] text-zinc-600">MANUAL</span>
              </div>
              <div className="flex items-center justify-between text-[8px] text-zinc-400 mt-1">
                <span className="px-1 py-0.5 bg-white/10 rounded text-white/70 font-bold border border-white/5">MOUSE / WASD</span>
                <span className="text-zinc-500 text-right uppercase">{t.driveShip}</span>
              </div>
              <div className="flex items-center justify-between text-[8px] text-zinc-400">
                <span className="px-1 py-0.5 bg-white/10 rounded text-white/70 font-bold border border-white/5">ESPAÇO / ↑</span>
                <span className="text-zinc-500 text-right uppercase">{t.turbo}</span>
              </div>
              <div className="flex items-center justify-between text-[8px] text-zinc-400">
                <span className="px-1 py-0.5 bg-white/10 rounded text-white/70 font-bold border border-white/5">← / →</span>
                <span className="text-zinc-500 text-right uppercase">{t.roll}</span>
              </div>
              <div className="flex items-center justify-between text-[8px] text-zinc-400">
                <span className="px-1 py-0.5 bg-white/10 rounded text-white/70 font-bold border border-white/5">↓</span>
                <span className="text-zinc-500 text-right uppercase">{t.brake}</span>
              </div>
              <div className="flex items-center justify-between text-[8px] text-zinc-400">
                <span className="px-1 py-0.5 bg-white/10 rounded text-white/70 font-bold border border-white/5">ESC</span>
                <span className="text-zinc-500 text-right uppercase">{t.unlockMouse}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* VICTORY MODAL OVERLAY - OVERLAYS DIRETO SOBRE O CENÁRIO 3D DO ESPAÇO */}
      {isVictory && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[3px] p-4 sm:p-6 overflow-hidden pointer-events-auto select-none">
          {/* Dynamic Radial Glow over Space */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1)_0%,rgba(0,0,0,0.75)_100%)] pointer-events-none" />

          <motion.div 
            ref={victoryCardRef}
            onMouseMove={handleVictoryMouseMove}
            onMouseLeave={handleVictoryMouseLeave}
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="w-full max-w-md bg-slate-950/80 border border-cyan-500/40 rounded-2xl p-6 flex flex-col items-center gap-4 text-center relative overflow-hidden backdrop-blur-xl z-10 shadow-[0_0_50px_rgba(6,182,212,0.25)]"
            style={{
              transform: `perspective(1000px) rotateX(${victoryRotateX}deg) rotateY(${victoryRotateY}deg)`,
              transformStyle: "preserve-3d",
              transition: "transform 0.1s ease-out"
            }}
          >
            {/* Corner HUD Accent Brackets */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-2xl shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-2xl shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-2xl shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-2xl shadow-[0_0_8px_rgba(6,182,212,0.6)]" />

            {/* Header Ticker */}
            <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-[9px] font-mono tracking-widest text-cyan-300 uppercase shadow-[0_0_12px_rgba(6,182,212,0.2)]" style={{ transform: "translateZ(20px)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>[ TELEMETRIA • MISSÃO CONCLUÍDA ]</span>
            </div>

            {/* Main Title & Rank */}
            <div className="flex flex-col items-center gap-1" style={{ transform: "translateZ(30px)" }}>
              <h2 className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-emerald-300 to-teal-200 uppercase drop-shadow-[0_0_14px_rgba(6,182,212,0.5)]">
                {t.missionComplete}
              </h2>
              
              {/* Performance Rank Badge */}
              {(() => {
                let rank = "S";
                let rankColor = "text-amber-300 border-amber-400/50 bg-amber-500/10";
                let rankLabel = "TRAJETO MAGISTRAL";
                if (leaderboardInfo?.isNewRecord) {
                  rank = "S+";
                  rankColor = "text-amber-200 border-amber-300/70 bg-amber-500/20";
                  rankLabel = "NOVO RECORDE";
                } else if (selectedRoute.difficulty === "Difícil" || selectedRoute.difficulty === "Elite" || selectedRoute.difficulty === "Sobrevivência") {
                  rank = "S";
                  rankColor = "text-emerald-300 border-emerald-400/50 bg-emerald-500/10";
                  rankLabel = "DESEMPENHO ÉLITE";
                } else {
                  rank = "A";
                  rankColor = "text-cyan-300 border-cyan-400/50 bg-cyan-500/10";
                  rankLabel = "NAVEGAÇÃO PRECISA";
                }
                return (
                  <div className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border ${rankColor} text-[10px] font-mono font-bold tracking-wider uppercase`}>
                    <Award className="w-3.5 h-3.5" />
                    <span>RANK {rank} • {rankLabel}</span>
                  </div>
                );
              })()}
            </div>

            {/* Main Time Readout */}
            <div className="w-full py-3 bg-black/40 border border-cyan-500/25 rounded-xl flex flex-col items-center gap-0.5 font-mono relative overflow-hidden" style={{ transform: "translateZ(25px)" }}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
              <span className="text-zinc-400 text-[10px] uppercase tracking-widest flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                {t.yourTime}
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.65)] tracking-wider">
                {(finalTimeRef.current || 0).toFixed(3)}s
              </div>
              {leaderboardInfo?.isNewRecord ? (
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-widest animate-pulse">
                  ★ {t.newRecord} ★
                </span>
              ) : leaderboardInfo?.bestTime ? (
                <span className="text-[10px] text-zinc-400 font-mono">
                  {t.record}: <span className="text-amber-300 font-bold">{leaderboardInfo.bestTime.toFixed(3)}s</span>
                </span>
              ) : null}
            </div>

            {/* Discrete Telemetry Grid (2x2 minimal HUD cells) */}
            <div className="grid grid-cols-2 gap-2 w-full font-mono text-[11px]" style={{ transform: "translateZ(20px)" }}>
              <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 flex flex-col text-left">
                <span className="text-zinc-500 text-[9px] uppercase tracking-wider flex items-center gap-1">
                  <Rocket className="w-3 h-3 text-cyan-400" />
                  {t.shipUsed}
                </span>
                <span className="text-zinc-200 font-bold truncate mt-0.5">{currentShip.name}</span>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 flex flex-col text-left">
                <span className="text-zinc-500 text-[9px] uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  AROS
                </span>
                <span className="text-emerald-400 font-bold mt-0.5">{selectedRoute.numRings} / {selectedRoute.numRings} (100%)</span>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 flex flex-col text-left">
                <span className="text-zinc-500 text-[9px] uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {t.xpGained}
                </span>
                <span className="text-amber-300 font-bold mt-0.5">+{xpGained} XP</span>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 flex flex-col text-left">
                <span className="text-zinc-500 text-[9px] uppercase tracking-wider flex items-center gap-1">
                  <Flag className="w-3 h-3 text-purple-400" />
                  DIFICULDADE
                </span>
                <span className="text-purple-300 font-bold truncate mt-0.5">{translateDifficulty(selectedRoute.difficulty, language)}</span>
              </div>
            </div>

            {/* DISCRETE PROGRESS BAR - SEM CARD / SEM CONTAINER PESADO */}
            <div className="w-full flex flex-col gap-1.5 my-0.5 font-mono" style={{ transform: "translateZ(20px)" }}>
              <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden border border-white/10 p-0">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${playerService.getLevelProgress()}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 px-0.5">
                <span className="flex items-center gap-1 text-zinc-300 font-semibold">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {t.pilotLevel} {playerService.data.level}
                  {levelUpInfo?.levelUp && (
                    <span className="text-amber-300 font-bold animate-pulse ml-1">({t.levelUp}!)</span>
                  )}
                </span>
                <span className="text-zinc-400 text-[9.5px]">
                  {Math.round(playerService.getLevelProgress())}%
                  {playerService.data.level < 10 && ` • ${playerService.getXpToNextLevel()} XP restante`}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 w-full mt-1" style={{ transform: "translateZ(35px)" }}>
              <button 
                onClick={resetGame}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold font-mono text-xs tracking-widest uppercase rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-cyan-400/40"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.playAgain}</span>
              </button>
              <button 
                onClick={() => { playSimSound("click", localMuted); onExit(); }}
                className="flex-1 py-3 bg-black/50 hover:bg-black/75 border border-white/15 hover:border-white/30 text-zinc-300 hover:text-white font-bold font-mono text-xs tracking-widest uppercase rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.backToHangar}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
});

const PerformanceController = memo(function PerformanceController({
  graphicsQuality,
  setGraphicsQuality
}: {
  graphicsQuality: "high" | "low";
  setGraphicsQuality: (q: "high" | "low") => void;
}) {
  const frameTimesRef = useRef<number[]>([]);
  
  useFrame((state, dt) => {
    if (graphicsQuality === "low") return;
    
    const times = frameTimesRef.current;
    times.push(dt);
    if (times.length > 180) {
      times.shift();
    }
    
    if (times.length === 180) {
      const totalTime = times.reduce((sum, t) => sum + t, 0);
      const avgFPS = 180 / totalTime;
      
      if (avgFPS < 24) {
        console.warn(`[PerformanceController] FPS médio de ${avgFPS.toFixed(1)} caiu abaixo de 24 FPS. Degradando para qualidade 'low'.`);
        setGraphicsQuality("low");
        times.length = 0;
      }
    }
  });
  
  return null;
});

const DynamicFOV = memo(function DynamicFOV({
  velocityRef
}: {
  velocityRef: React.MutableRefObject<number>;
}) {
  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    if (camera && camera.isPerspectiveCamera) {
      const absVelocity = Math.abs(velocityRef.current);
      const targetFOV = 45 + Math.min(1.0, absVelocity / 450) * 17;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.08);
      camera.updateProjectionMatrix();
    }
  });
  return null;
});

export default SpaceSimulator;
