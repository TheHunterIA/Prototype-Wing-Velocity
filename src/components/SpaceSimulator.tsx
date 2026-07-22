import { Suspense, useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Html, useGLTF, useTexture, useProgress, Billboard } from "@react-three/drei";
import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
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
  Sparkles
} from "lucide-react";
import { SHIPS_DATA, calculateShipStats } from "../data";
import { ShipData, RouteData } from "../types";
import { LoadingScreen } from "./LoadingScreen";
import { translations, routeTranslations, translateDifficulty, translateClass, Language } from "../translations";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { crazyGamesService } from "../services/crazyGamesService";
import { playerService } from "../services/playerService";
import { leaderboardService } from "../lib/leaderboardService";
import { getRouteBehavior } from "../routes/routeBehaviors";

import { audioService } from "../services/audioService";

// Aliases para manter compatibilidade com o código legado
const playSimSound = (type: any, _muted: boolean) => audioService.playSfx(type);

const LOOK_AHEAD_MS = 100;
const SCHEDULE_AHEAD_TIME = 0.200;



function useSafeTexture(url: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.src = url;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!active) return;
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      setTexture(tex);
    };
    img.onerror = () => console.warn("Could not load texture safely: " + url + ", using procedural fallback.");
    return () => { active = false; };
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
    const blobLoops = isSmall ? 40 : 120;
    const flareLoops = isSmall ? 20 : 60;
    const sunspots = isSmall ? 3 : 8;
    const granulation = isSmall ? 300 : 1000; // de 20.000 para 300/1000! Uma redução colossal e imperceptível de longe!

    // Fundação convectiva profunda de calor solar (vermelho escuro / laranja)
    for (let i = 0; i < blobLoops; i++) {
      drawBlob(Math.random() * width, Math.random() * height, 15 + Math.random() * 30, "#d93800", 0.35);
    }
    // Erupções solares, proeminências e filamentos brilhantes (arcos dourados)
    for (let i = 0; i < flareLoops; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = 10 + Math.random() * 20;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "rgba(255, 205, 0, 0.9)");
      g.addColorStop(0.5, "rgba(255, 105, 0, 0.4)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    // Manchas Solares (manchas magnéticas frias: umbra escura com penumbra quente)
    for (let i = 0; i < sunspots; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = 2 + Math.random() * 5;
      drawBlob(cx, cy, r * 2.4, "#8a1c00", 0.65); // Penumbra
      drawBlob(cx, cy, r, "#1a0400", 0.95);    // Umbra profunda
    }
    // Granulação solar microscópica (células de convecção de alta frequência)
    for (let i = 0; i < granulation; i++) {
      ctx.globalAlpha = Math.random() * 0.15;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }
  } else if (type === "earth") {
    const continents = isSmall ? 6 : 14;
    const coastals = isSmall ? 8 : 16;
    const lights = isSmall ? 20 : 60;

    // Oceanos azuis profundos formam a base. Agora criamos continentes orgânicos
    for (let i = 0; i < continents; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height;
      const radius = isSmall ? 20 + Math.random() * 60 : 80 + Math.random() * 220;
      
      // Geração de continente multicamadas para praias de areia, vegetação exuberante e montanhas nevadas
      drawBlob(cx, cy, radius, "#d9b382", 0.95); // Camada 1: Deserto e praias douradas
      drawBlob(cx + (Math.random() - 0.5) * (isSmall ? 10 : 30), cy + (Math.random() - 0.5) * (isSmall ? 10 : 30), radius * 0.85, "#1e5225", 0.85); // Camada 2: Florestas verdes
      drawBlob(cx + (Math.random() - 0.5) * (isSmall ? 12 : 40), cy + (Math.random() - 0.5) * (isSmall ? 12 : 40), radius * 0.4, "#404a3e", 0.7);  // Camada 3: Cordilheiras rochosas cinzas
      drawBlob(cx + (Math.random() - 0.5) * (isSmall ? 15 : 45), cy + (Math.random() - 0.5) * (isSmall ? 15 : 45), radius * 0.15, "#ffffff", 0.9); // Camada 4: Neve e geleiras no cume
    }
    // Águas costeiras rasas (efeito de recifes e plataforma continental turquesa em transparência)
    ctx.globalCompositeOperation = "destination-over";
    for (let i = 0; i < coastals; i++) {
      drawBlob(Math.random() * width, Math.random() * height, (isSmall ? 30 : 100) + Math.random() * (isSmall ? 50 : 160), "#0e7490", 0.35);
    }
    ctx.globalCompositeOperation = "source-over";
    
    // Luzes das cidades (pontos de ouro e âmbar que acendem no lado escuro da Terra)
    for (let i = 0; i < lights; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height;
      drawBlob(cx, cy, 1 + Math.random() * 3, "#fef08a", 0.35);
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
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.1;
  });
  const texture = useMemo(() => generateNoiseTexture(256, 128, "asteroid", moon.color), [moon.color]);

  useEffect(() => {
    return () => {
      if (texture) texture.dispose();
    };
  }, [texture]);

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} position={[moon.distance, 0, 0]}>
        <sphereGeometry args={[moon.radius, 32, 32]} />
        <meshStandardMaterial map={texture || undefined} color={moon.color} roughness={0.9} />
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
  
  // Aplica um filtro de desfoque sutil para que as nuvens da Terra pareçam realistas e fofas, sem bordas marcadas
  ctx.filter = "blur(3.5px)";
  const drawBlob = (cx: number, cy: number, r: number, color: string, alpha: number) => {
    ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - width, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + width, cy, r, 0, Math.PI * 2); ctx.fill();
  };
  const isSmall = width <= 256;
  const count = isSmall ? 50 : 200;
  for (let i = 0; i < count; i++) {
    const y = Math.random() * height;
    const x = Math.random() * width;
    drawBlob(x, y, (isSmall ? 5 : 20) + Math.random() * (isSmall ? 15 : 50), "#ffffff", 0.15 + Math.random() * 0.35);
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

const EarthModel = memo(function EarthModel({ planet }: { planet: { id: string; pos: THREE.Vector3; radius: number; color: string; emissive: string; moons?: any[] } }) {
  const planetRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const planetTexture = useMemo(() => {
    return generateNoiseTexture(512, 256, "earth", "#0a3b8c");
  }, []);

  const cloudsTexture = useMemo(() => {
    return generateCloudsTexture(512, 256);
  }, []);

  const earthGlowTexture = useMemo(() => {
    return generatePlanetGlowTexture(planet.color || "#3b82f6");
  }, [planet.color]);

  useEffect(() => {
    return () => {
      if (planetTexture) planetTexture.dispose();
      if (cloudsTexture) cloudsTexture.dispose();
    };
  }, [planetTexture, cloudsTexture]);

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
      {/* Corpo principal da Terra */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[planet.radius, 64, 64]} />
        <meshStandardMaterial
          map={planetTexture || undefined}
          roughness={0.4}
          metalness={0.15}
        />
      </mesh>

      {/* Camada Dinâmica de Nuvens em Paralaxe */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[planet.radius * 1.015, 64, 64]} />
        <meshStandardMaterial
          map={cloudsTexture || undefined}
          transparent
          opacity={0.8}
          roughness={0.9}
          metalness={0.0}
          blending={THREE.NormalBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Atmosfera brilhante em Additive Blending */}
      <mesh>
        <sphereGeometry args={[planet.radius * 1.05, 32, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Glow Billboard para dar desfoque suave e halo volumétrico atmosférico à distância */}
      {earthGlowTexture && (
        <Billboard>
          <mesh>
            <planeGeometry args={[planet.radius * 2.8, planet.radius * 2.8]} />
            <meshBasicMaterial
              map={earthGlowTexture}
              transparent
              opacity={0.65}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </Billboard>
      )}

      {planet.moons && planet.moons.map((moon) => <MoonModel key={moon.id} moon={moon} />)}
    </group>
  );
});

const BlackHoleModel = memo(function BlackHoleModel({ planet }: { planet: { id: string; pos: THREE.Vector3; radius: number; color: string; emissive: string } }) {
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

const PlanetModel = memo(function PlanetModel({ planet }: { planet: { id: string; pos: THREE.Vector3; radius: number; color: string; emissive: string; moons?: any[] } }) {
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
    const baseColors: Record<string, string> = { sun: "#ffdd00", earth: "#0a3b8c", jupiter: "#c88b67", saturn: "#ccbb99", mars: "#a13213" };
    return generateNoiseTexture(512, 256, planet.id, baseColors[planet.id] || planet.color);
  }, [planet.id, planet.color]);

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
    switch (planet.id) {
      case "sun":
        return {
          color: undefined,
          emissive: new THREE.Color("#ffaa00"),
          emissiveIntensity: 6.0,
          roughness: 0.1,
          metalness: 0.0,
          toneMapped: false,
        };
      case "jupiter":
        return {
          color: planet.color,
          emissive: new THREE.Color("#3f2211"),
          emissiveIntensity: 0.25,
          roughness: 0.5,
          metalness: 0.1,
          toneMapped: true,
        };
      case "saturn":
        return {
          color: planet.color,
          emissive: new THREE.Color("#332c1e"),
          emissiveIntensity: 0.2,
          roughness: 0.55,
          metalness: 0.15,
          toneMapped: true,
        };
      case "mars":
        return {
          color: planet.color,
          emissive: new THREE.Color("#441105"),
          emissiveIntensity: 0.25,
          roughness: 0.7,
          metalness: 0.05,
          toneMapped: true,
        };
      case "venus":
        return {
          color: planet.color,
          emissive: new THREE.Color("#332205"),
          emissiveIntensity: 0.15,
          roughness: 0.9,
          metalness: 0.05,
          toneMapped: true,
        };
      default:
        return {
          color: planet.color,
          emissive: new THREE.Color(planet.emissive),
          emissiveIntensity: 0.1,
          roughness: 0.8,
          metalness: 0.1,
          toneMapped: true,
        };
    }
  }, [planet.id, planet.color, planet.emissive]);

  return (
    <group position={[planet.pos.x, planet.pos.y, planet.pos.z]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[planet.radius, 64, 64]} />
        <meshStandardMaterial 
          map={texture || undefined} 
          bumpMap={planet.id !== "sun" ? (texture || undefined) : undefined}
          bumpScale={
            planet.id === "sun" ? 0 :
            (planet.id === "jupiter" || planet.id === "saturn") ? planet.radius * 0.0015 :
            planet.radius * 0.008
          }
          color={materialProps.color} 
          emissive={materialProps.emissive}
          emissiveIntensity={materialProps.emissiveIntensity}
          roughness={materialProps.roughness} 
          metalness={materialProps.metalness} 
          toneMapped={materialProps.toneMapped}
        />
      </mesh>
      {planet.moons && planet.moons.map((moon) => <MoonModel key={moon.id} moon={moon} />)}
      {planet.id === "sun" ? (
        <>
          {/* 1. Halo luminoso difuso gigante (Glow) que acompanha a câmera suavemente */}
          {sunGlowTexture && (
            <Billboard>
              <mesh>
                <planeGeometry args={[planet.radius * 3.4, planet.radius * 3.4]} />
                <meshBasicMaterial 
                  map={sunGlowTexture} 
                  transparent 
                  opacity={0.9} 
                  blending={THREE.AdditiveBlending} 
                  depthWrite={false}
                />
              </mesh>
            </Billboard>
          )}

          {/* 2. Alargamento de lens estelar (Lens Flares) que gira lentamente dando dinamismo */}
          {sunFlareTexture && (
            <Billboard>
              <mesh ref={flareRef}>
                <planeGeometry args={[planet.radius * 4.6, planet.radius * 4.6]} />
                <meshBasicMaterial 
                  map={sunFlareTexture} 
                  transparent 
                  opacity={0.7} 
                  blending={THREE.AdditiveBlending} 
                  depthWrite={false}
                />
              </mesh>
            </Billboard>
          )}

          {/* 3. Atmosfera de borda 3D sutil para integrar a esfera sólida com o glow espacial */}
          <mesh>
            <sphereGeometry args={[planet.radius * 1.025, 32, 32]} />
            <meshBasicMaterial 
              color="#ffe169" 
              transparent 
              opacity={0.4} 
              blending={THREE.AdditiveBlending} 
              side={THREE.BackSide} 
            />
          </mesh>
        </>
      ) : (
        planet.id !== "mercury" && (
          <mesh>
            <sphereGeometry args={[planet.radius * 1.04, 32, 32]} />
            <meshBasicMaterial color={planet.color} transparent opacity={0.18} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
          </mesh>
        )
      )}

      {/* Glow Billboard para dar desfoque suave e halo volumétrico ao redor dos planetas */}
      {planetGlowTexture && (
        <Billboard>
          <mesh>
            <planeGeometry args={[planet.radius * 2.8, planet.radius * 2.8]} />
            <meshBasicMaterial 
              map={planetGlowTexture} 
              transparent 
              opacity={0.65} 
              blending={THREE.AdditiveBlending} 
              depthWrite={false}
            />
          </mesh>
        </Billboard>
      )}

      {planet.id === "saturn" && <SaturnRingsInstanced radius={planet.radius} />}
      {planet.id === "sun" && (
        <>
          {/* Luz solar intensa de longo alcance (ajustada para evitar ofuscamento excessivo) */}
          <pointLight distance={150000} decay={1.0} intensity={8.0} color={planet.color} castShadow />
          {/* Luz de preenchimento ambiente mais suave ao redor do sol */}
          <pointLight distance={30000} decay={1.5} intensity={5.0} color="#ffaa00" />
        </>
      )}
    </group>
  );
});

const DestroyedSatelliteModel = memo(function DestroyedSatelliteModel({ position, rotation, scale, selectedRoute }: { position: [number, number, number], rotation: [number, number, number], scale: number, selectedRoute: RouteData }) {
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

const RenderAsteroids = memo(function RenderAsteroids({ asteroids, texture, selectedRoute, graphicsQuality, asteroidsChangedRef }: { asteroids: any[], texture: THREE.Texture | null, selectedRoute: RouteData, graphicsQuality: "high" | "low", asteroidsChangedRef: React.RefObject<boolean> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = asteroids.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Criar uma geometria de asteroide procedural altamente realista, craterada e irregular (formato de batata cósmica)
  const asteroidGeometry = useMemo(() => {
    if (asteroidGeometryCache.has(graphicsQuality)) {
      return asteroidGeometryCache.get(graphicsQuality)!;
    }
    const detail = graphicsQuality === "high" ? 2 : 1;
    const geo = new THREE.DodecahedronGeometry(1, detail); // Subdivisões dinâmicas baseadas na qualidade para melhor desempenho
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

  // Executar a atualização a cada frame apenas quando houver asteroides se movendo ou se alguma posição tiver mudado (como wrap de asteroide)
  useFrame(() => {
    if (selectedRoute.hasMovingAsteroids || (asteroidsChangedRef && asteroidsChangedRef.current)) {
      updateAsteroidMatrices();
      if (asteroidsChangedRef) {
        asteroidsChangedRef.current = false;
      }
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geometryToUse as any, null as any, count]} frustumCulled={true}>
      <meshStandardMaterial 
        map={materialProps.useTexture ? (texture || undefined) : undefined} 
        bumpMap={materialProps.useTexture ? (texture || undefined) : undefined}
        bumpScale={0.15}
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
}

function PilotShipView({
  scene,
  currentShip,
  selectedColor,
  abilityActive,
  isHangarActive,
}: PilotShipViewProps) {
  const texture = useTexture(selectedColor.textureFile) as THREE.Texture;
  
  // PBR Maps (Common for all StarSparrow models)
  const pbrMaps = useTexture({
    normalMap: "/StarSparrow_Normal.webp",
    roughnessMap: "/StarSparrow_Roughness.webp",
    metalnessMap: "/StarSparrow_Metallic.webp",
    emissiveMap: "/StarSparrow_Emission.webp",
  });

  const shipMesh = useMemo(() => {
    const clone = scene.clone();

    // Configure textures
    const allTextures = [texture, ...Object.values(pbrMaps)];
    allTextures.forEach(t => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 16;
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
        mesh.material = new THREE.MeshStandardMaterial({
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
  }, [scene, texture, pbrMaps, currentShip.id]);

  // Atualiza as propriedades do material do clone de forma ultra-eficiente e sem re-alocar memória na GPU
  useEffect(() => {
    const isCloaked = abilityActive && currentShip.id === "sparrow-03";
    shipMesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.emissive.set(isCloaked ? "#00ffea" : "#ffffff");
          mat.emissiveIntensity = isCloaked ? 0.8 : 0.5;
          mat.roughness = isCloaked ? 0.9 : 1.0;
          mat.metalness = isCloaked ? 0.1 : 1.0;
          mat.opacity = isCloaked ? 0.25 : 1.0;
          mat.color.set(isCloaked ? "#00ffea" : "#ffffff");
          mat.needsUpdate = true;
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
  return <primitive object={shipMesh} scale={0.015} rotation={[tiltX, Math.PI, 0]} />;
}

function PilotShip({ currentShip, selectedColor, abilityActive, isHangarActive }: { currentShip: ShipData, selectedColor: any, abilityActive: boolean, isHangarActive: boolean }) {
  const gltf = useLoader(GLTFLoader, currentShip.modelFile);
  return <PilotShipView scene={gltf.scene} currentShip={currentShip} selectedColor={selectedColor} abilityActive={abilityActive} isHangarActive={isHangarActive} />;
}

function BossShipModel({ position, rotation, scale }: { position: THREE.Vector3, rotation: [number, number, number], scale: number }) {
  const gltf = useLoader(GLTFLoader, "/StarSparrow18.glb");
  const shipMesh = useMemo(() => {
    const clone = gltf.scene.clone();
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
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



function RenderNeonRings({ ringsRef, shipRef }: { ringsRef: React.MutableRefObject<any[]>, shipRef: React.MutableRefObject<THREE.Group | null> }) {
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
              
              // Apenas o aro atual e o seguinte devem ser visíveis
              const isVisible = !ring.passed && (i === currentRingIndex || i === currentRingIndex + 1);
              
              if (meshMain) {
                meshMain.visible = isVisible;
              }
              
              if (meshGlow) {
                meshGlow.visible = isVisible;
                if (meshGlow.visible) {
                  meshGlow.scale.set(pulseScale, pulseScale, 1.0);
                  meshGlow.rotation.z = time * 0.2;
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
  graphicsQuality: "high" | "low";
  setGraphicsQuality: (quality: "high" | "low") => void;
  language?: Language;
  onHangarStateChange?: (isActive: boolean) => void;
  isMobile?: boolean;
}

function ShipThrusters({ currentShip, selectedColor, keysRef, abilityActive, velocityRef }: { currentShip: ShipData, selectedColor: any, keysRef: React.RefObject<any>, abilityActive: boolean, velocityRef: React.RefObject<number> }) {
  const gltf = useLoader(GLTFLoader, currentShip.modelFile);
  const scene = gltf.scene;
  const groupRef = useRef<THREE.Group>(null); 
  
  const mat1 = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const mat2 = useMemo(() => new THREE.MeshBasicMaterial({ color: selectedColor.colorHex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), [selectedColor.colorHex]);
  const geo1 = useMemo(() => { const g = new THREE.ConeGeometry(0.2, 1.0, 16); g.translate(0, 0.5, 0); g.rotateX(Math.PI / 2); return g; }, []);
  const geo2 = useMemo(() => { const g = new THREE.ConeGeometry(0.35, 1.8, 16); g.translate(0, 0.9, 0); g.rotateX(Math.PI / 2); return g; }, []);
  
  const offsets = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene); const center = new THREE.Vector3(); box.getCenter(center);
    return [[0, -0.4, (box.max.z - center.z) * 0.015]] as [number, number, number][];
  }, [scene]);

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
          </group>
        ))}
      </group>
    </group>
  );
}

function ShipCrosshair({ selectedColor }: { selectedColor: any }) {
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
    };
  }, []);
  


  const countdown = null;
  
  // Em dispositivos móveis reduzimos a base de asteroides, já que GPUs móveis
  // sofrem muito mais com o fill-rate de centenas de instâncias + partículas simultâneas.
  const baseAsteroidCount = graphicsQuality === "high"
    ? (isMobile ? 200 : 400)
    : (isMobile ? 60 : 120);
  const asteroidCount = Math.round(baseAsteroidCount * selectedRoute.asteroidDensity);

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

    // Part 2: Obstacles ON THE PATH between rings
    for (let i = 0; i < count * 0.6; i++) {
      let ringIdx = Math.floor(random(i * 11) * (pathPoints.length - 1));
      if (selectedRoute.id === "route-certification") {
        // Apenas no final do trajeto (aro 5 em diante)
        ringIdx = 5 + Math.floor(random(i * 11) * (pathPoints.length - 1 - 5));
      }
      const p1 = pathPoints[ringIdx];
      const p2 = pathPoints[ringIdx + 1];
      const t = random(i * 12);
      const pos = new THREE.Vector3().lerpVectors(p1, p2, t);
      
      // Spread them around the corridor but keep them as obstacles
      const spread = 800 + (random(i * 13) * 1000);
      pos.x += (random(i * 14) - 0.5) * spread;
      pos.y += (random(i * 15) - 0.5) * spread;
      pos.z += (random(i * 16) - 0.5) * 500;

      // Garantir que os obstáculos flutuantes fiquem a uma distância confortável da entrada de cada aro
      if (pos.distanceTo(p1) < 450 || pos.distanceTo(p2) < 450) continue;

      const vel = selectedRoute.hasMovingAsteroids 
        ? new THREE.Vector3((random(i * 17) - 0.5) * selectedRoute.asteroidVelocity * 0.4, (random(i * 18) - 0.5) * selectedRoute.asteroidVelocity * 0.4, (random(i * 19) - 0.5) * selectedRoute.asteroidVelocity * 0.4)
        : new THREE.Vector3(0, 0, 0);

      items.push({ 
        id: `ast-path-${i}`, pos, 
        rot: [random(i * 20) * Math.PI, random(i * 21) * Math.PI, random(i * 22) * Math.PI] as [number, number, number], 
        scale: 2.0 + random(i * 23) * 15.0, 
        speed: selectedRoute.asteroidVelocity, velocity: vel
      });
    }
    return items;
  }, [asteroidCount, selectedRoute, getRouteCenterAtZ, calculateRingPosition]);

  const asteroidTexture = useSafeTexture("/asteroid_texture.webp"); 
  const fallbackAsteroidTexture = useMemo(() => generateNoiseTexture(128, 128, "asteroid", "#4a443f"), []);

  const ringsData = useMemo(() => {
    // Ajusta o raio dos aros de neon dinamicamente de acordo com a dificuldade descrita de cada pista
    let baseRadius = 120;
    const diff = selectedRoute.difficulty;
    if (diff === "Iniciante" || diff === "Fácil") {
      baseRadius = 160;
    } else if (diff === "Médio") {
      baseRadius = 120;
    } else if (diff === "Difícil") {
      baseRadius = 85;
    } else if (diff === "Elite" || diff === "Sobrevivência") {
      baseRadius = 70;
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

      return {
        id: `ring-${i}`,
        pos: calculateRingPosition(i),
        color,
        emissive,
        passed: false,
        radius: baseRadius
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

      // Avoid overlay with flight ring path
      if (finalPos.z < 2000 && finalPos.z > -totalDist - 15000) {
        const routeCenter = getRouteCenterAtZ(finalPos.z);
        const dx = finalPos.x - routeCenter.x;
        const dy = finalPos.y - routeCenter.y;
        const distXY = Math.sqrt(dx * dx + dy * dy);

        const maxMoonDist = p.moons ? Math.max(...p.moons.map((m: any) => m.distance + m.radius)) : 0;
        // Se for o planeta Saturno na rota de Saturno, a segurança deve considerar apenas o corpo físico sólido do planeta, não as luas distantes.
        const safetyRadius = (p.id === "saturn" && selectedRoute.id === "route-saturn-rings")
          ? p.radius + 1500
          : p.radius + maxMoonDist + 2800;

        if (distXY < safetyRadius) {
          const angle = distXY > 1 ? Math.atan2(dy, dx) : (p.radius % (Math.PI * 2));
          finalPos.x = routeCenter.x + Math.cos(angle) * (safetyRadius + 1000);
          finalPos.y = routeCenter.y + Math.sin(angle) * (safetyRadius + 1000);
        }
      }

      return { ...p, pos: finalPos };
    });
  }, [selectedRoute, getRouteCenterAtZ]);

  const nebulas = useMemo(() => {
    const seed = selectedRoute.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (i: number) => {
      const x = Math.sin(seed + i) * 10000;
      return x - Math.floor(x);
    };
    return Array.from({ length: selectedRoute.nebulaCount }).map((_, i) => ({ 
      pos: new THREE.Vector3((random(i * 1) - 0.5) * 400000, (random(i * 2) - 0.5) * 400000, (random(i * 3) - 0.5) * 400000), 
      scale: 40000 + random(i * 4) * 80000, 
      color: new THREE.Color().setHSL(random(i * 5), 0.7, 0.5) 
    }));
  }, [selectedRoute.id, selectedRoute.nebulaCount]);

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
        
        // Limitar o "joystick virtual" para evitar giros infinitos sem fim
        pointerRef.current.x = Math.max(-1.5, Math.min(1.5, pointerRef.current.x));
        pointerRef.current.y = Math.max(-1.5, Math.min(1.5, pointerRef.current.y));
      } else {
        // Fora do Pointer Lock, a nave não deve seguir a posição bruta do cursor —
        // ela só responde ao mouse quando o Pointer Lock está ativo (ramo acima).
        pointerRef.current.x = 0;
        pointerRef.current.y = 0;
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
    if (shipRef.current) { shipRef.current.position.set(0, 0, 100); shipRef.current.rotation.set(0, 0, 0); }
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
      const timer = setTimeout(async () => {
        // Request midroll ad before starting gameplay
        await crazyGamesService.requestAd('midroll');
        
        setIsHangarActive(false);
        velocityRef.current = 1400;
        takeoffProgressRef.current = 0;
        shakeRef.current = 3.5; // Dramatic camera shake on warp breakthrough
        playSimSound("warp", localMuted);
        crazyGamesService.gameplayStart();

        // Tentar travar o ponteiro do mouse automaticamente ao entrar em modo de voo
        setTimeout(() => {
          if (containerRef.current && !document.pointerLockElement) {
            containerRef.current.requestPointerLock();
          }
        }, 150);
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
    takeoffProgressRef.current = 0;
    multiplierRef.current = 1;
    if (shipRef.current) { shipRef.current.position.set(0, 0, 100); shipRef.current.rotation.set(0, 0, 0); }
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
            containerRef.current.requestPointerLock();
          }
        }
      }}
      className="absolute inset-0 z-40 bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans outline-none focus:outline-none"
    >
      {loadingScreenActive && (
        <LoadingScreen onExited={() => setLoadingScreenActive(false)} />
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
      

      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 6, 26], fov: 45, far: 200000 }}>
          <PerformanceController graphicsQuality={graphicsQuality} setGraphicsQuality={setGraphicsQuality} />
          <DynamicFOV velocityRef={velocityRef} />
          <SpeedParticles velocityRef={velocityRef} shipRef={shipRef} />
          <color attach="background" args={[selectedRoute.ambientColor === "#09090b" ? "#000000" : "#020205"]} />
          <fog attach="fog" args={[selectedRoute.ambientColor, 1000, 100000]} />
          <Suspense fallback={null}>
            <ambientLight intensity={1.2} />
            <hemisphereLight color={selectedRoute.ambientColor} groundColor="#111111" intensity={1.5} />
            <directionalLight position={[10, 25, 15]} intensity={3.5} castShadow />
            <directionalLight position={[-15, 8, -15]} intensity={2.5} color={selectedColor.colorHex} />
            <directionalLight position={[0, -20, 0]} intensity={0.8} color="#0d1127" />
            {/* Ambient Environment (Always visible for seamless transition) */}
            <RenderMilkyWay />
            <RenderNebulas nebulas={nebulas} />
            <RenderBackgroundStars />
            
              <GameEngine 
                shipRef={shipRef} 
                velocityRef={velocityRef} 
                baseQuat={baseQuat} 
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
                setIsGameOver={(val: boolean) => {
                  setArmorState(armorRef.current);
                  setShieldState(shieldRef.current);
                  setIsGameOver(val);
                }} 
                setIsVictory={(val: boolean) => {
                  setArmorState(armorRef.current);
                  setShieldState(shieldRef.current);
                  setIsVictory(val);
                }} 
                trafficShips={trafficShips} 
                shakeRef={shakeRef} 
                explosionsRef={explosionsRef} 
                selectedColor={selectedColor} 
                countdown={countdown}
                stats={stats}
                neonRingsRef={neonRingsRef}
                selectedRoute={selectedRoute}
                customRouteDataRef={customRouteDataRef}
                asteroidsChangedRef={asteroidsChangedRef}
              />
            
            <RenderNeonRings ringsRef={neonRingsRef} shipRef={shipRef} />

            
            {/* Planets always visible so the corridor exit frames them beautifully */}
            {planets.map(p => <PlanetModel key={p.id} planet={p} />)}
            
            {/* Keep asteroids, satellites, and explosions always rendered so you can see them from inside the corridor before exiting */}
            <RenderExplosions explosionsRef={explosionsRef} />
            {satellites.map(s => <DestroyedSatelliteModel key={s.id} position={[s.pos.x, s.pos.y, s.pos.z]} rotation={s.rot} scale={s.scale} selectedRoute={selectedRoute} />)}
            {/* Render highly optimized instanced asteroids with just 1 Draw Call! */}
            <RenderAsteroids asteroids={asteroids} texture={asteroidTexture || fallbackAsteroidTexture} selectedRoute={selectedRoute} graphicsQuality={graphicsQuality} asteroidsChangedRef={asteroidsChangedRef} />
            

            <group ref={shipRef} visible={!isHangarActive}>
              <PilotShip currentShip={currentShip} selectedColor={selectedColor} abilityActive={abilityActive} isHangarActive={isHangarActive} />
              <ShipThrusters currentShip={currentShip} selectedColor={selectedColor} keysRef={keysRef} abilityActive={abilityActive} velocityRef={velocityRef} />
              <ShipCrosshair selectedColor={selectedColor} />

              {/* Luzes locais de altíssimo brilho atreladas à nave para destacá-la no espaço */}
              <pointLight position={[0, 10, 15]} intensity={30.0} distance={200} decay={1.0} />
              <pointLight position={[0, -8, -15]} intensity={25.0} distance={150} decay={1.0} color={selectedColor.colorHex} />
              <directionalLight position={[5, 15, 15]} intensity={6.0} />
            </group>
            {graphicsQuality === "high" && (
              <EffectComposer>
                <Bloom luminanceThreshold={0.9} mipmapBlur intensity={0.3} />
                <Noise opacity={0.02} />
                <Vignette eskil={false} offset={0.1} darkness={0.9} />
              </EffectComposer>
            )}
          </Suspense>
        </Canvas>
      </div>

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
            <motion.div
              className="absolute inset-0 w-full h-full"
              initial={{ scale: 1.0, filter: "blur(0px) brightness(1)", opacity: 1 }}
              animate={takeoffStarted ? { 
                scale: 3.5, 
                filter: "blur(8px) brightness(1.0)",
                opacity: 0,
                transition: { duration: 3.2, ease: "easeIn" }
              } : {
                scale: 1.0, 
                filter: "blur(0px) brightness(1)",
                opacity: 1
              }}
            >
              <img 
                id="hangar-image"
                src="/loading_bg.webp"
                className={`w-full h-full object-cover select-none ${takeoffPercent >= 80 ? 'animate-shake' : ''}`}
                style={{ imageRendering: "auto" }}
              />
            </motion.div>

            {/* Custom sci-fi progress bar */}
            {takeoffStarted && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-80 bg-black/75 border border-white/10 backdrop-blur-md px-6 py-4 rounded-xl flex flex-col items-center justify-center gap-2 shadow-2xl pointer-events-auto">
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-600 via-amber-500 to-orange-400 transition-all duration-75 shadow-[0_0_15px_rgba(251,146,60,0.5)]" 
                    style={{ width: `${takeoffPercent}%` }} 
                  />
                </div>
                <div className="flex justify-between w-full text-[10px] font-mono font-bold tracking-wider uppercase">
                  <span className={`${takeoffPercent >= 80 ? 'text-orange-500 animate-pulse' : 'text-zinc-400'}`}>
                    {takeoffPercent >= 80 ? t.startingEngines : t.preparingThrusters}
                  </span>
                  <span className="text-orange-400">{Math.round(takeoffPercent)}%</span>
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
              <ArrowLeft className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
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
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
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

      {/* GAME OVER MODAL OVERLAY */}
      {isGameOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 overflow-hidden">
          {/* Fundo de Linhas Sci-Fi */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(239,68,68,0.06),rgba(0,255,0,0.02),rgba(239,68,68,0.06))] bg-[size:100%_4px,6px_100%] opacity-20 pointer-events-none" />

          <motion.div 
            ref={gameOverCardRef}
            onMouseMove={handleGameOverMouseMove}
            onMouseLeave={handleGameOverMouseLeave}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-sm bg-zinc-950/90 border border-red-500/40 rounded-2xl p-8 flex flex-col items-center gap-6 text-center relative overflow-hidden backdrop-blur-xl"
            style={{
              transform: `perspective(1000px) rotateX(${gameOverRotateX}deg) rotateY(${gameOverRotateY}deg) scale(1.02)`,
              transformStyle: "preserve-3d",
              transition: "transform 0.1s ease-out, box-shadow 0.1s ease-out",
              boxShadow: `
                ${-gameOverRotateY * 1.5}px ${gameOverRotateX * 1.5}px 30px rgba(0, 0, 0, 0.8), 
                0 0 40px rgba(239, 68, 68, ${0.12 + Math.abs(gameOverRotateX)/40}), 
                0 0 100px rgba(239, 68, 68, 0.05)
              `
            }}
          >
            {/* Ambient Glare Effect */}
            <div 
              className="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-300 opacity-75 z-10"
              style={{
                background: `radial-gradient(circle 200px at ${gameOverGlowX}% ${gameOverGlowY}%, rgba(239, 68, 68, 0.18), transparent 70%)`
              }}
            />

            {/* Sci-fi decorative borders */}
            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-red-500/60" />
            <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-red-500/60" />
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-red-500/60" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-red-500/60" />

            {/* Decorative Corner Dots */}
            <div className="absolute top-1.5 left-1.5 w-1 h-1 rounded-full bg-red-500/40" />
            <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-red-500/40" />
            <div className="absolute bottom-1.5 left-1.5 w-1 h-1 rounded-full bg-red-500/40" />
            <div className="absolute bottom-1.5 right-1.5 w-1 h-1 rounded-full bg-red-500/40" />
            
            <div className="relative" style={{ transform: "translateZ(45px)", transformStyle: "preserve-3d" }}>
              <div className="absolute inset-0 rounded-full bg-red-500/20 blur-2xl animate-pulse" />
              <ShieldAlert className="w-16 h-16 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-bounce relative z-10" />
            </div>
            
            <div className="flex flex-col gap-1.5" style={{ transform: "translateZ(35px)" }}>
              <h2 className="text-2xl font-mono font-black tracking-widest text-red-500 uppercase">
                {t.connectionLost}
              </h2>
              <p className="text-[10px] font-mono text-zinc-500 tracking-wide uppercase">
                {t.criticalDamage}
              </p>
            </div>
            
            <div className="w-full bg-black/60 border border-white/5 rounded-xl p-5 flex flex-col gap-3.5 font-mono text-xs text-left" style={{ transform: "translateZ(25px)" }}>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-500 uppercase text-[10px] tracking-wider">{t.shipUsed}:</span>
                <span className="text-white font-bold">{currentShip.name}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-white/5 pt-3">
                <span className="text-zinc-500 uppercase text-[10px] tracking-wider">{t.xpCollected}:</span>
                <span className="text-orange-400 font-bold">+{xpGained} XP</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2.5 w-full mt-2" style={{ transform: "translateZ(40px)" }}>
              <button 
                onClick={resetGame}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold font-mono text-xs tracking-widest uppercase rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.35)] transition-all active:scale-[0.98] cursor-pointer"
              >
                {t.tryAgain}
              </button>
              <button 
                onClick={() => { playSimSound("click", localMuted); onExit(); }}
                className="w-full py-3.5 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white font-bold font-mono text-xs tracking-widest uppercase rounded-xl transition-all active:scale-[0.98] cursor-pointer"
              >
                {t.backToHangar}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* VICTORY MODAL OVERLAY */}
      {isVictory && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 overflow-hidden">
          {/* Fundo de Linhas Sci-Fi */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(16,185,129,0.04),rgba(0,255,0,0.01),rgba(16,185,129,0.04))] bg-[size:100%_4px,6px_100%] opacity-25 pointer-events-none" />

          <motion.div 
            ref={victoryCardRef}
            onMouseMove={handleVictoryMouseMove}
            onMouseLeave={handleVictoryMouseLeave}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-sm bg-zinc-950/90 border border-emerald-500/40 rounded-2xl p-8 flex flex-col items-center gap-6 text-center relative overflow-hidden backdrop-blur-xl"
            style={{
              transform: `perspective(1000px) rotateX(${victoryRotateX}deg) rotateY(${victoryRotateY}deg) scale(1.02)`,
              transformStyle: "preserve-3d",
              transition: "transform 0.1s ease-out, box-shadow 0.1s ease-out",
              boxShadow: `
                ${-victoryRotateY * 1.5}px ${victoryRotateX * 1.5}px 30px rgba(0, 0, 0, 0.8), 
                0 0 40px rgba(16, 185, 129, ${0.15 + Math.abs(victoryRotateX)/40}), 
                0 0 100px rgba(16, 185, 129, 0.05)
              `
            }}
          >
            {/* Ambient Glare Effect */}
            <div 
              className="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-300 opacity-75 z-10"
              style={{
                background: `radial-gradient(circle 200px at ${victoryGlowX}% ${victoryGlowY}%, rgba(16, 185, 129, 0.22), transparent 70%)`
              }}
            />

            {/* Sci-fi decorative borders */}
            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-500/60" />
            <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-500/60" />
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-500/60" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-500/60" />

            {/* Decorative Corner Dots */}
            <div className="absolute top-1.5 left-1.5 w-1 h-1 rounded-full bg-emerald-500/40" />
            <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-emerald-500/40" />
            <div className="absolute bottom-1.5 left-1.5 w-1 h-1 rounded-full bg-emerald-500/40" />
            <div className="absolute bottom-1.5 right-1.5 w-1 h-1 rounded-full bg-emerald-500/40" />
            
            <div className="relative" style={{ transform: "translateZ(50px)", transformStyle: "preserve-3d" }}>
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />
              <Trophy className="w-16 h-16 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] relative z-10" />
            </div>
            
            <div className="flex flex-col gap-1.5" style={{ transform: "translateZ(35px)" }}>
              <h2 className="text-2xl font-mono font-black tracking-widest text-emerald-400 uppercase">
                {t.missionComplete}
              </h2>
              <p className="text-[10px] font-mono text-zinc-400 tracking-wide uppercase">
                {t.masteredNavigation}
              </p>
            </div>
            
            <div className="w-full bg-black/60 border border-white/5 rounded-xl p-5 flex flex-col gap-2.5 font-mono text-xs text-left" style={{ transform: "translateZ(25px)" }}>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500 uppercase text-[10px] tracking-wider">{t.shipUsed}:</span>
                <span className="text-white font-bold">{currentShip.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <span className="text-zinc-500 uppercase text-[10px] tracking-wider">{t.yourTime}:</span>
                <span className="text-amber-400 font-bold text-sm">{(finalTimeRef.current || 0).toFixed(3)}s</span>
              </div>
              {leaderboardInfo && (
                <div className="flex justify-between items-center py-1 border-t border-white/5">
                  <span className="text-zinc-500 uppercase text-[10px] tracking-wider">{t.record}:</span>
                  <span className={`${leaderboardInfo.isNewRecord ? 'text-emerald-400' : 'text-zinc-400'} font-bold`}>
                    {leaderboardInfo.isNewRecord ? t.newRecord : `${leaderboardInfo.bestTime.toFixed(3)}s`}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <span className="text-zinc-500 uppercase text-[10px] tracking-wider">{t.xpGained}:</span>
                <span className="text-emerald-400 font-bold">+{xpGained} XP</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <span className="text-zinc-500 uppercase text-[10px] tracking-wider">{t.hullStatus}:</span>
                <span className="text-emerald-400 font-bold">{Math.max(0, Math.round(armorState))}%</span>
              </div>
            </div>

            {/* Pilot Level Progress */}
            <div className="w-full flex flex-col gap-2 mt-2" style={{ transform: "translateZ(30px)" }}>
              <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                <span className="text-zinc-400">{t.pilotLevel} {playerService.data.level}</span>
                {levelUpInfo?.levelUp && (
                  <span className="text-orange-400 font-bold animate-bounce">{t.levelUp}</span>
                )}
                <span className="text-zinc-500">{Math.round(playerService.getLevelProgress())}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${playerService.getLevelProgress()}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                />
              </div>
              {playerService.data.level < 10 && (
                <span className="text-[8px] font-mono text-zinc-600 text-right uppercase">
                  {playerService.getXpToNextLevel()} {t.xpToNextLevel}
                </span>
              )}
            </div>
            
            <div className="flex flex-col gap-2.5 w-full mt-2" style={{ transform: "translateZ(40px)" }}>
              <button 
                onClick={resetGame}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold font-mono text-xs tracking-widest uppercase rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] cursor-pointer"
              >
                {t.playAgain}
              </button>
              <button 
                onClick={() => { playSimSound("click", localMuted); onExit(); }}
                className="w-full py-3.5 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white font-bold font-mono text-xs tracking-widest uppercase rounded-xl transition-all active:scale-[0.98] cursor-pointer"
              >
                {t.backToHangar}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
});

function SpeedParticles({ velocityRef, shipRef }: { velocityRef: React.MutableRefObject<number>, shipRef: React.RefObject<THREE.Group> }) {
  const pointsRef = useRef<THREE.Points>(null); 
  const matRef = useRef<THREE.PointsMaterial>(null);
  const count = 500;
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3); const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) { pos[i * 3] = (Math.random() - 0.5) * 600; pos[i * 3 + 1] = (Math.random() - 0.5) * 600; pos[i * 3 + 2] = (Math.random() - 0.5) * 600; vel[i] = 1 + Math.random() * 2; }
    return [pos, vel];
  }, []);
  useFrame((state, dt) => {
    if (!pointsRef.current) return;
    const absVelocity = Math.abs(velocityRef.current);
    if (matRef.current) {
      matRef.current.opacity = Math.min(1, absVelocity / 500);
    }
    if (shipRef.current) { pointsRef.current.position.copy(shipRef.current.position); pointsRef.current.quaternion.copy(shipRef.current.quaternion); }

    // Nave parada (velocidade ≈ 0): nenhuma partícula se move, então pulamos o
    // loop de CPU e o upload do buffer de posições pra GPU nesse frame.
    if (absVelocity < 0.01) return;

    const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = attr.array as Float32Array;
    const speedMultiplier = (absVelocity * 0.15 + 100) * dt;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      array[idx + 2] += speedMultiplier * velocities[i];
      if (array[idx + 2] > 300) { 
        array[idx + 2] = -300; 
        array[idx] = (Math.random() - 0.5) * 600; 
        array[idx + 1] = (Math.random() - 0.5) * 600; 
      }
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={pointsRef}>
      <bufferGeometry><bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} /></bufferGeometry>
      <pointsMaterial ref={matRef} size={1.2} color="#ffffff" transparent opacity={0} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  );
}

function DynamicFOV({ velocityRef }: { velocityRef: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  useFrame((state, dt) => {
    const speed = Math.abs(velocityRef.current);
    // Base FOV é 45. Aumentamos bastante para dar sensação de alta velocidade logo de início
    // speed normal ~450, turbo ~1125
    const targetFOV = 45 + Math.min(80, (speed / 150) * 15);
    const cam = camera as THREE.PerspectiveCamera;
    const newFov = THREE.MathUtils.lerp(cam.fov, targetFOV, dt * 2.5);
    if (Math.abs(cam.fov - newFov) > 0.01) {
      cam.fov = newFov;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

// Textura da camada externa: nuvem ampla e esfumaçada com variação (não é um único
// degradê perfeito) — várias manchas radiais sobrepostas simulando turbulência de gás.
function generateNebulaWispTexture() {
  const cacheKey = "nebula_wisp_v2";
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;
  const size = 256;
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.filter = "blur(6px)";
  for (let i = 0; i < 9; i++) {
    const cx = size / 2 + (Math.random() - 0.5) * size * 0.35;
    const cy = size / 2 + (Math.random() - 0.5) * size * 0.35;
    const r = size * (0.28 + Math.random() * 0.24);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255,0.32)");
    g.addColorStop(0.55, "rgba(255,255,255,0.09)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(c);
  textureCache.set(cacheKey, texture);
  return texture;
}

// Textura do núcleo: densidade mais concentrada, pra dar sensação de camadas (core + halo)
function generateNebulaCoreTexture() {
  const cacheKey = "nebula_core_v2";
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;
  const size = 256;
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.filter = "blur(3px)";
  for (let i = 0; i < 5; i++) {
    const cx = size / 2 + (Math.random() - 0.5) * size * 0.18;
    const cy = size / 2 + (Math.random() - 0.5) * size * 0.18;
    const r = size * (0.16 + Math.random() * 0.14);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(0.6, "rgba(255,255,255,0.15)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(c);
  textureCache.set(cacheKey, texture);
  return texture;
}

const RenderNebulas = memo(function RenderNebulas({ nebulas }: { nebulas: any[] }) {
  const wispTexture = useMemo(() => generateNebulaWispTexture(), []);
  const coreTexture = useMemo(() => generateNebulaCoreTexture(), []);
  const outerRefs = useRef<(THREE.Sprite | null)[]>([]);
  const innerRefs = useRef<(THREE.Sprite | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < nebulas.length; i++) {
      // Leve rotação de parallax — cada camada gira numa velocidade levemente diferente,
      // o que já dá sensação de profundidade e movimento sem custo de CPU/GPU real
      // (apenas a propriedade `.rotation` do material, nenhum buffer é tocado).
      const outerMat = outerRefs.current[i]?.material as THREE.SpriteMaterial | undefined;
      if (outerMat) outerMat.rotation = t * 0.015 + i;
      const innerMat = innerRefs.current[i]?.material as THREE.SpriteMaterial | undefined;
      if (innerMat) innerMat.rotation = -t * 0.025 + i;
    }
  });

  return (
    <group>
      {nebulas.map((neb, i) => (
        <group key={i}>
          <sprite ref={(el) => { outerRefs.current[i] = el; }} position={neb.pos} scale={[neb.scale * 1.4, neb.scale * 1.4, 1]}>
            <spriteMaterial map={wispTexture} color={neb.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.05} />
          </sprite>
          <sprite ref={(el) => { innerRefs.current[i] = el; }} position={neb.pos} scale={[neb.scale * 0.7, neb.scale * 0.7, 1]}>
            <spriteMaterial map={coreTexture} color={neb.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.1} />
          </sprite>
        </group>
      ))}
    </group>
  );
});

// Faixa de "Via Láctea" de fundo: um único plano bem distante e sutil, mesmo esquema
// econômico das nebulosas (1 draw call a mais, textura gerada e cacheada uma única vez).
function generateMilkyWayTexture() {
  const cacheKey = "milkyway_band_v1";
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;
  const w = 1024, h = 512;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, "rgba(150,165,255,0)");
  grad.addColorStop(0.32, "rgba(175,180,255,0.05)");
  grad.addColorStop(0.48, "rgba(215,205,255,0.16)");
  grad.addColorStop(0.5, "rgba(230,220,255,0.2)");
  grad.addColorStop(0.52, "rgba(215,205,255,0.16)");
  grad.addColorStop(0.68, "rgba(175,180,255,0.05)");
  grad.addColorStop(1.0, "rgba(150,165,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Poeira estelar/nuvens escuras sutis quebrando a uniformidade da faixa
  ctx.filter = "blur(2px)";
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * w;
    const y = h * 0.5 + (Math.random() - 0.5) * h * 0.34;
    const r = 4 + Math.random() * 14;
    ctx.globalAlpha = 0.05 + Math.random() * 0.05;
    ctx.fillStyle = "#050308";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  // Pontinhos brilhantes espalhados pela faixa, simulando aglomerados estelares densos
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * w;
    const y = h * 0.5 + (Math.random() - 0.5) * h * 0.3;
    ctx.globalAlpha = 0.15 + Math.random() * 0.25;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(c);
  textureCache.set(cacheKey, texture);
  return texture;
}

const RenderMilkyWay = memo(function RenderMilkyWay() {
  const texture = useMemo(() => generateMilkyWayTexture(), []);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Rotação extremamente lenta, quase imperceptível — só pra dar uma sensação viva de fundo
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.00012;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 2000, -34000]} rotation={[0.25, 0.4, 0.85]} renderOrder={-1}>
      <planeGeometry args={[95000, 42000]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.45}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
        fog={false}
      />
    </mesh>
  );
});

function PerformanceController({ graphicsQuality, setGraphicsQuality }: { graphicsQuality: "high" | "low", setGraphicsQuality: (q: "high" | "low") => void }) {
  usePerformanceMonitor({ graphicsQuality, setGraphicsQuality });
  return null;
}

// Shader super leve: o "twinkle" e o sprite circular suave são resolvidos inteiramente
// na GPU (matemática por vértice/fragmento). A cada frame só atualizamos um único
// uniform (uTime) — nenhum buffer de posição/tamanho é reenviado pra GPU.
const STAR_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aPhase;
  attribute float aBrightness;
  uniform float uTime;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = color;
    // Cintilação sutil: cada estrela tem uma fase própria pra não piscarem em sincronia
    vTwinkle = aBrightness * (0.78 + 0.22 * sin(uTime * (0.6 + aPhase * 0.9) + aPhase * 6.2831));
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (420.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    // Sprite circular suave (em vez do ponto quadrado padrão do PointsMaterial)
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv) * 2.0;
    float alpha = smoothstep(1.0, 0.0, dist);
    gl_FragColor = vec4(vColor * vTwinkle, alpha * vTwinkle);
  }
`;

const RenderBackgroundStars = memo(function RenderBackgroundStars() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const count = 2600;

  const { positions, colors, sizes, phases, brightnesses } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const brightness = new Float32Array(count);

    // Cores de estrelas astronômicas realistas baseadas em tipos espectrais (O, B, A, F, G, K, M)
    const starColors = [
      new THREE.Color("#9bb0ff"), // Azul (Supergigante quente)
      new THREE.Color("#aabfff"), // Azul-Branco
      new THREE.Color("#ffffff"), // Branco Puro
      new THREE.Color("#fbf8ff"), // Amarelo-Branco (Semelhante ao Sol)
      new THREE.Color("#ffddb4"), // Laranja (Gigante vermelha)
      new THREE.Color("#ffb4b4"), // Vermelho (Anã vermelha)
    ];

    for (let i = 0; i < count; i++) {
      // Posicionar estrelas em uma esfera celeste maciça muito distante para dar senso de escala infinita
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 38000 + Math.random() * 12000; // Esfera distante

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const color = starColors[Math.floor(Math.random() * starColors.length)];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      // Distribuição tipo "magnitude estelar": a maioria pequena e fraca,
      // poucas grandes e brilhantes (rand^5 concentra a massa perto de 0)
      const magnitude = Math.pow(Math.random(), 5);
      size[i] = 1.1 + magnitude * 7.5;
      brightness[i] = 0.45 + magnitude * 0.85;
      phase[i] = Math.random() * 10.0;
    }
    return { positions: pos, colors: col, sizes: size, phases: phase, brightnesses: brightness };
  }, []);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    if (pointsRef.current) {
      // Rotação celeste ultra-suave para dar vida e dinamismo de rotação galáctica de fundo
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.0006;
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.0002;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={count} array={phases} itemSize={1} />
        <bufferAttribute attach="attributes-aBrightness" count={count} array={brightnesses} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={STAR_VERTEX_SHADER}
        fragmentShader={STAR_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
});

const RenderExplosions = memo(function RenderExplosions({ explosionsRef }: { explosionsRef: React.RefObject<ExplosionState[]> }) {
  const meshRef = useRef<THREE.Points>(null);
  const maxParticles = 3000;

  // Pré-alocar arrays na CPU para reusar e evitar Garbage Collection
  const [positions, colors, sizes] = useMemo(() => {
    return [
      new Float32Array(maxParticles * 3),
      new Float32Array(maxParticles * 4),
      new Float32Array(maxParticles)
    ];
  }, []);

  // Guarda quantas partículas foram desenhadas no frame anterior, pra sabermos
  // se o buffer já está zerado e podemos pular o upload pra GPU por completo.
  const lastParticleCountRef = useRef(0);

  useFrame(() => {
    if (meshRef.current && explosionsRef.current) {
      const explosions = explosionsRef.current;

      // Nenhuma explosão ativa e o buffer já foi zerado antes: não há nada
      // novo pra subir pra GPU, então pulamos o frame inteiro.
      if (explosions.length === 0 && lastParticleCountRef.current === 0) {
        return;
      }

      let particleIdx = 0;

      explosions.forEach(exp => {
        exp.particles.forEach(part => {
          if (particleIdx < maxParticles) {
            const pIdx3 = particleIdx * 3;
            const pIdx4 = particleIdx * 4;

            positions[pIdx3] = part.pos.x;
            positions[pIdx3 + 1] = part.pos.y;
            positions[pIdx3 + 2] = part.pos.z;

            // Se r, g, b não estiverem definidos (fallback), usa cores padrão de fogo
            colors[pIdx4] = (part as any).r ?? 1.0;
            colors[pIdx4 + 1] = (part as any).g ?? 0.5;
            colors[pIdx4 + 2] = (part as any).b ?? 0.0;
            colors[pIdx4 + 3] = exp.life; // Alfa baseado no tempo de vida da explosão

            sizes[particleIdx] = part.scale * exp.life;
            particleIdx++;
          }
        });
      });

      const geom = meshRef.current.geometry;
      if (geom) {
        const posAttr = geom.attributes.position as THREE.BufferAttribute;
        const colAttr = geom.attributes.color as THREE.BufferAttribute;
        const sizAttr = geom.attributes.size as THREE.BufferAttribute;

        if (posAttr && colAttr && sizAttr) {
          posAttr.needsUpdate = true;
          colAttr.needsUpdate = true;
          sizAttr.needsUpdate = true;
        }
        geom.setDrawRange(0, particleIdx);
      }

      lastParticleCountRef.current = particleIdx;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={maxParticles}
          array={positions}
          itemSize={3}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-color"
          count={maxParticles}
          array={colors}
          itemSize={4}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-size"
          count={maxParticles}
          array={sizes}
          itemSize={1}
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
      <pointsMaterial size={1} vertexColors transparent blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
});

function TelemetryHUD({ 
  velocityRef, 
  energyRef, 
  multiplierRef,
  neonRingsRef, 
  shipRef,
  selectedRoute,
  customRouteDataRef,
  language,
  finalTimeRef,
  selectedColor,
  shieldRef,
  armorRef,
  flightVectorRef
}: { 
  velocityRef: React.MutableRefObject<number>, 
  energyRef: React.MutableRefObject<number>,
  multiplierRef?: React.MutableRefObject<number>,
  neonRingsRef?: React.MutableRefObject<any[]>,
  shipRef?: React.MutableRefObject<THREE.Group | null>,
  selectedRoute: RouteData,
  customRouteDataRef?: React.MutableRefObject<any>,
  language?: Language,
  finalTimeRef?: React.MutableRefObject<number>,
  selectedColor: any,
  shieldRef: React.MutableRefObject<number>,
  armorRef: React.MutableRefObject<number>,
  flightVectorRef?: React.RefObject<HTMLDivElement>
}) {
  const lang = language || "pt";
  const t = translations[lang];
  const multiplierTextRef = useRef<HTMLSpanElement>(null);
  const multiplierBarRef = useRef<HTMLDivElement>(null);
  const raceTimerRef = useRef(0);
  const raceStartedRef = useRef(false);
  const raceEndedRef = useRef(false);
  const lastTimeRef = useRef<number | null>(null);

  const envTexts = {
    pt: {
      sectorStatus: "ESTADO DO SETOR",
      stable: "ESTÁVEL",
      engineTemp: "TEMP. MOTORES",
      iceFriction: "ATRITO DE GELO",
      outOfLine: "🔴 FORA DA LINHA!",
      excellent: "🟢 EXCELENTE",
      solarShockwave: "CHOC-WAVE SOLAR",
      waveIn: "ONDA EM: ",
      gravityWell: "GRAV. POÇO G",
      vacuumDraft: "DRAFT DE VÁCUO",
      enteringDraft: "🔥 ENTRANDO EM DRAFT",
      seekingLine: "BUSCANDO LINHA",
      iceAccumulated: "GELO ACUMULADO",
      empDischarge: "EMP DESCARGA",
      reversal: "⚡ REVERSÃO!",
      normal: "NORMAL",
      finished: "FINALIZADO",
      routeComplete: "ROTA COMPLETA ✓",
      automatedLaser: "LASER AUTOMÁTICO",
      laserActive: "🚨 LASER ATIVO",
      securePortal: "PORTAL SEGURO",
      oxygenFuel: "COMBUSTÍVEL O2",
      criticalAnomaly: "ANOMALIA AMBIENTAL CRÍTICA",
      criticalWarning: "AVISO DE EVENTO CRÍTICO",
      skillMultiplier: "MULTIPLICADOR",
      nextRing: "PRÓX. ARO",
      activeRing: "ARO ATIVO",
      distance: "DISTÂNCIA",
      totalTime: "TEMPO DE TRAJETO",
      sector: "SETOR",
      tutorial: "TUTORIAL",
      ringAlignment: "ALINHAMENTO COM ANÉIS",
      outOfTrack: "FORA DA TRILHA",
      aligned: "ALINHADO",
      shockwaveAbsorbed: "ONDA SOLAR ABSORVIDA POR ASTEROIDE ✓",
      shockwaveDevastating: "ONDA SOLAR DEVASTADORA! VELOCIDADE REDUZIDA",
      shockwaveTimerWarning: "SOMBREIE EM UM ASTEROIDE",
      attractionCritical: "CAMPO DE ATRAÇÃO CRÍTICO: ACELERAÇÃO MÁXIMA!",
      thrustersFrozen: "PROPULSORES MANOBRA CONGELADOS",
      slowControl: "CONTROLE LENTO",
      reversePolarity: "⚡ POLARIDADE REVERSA",
      invertedControls: "CONTROLES DE MANOBRA INVERTIDOS!",
      laserBarrier: "🚨 BARRIÈRE LASER EN COURS ! ESQUIVEZ !",
      o2ReserveCritical: "🔴 RESERVA DE O2 CRÍTICA",
      rechargeThroughRings: "ATRAVÉS DE AROS RECARREGA"
    },
    en: {
      sectorStatus: "SECTOR STATUS",
      stable: "STABLE",
      engineTemp: "ENGINE TEMP",
      iceFriction: "ICE FRICTION",
      outOfLine: "🔴 OUT OF LINE!",
      excellent: "🟢 EXCELLENT",
      solarShockwave: "SOLAR SHOCKWAVE",
      waveIn: "WAVE IN: ",
      gravityWell: "G-WELL GRAVITY",
      vacuumDraft: "VACUUM DRAFT",
      enteringDraft: "🔥 ENTERING DRAFT",
      seekingLine: "SEEKING LINE",
      iceAccumulated: "ICE ACCUMULATION",
      empDischarge: "EMP DISCHARGE",
      reversal: "⚡ REVERSAL!",
      normal: "NORMAL",
      finished: "FINISHED",
      routeComplete: "ROUTE COMPLETE ✓",
      automatedLaser: "AUTOMATED LASER",
      laserActive: "🚨 LASER ACTIVE",
      securePortal: "SECURE PORTAL",
      oxygenFuel: "O2 FUEL",
      criticalAnomaly: "CRITICAL ENVIRONMENTAL ANOMALY",
      criticalWarning: "CRITICAL EVENT WARNING",
      skillMultiplier: "MULTIPLIER",
      nextRing: "NEXT RING",
      activeRing: "ACTIVE RING",
      distance: "DISTANCE",
      totalTime: "TRAJECTORY TIME",
      sector: "SECTOR",
      tutorial: "TUTORIAL",
      ringAlignment: "RING ALIGNMENT",
      outOfTrack: "OUT OF TRACK",
      aligned: "ALIGNED",
      shockwaveAbsorbed: "SOLAR SHOCKWAVE ABSORBED BY ASTEROID ✓",
      shockwaveDevastating: "DEVASTATING SOLAR SHOCKWAVE! SPEED REDUCED",
      shockwaveTimerWarning: "SHADE BEHIND AN ASTEROID",
      attractionCritical: "CRITICAL ATTRACTION FIELD: MAXIMUM ACCELERATION!",
      thrustersFrozen: "MANEUVER THRUSTERS FROZEN",
      slowControl: "SLOW CONTROL",
      reversePolarity: "⚡ REVERSE POLARITY",
      invertedControls: "MANEUVER CONTROLS INVERTED!",
      laserBarrier: "🚨 LASER BARRIER IN PROGRESS! DODGE!",
      o2ReserveCritical: "🔴 O2 RESERVE CRITICAL",
      rechargeThroughRings: "RECHARGE THROUGH RINGS"
    },
    es: {
      sectorStatus: "ESTADO DEL SECTOR",
      stable: "ESTABLE",
      engineTemp: "TEMP. MOTORES",
      iceFriction: "FRICCIÓN DE HIELO",
      outOfLine: "🔴 ¡FUERA DE LÍNEA!",
      excellent: "🟢 EXCELENTE",
      solarShockwave: "ONDA DE CHOQUE SOLAR",
      waveIn: "ONDA EN: ",
      gravityWell: "POZO DE GRAVEDAD",
      vacuumDraft: "DRAFT DE VACÍO",
      enteringDraft: "🔥 ENTRANDO EN DRAFT",
      seekingLine: "BUSCANDO LÍNEA",
      iceAccumulated: "HIELO ACUMULADO",
      empDischarge: "DESCARGA EMP",
      reversal: "⚡ ¡REVERSIÓN!",
      normal: "NORMAL",
      finished: "FINALIZADO",
      routeComplete: "RUTA COMPLETADA ✓",
      automatedLaser: "LÁSER AUTOMÁTICO",
      laserActive: "🚨 LÁSER ACTIVO",
      securePortal: "PORTAL SEGURO",
      oxygenFuel: "COMBUSTIBLE O2",
      criticalAnomaly: "ANOMALÍA AMBIENTAL CRÍTICA",
      criticalWarning: "AVISO DE EVENTO CRÍTICO",
      skillMultiplier: "MULTIPLICADOR",
      nextRing: "PRÓX. ARO",
      activeRing: "ARO ATIVO",
      distance: "DISTANCIA",
      totalTime: "TIEMPO DE TRAYECTO",
      sector: "SECTOR",
      tutorial: "TUTORIAL",
      ringAlignment: "ALINEACIÓN CON ANILLOS",
      outOfTrack: "FUERA DE LA PISTA",
      aligned: "ALINEADO",
      shockwaveAbsorbed: "ONDA SOLAR ABSORBIDA POR ASTEROIDE ✓",
      shockwaveDevastating: "¡ONDA SOLAR DEVASTADORA! VELOCIDAD REDUCIDA",
      shockwaveTimerWarning: "SOMBREE EN UN ASTEROIDE",
      attractionCritical: "¡CAMPO DE ATRACCIÓN CRÍTICO: ACELERACIÓN MÁXIMA!",
      thrustersFrozen: "PROPULSORES DE MANIOBRA CONGELADOS",
      slowControl: "CONTROL LENTO",
      reversePolarity: "⚡ POLARIDAD INVERSA",
      invertedControls: "¡CONTROLES DE MANIOBRA INVERTIDOS!",
      laserBarrier: "🚨 ¡BARRERA LÁSER EN CURSO! ¡ESQUIVA!",
      o2ReserveCritical: "🔴 RESERVA DE O2 CRÍTICA",
      rechargeThroughRings: "RECARGA A TRAVÉS DE LOS AROS"
    },
    fr: {
      sectorStatus: "ÉTAT DU SECTEUR",
      stable: "STABLE",
      engineTemp: "TEMP. MOTEURS",
      iceFriction: "FRICTION DE GLACE",
      outOfLine: "🔴 HORS LIGNE !",
      excellent: "🟢 EXCELLENT",
      solarShockwave: "ONDE DE CHOC SOLAIRE",
      waveIn: "ONDE DANS : ",
      gravityWell: "PUITS DE GRAVITÉ",
      vacuumDraft: "ASPIRATION DE VIDE",
      enteringDraft: "🔥 ENTRÉE EN ASPIRATION",
      seekingLine: "RECHERCHE DE LIGNE",
      iceAccumulated: "GLACE ACCUMULÉE",
      empDischarge: "DÉCHARGE EMP",
      reversal: "⚡ INVERSION !",
      normal: "NORMAL",
      finished: "TERMINÉ",
      routeComplete: "ROUTE COMPLÈTE ✓",
      automatedLaser: "LASER AUTOMATISÉ",
      laserActive: "🚨 LASER ACTIF",
      securePortal: "PORTAIL SÉCURISÉ",
      oxygenFuel: "CARBURANT O2",
      criticalAnomaly: "ANOMALIE ENVIRONNEMENTALE CRITIQUE",
      criticalWarning: "AVERTISSEMENT D'ÉVÉNEMENT CRITIQUE",
      skillMultiplier: "MULTIPLICATEUR",
      nextRing: "PROCHAIN ANNEAU",
      activeRing: "ANNEAU ACTIF",
      distance: "DISTANCE",
      totalTime: "TEMPS DE TRAJET",
      sector: "SECTEUR",
      tutorial: "TUTORIEL",
      ringAlignment: "ALIGNEMENT DES ANNEAUX",
      outOfTrack: "HORS PISTE",
      aligned: "ALIGNÉ",
      shockwaveAbsorbed: "ONDE SOLAIRE ABSORBÉE PAR L'ASTÉROÏDE ✓",
      shockwaveDevastating: "ONDE SOLAIRE DÉVASTATRICE ! VITESSE RÉDUITE",
      shockwaveTimerWarning: "METTEZ-VOUS À L'OMBRE D'UN ASTÉROÏDE",
      attractionCritical: "CHAMP D'ATTRACTION CRITIQUE : ACCÉLÉRATION MAXIMALE !",
      thrustersFrozen: "PROPULSEURS DE MANOEUVRE GELÉS",
      slowControl: "CONTRÔLE LENT",
      reversePolarity: "⚡ INVERSION DE POLARITÉ",
      invertedControls: "COMMANDES DE MANOEUVRE INVERSÉES !",
      laserBarrier: "🚨 BARRIÈRE LASER EN COURS ! ESQUIVEZ !",
      o2ReserveCritical: "🔴 RÉSERVE D'O2 CRITIQUE",
      rechargeThroughRings: "RECHARGEZ VIA LES ANNEAUX"
    }
  };

  const currEnv = envTexts[lang];

  const velTextRef = useRef<HTMLSpanElement>(null);
  const energyLabelRef = useRef<HTMLSpanElement>(null);
  const energyTextRef = useRef<HTMLSpanElement>(null);
  const energyBarRef = useRef<HTMLDivElement>(null);
  const activeRingTextRef = useRef<HTMLSpanElement>(null);
  const activeRingDistRef = useRef<HTMLSpanElement>(null);
  
  // Ref para o novo radar tático circular de alta performance via HTML5 Canvas
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const radarDistanceTextRef = useRef<HTMLSpanElement>(null);
  const radarBadgeRef = useRef<HTMLDivElement>(null);

  const shieldTextRef = useRef<HTMLSpanElement>(null);
  const shieldBarRef = useRef<HTMLDivElement>(null);
  const armorTextRef = useRef<HTMLSpanElement>(null);
  const armorBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animFrame: number;
    raceTimerRef.current = 0;
    raceStartedRef.current = false;
    raceEndedRef.current = false;
    lastTimeRef.current = null;

    // Pre-allocated math objects for 60fps HUD calculations to avoid garbage collection stutters
    const localPosCopy = new THREE.Vector3();
    const shipQuatInverse = new THREE.Quaternion();
    const toRingWorld = new THREE.Vector3();
    const localPos = new THREE.Vector3();

    const update = () => {
      const now = performance.now();
      let dt = 0;
      if (lastTimeRef.current !== null) {
        dt = (now - lastTimeRef.current) / 1000;
      }
      lastTimeRef.current = now;

      if (velTextRef.current) velTextRef.current.innerText = `${Math.max(0, Math.round(velocityRef.current * 4))}`;
      
      const e = energyRef.current;
      const roundedE = Math.round(e);
      if (energyTextRef.current) energyTextRef.current.innerText = `${roundedE}%`;
      if (energyBarRef.current) energyBarRef.current.style.width = `${roundedE}%`;
      
      if (e < 25) {
        energyLabelRef.current?.classList.add('text-red-400', 'animate-pulse');
        energyLabelRef.current?.classList.remove('text-emerald-400');
        energyTextRef.current?.classList.add('text-red-300');
        energyTextRef.current?.classList.remove('text-emerald-300');
        energyBarRef.current?.classList.add('bg-red-500');
        energyBarRef.current?.classList.remove('bg-emerald-400');
      } else {
        energyLabelRef.current?.classList.remove('text-red-400', 'animate-pulse');
        energyLabelRef.current?.classList.add('text-emerald-400');
        energyTextRef.current?.classList.remove('text-red-300');
        energyTextRef.current?.classList.add('text-emerald-300');
        energyBarRef.current?.classList.remove('bg-red-500');
        energyBarRef.current?.classList.add('bg-emerald-400');
      }

      // Cálculo dinâmico do aro ativo e distância na GPU/CPU sem re-renderizar o React
      let activeRingIndex = -1;
      let activeRingDist = 0;
      let activeRingHex = "#a855f7"; // default purple
      
      if (neonRingsRef && neonRingsRef.current && shipRef && shipRef.current) {
        const shipObj = shipRef.current;
        const shipPos = shipObj.position;
        const rings = neonRingsRef.current;
        for (let i = 0; i < rings.length; i++) {
          if (!rings[i].passed) {
            activeRingIndex = i;
            const ringPos = rings[i].pos;
            activeRingDist = Math.round(shipPos.distanceTo(ringPos));
            if (i === 0) {
              activeRingHex = "#10b981"; // green
            } else if (i === rings.length - 1) {
              activeRingHex = "#ef4444"; // red
            } else {
              activeRingHex = "#a855f7"; // purple
            }

            // Cálculo matemático robusto e preciso no espaço local usando o inverso do quaternion da nave.
            const shipQuat = shipObj.quaternion;
            shipQuatInverse.copy(shipQuat).invert();
            
            // Vetor mundial relativo (aro - nave)
            toRingWorld.subVectors(ringPos, shipPos);
            
            // Transforma o vetor mundial diretamente para o espaço local da nave via rotação do quaternion
            localPos.copy(toRingWorld).applyQuaternion(shipQuatInverse);
            localPosCopy.copy(localPos);
            break;
          }
        }
      }

      // Atualiza o radar no Canvas de forma otimizada
      if (radarCanvasRef.current) {
        const canvas = radarCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const radarRadius = canvas.width / 2 - 4; // 66px

          // Cor primária baseada no aro ativo
          const primaryHex = activeRingIndex === -1 ? "#10b981" : activeRingHex;
          
          // Fundo tático do radar (círculo com gradiente sutil escuro)
          ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
          ctx.beginPath();
          ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
          ctx.fill();

          // Círculos de grade concêntricos
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 1;

          // Círculo externo
          ctx.beginPath();
          ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Círculo intermediário (alcance médio)
          ctx.beginPath();
          ctx.arc(cx, cy, radarRadius * 0.65, 0, Math.PI * 2);
          ctx.stroke();

          // Círculo interno (alcance próximo)
          ctx.beginPath();
          ctx.arc(cx, cy, radarRadius * 0.3, 0, Math.PI * 2);
          ctx.stroke();

          // Linhas de eixo (Cruz de mira tática)
          ctx.beginPath();
          ctx.moveTo(cx, cy - radarRadius);
          ctx.lineTo(cx, cy + radarRadius);
          ctx.moveTo(cx - radarRadius, cy);
          ctx.lineTo(cx + radarRadius, cy);
          ctx.stroke();

          // Varredura de radar (Sweep angle) animada em tempo real
          const sweepAngle = (Date.now() / 1500) * Math.PI * 2;
          ctx.strokeStyle = "rgba(168, 85, 247, 0.12)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(sweepAngle) * radarRadius, cy + Math.sin(sweepAngle) * radarRadius);
          ctx.stroke();

          // Se houver um aro ativo, desenhar o blip tático em 3D projetado
          if (activeRingIndex !== -1) {
            // No espaço local do Three.js:
            // - X: positivo para a direita, negativo para a esquerda
            // - Z: negativo para a frente, positivo para trás
            // - Y: positivo para cima, negativo para baixo
            const dx = localPosCopy.x;
            const dy = -localPosCopy.z; // Inverter Z para que positivo seja FRENTE (cima no radar)
            const dz = localPosCopy.y;  // Elevação vertical do aro em relação à nave

            const dist2D = Math.sqrt(dx * dx + dy * dy);
            
            // Direções normais do blip
            const dirX = dist2D > 0.01 ? dx / dist2D : 0;
            const dirY = dist2D > 0.01 ? dy / dist2D : 0;

            // Escalonamento de distância não-linear (potência de 0.75 para dar mais precisão a objetos próximos)
            // Alcance máximo do radar: 4200 metros
            const distFraction = Math.pow(Math.min(1.0, activeRingDist / 4200), 0.75);
            const diskR = radarRadius - 8; // Deixa margem para o blip caber perfeitamente

            // Ponto projetado na base (plano 2D do radar)
            const baseX = cx + dirX * diskR * distFraction;
            const baseY = cy - dirY * diskR * distFraction; // Subtrai porque Y cresce para baixo no Canvas

            // Posição de elevação real (deslocamento vertical baseado no eixo Y local)
            // Escala a altura proporcionalmente para que fique nítida no canvas circular
            const elevY = baseY - dz * 0.012;

            // Se o blip estiver atrás da nave (dy < 0), ele pisca vermelho sutilmente para avisar retorno de rumo
            const isBehind = dy < 0;

            // Desenhar a linha de elevação 3D (Stem)
            ctx.strokeStyle = isBehind ? "rgba(239, 68, 68, 0.4)" : "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(baseX, baseY);
            ctx.lineTo(baseX, elevY);
            ctx.stroke();
            ctx.setLineDash([]); // Reseta linha tracejada

            // Desenhar a sombra/footprint na base 2D (um pequeno elipsoide achatado)
            ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
            ctx.beginPath();
            ctx.ellipse(baseX, baseY, 3, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Desenhar o blip principal com efeito de brilho holográfico e pulsação
            const pulse = 0.85 + Math.sin(Date.now() / 150) * 0.15;
            const blipColor = isBehind ? "#ef4444" : primaryHex;

            ctx.shadowBlur = isBehind ? 4 : 12;
            ctx.shadowColor = blipColor;
            ctx.fillStyle = blipColor;
            
            ctx.beginPath();
            ctx.arc(baseX, elevY, (isBehind ? 3.5 : 4.5) * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          // Desenhar a nave do jogador no centro (Seta indicadora de direção branca brilhante)
          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = 6;
          ctx.shadowColor = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(cx, cy - 5);      // bico da nave
          ctx.lineTo(cx - 4, cy + 4);  // asa esquerda
          ctx.lineTo(cx, cy + 2);      // motor traseiro
          ctx.lineTo(cx + 4, cy + 4);  // asa direita
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Atualiza o indicador de texto de distância e aro ativo no painel de telemetria
      if (activeRingTextRef.current) {
        if (activeRingIndex === -1) {
          activeRingTextRef.current.innerText = currEnv.finished;
          activeRingTextRef.current.style.color = "#10b981";
          activeRingTextRef.current.classList.remove('animate-pulse');
        } else {
          activeRingTextRef.current.innerText = `${activeRingIndex + 1} / ${selectedRoute.numRings}`;
          activeRingTextRef.current.style.color = activeRingHex;
          
          if (activeRingIndex === selectedRoute.numRings - 1) {
            activeRingTextRef.current.classList.add('animate-pulse');
          } else {
            activeRingTextRef.current.classList.remove('animate-pulse');
          }
        }
      }

      // Lógica de tempo do trajeto
      const rings = neonRingsRef?.current || [];
      const numRings = selectedRoute.numRings;
      
      const anyRingPassed = rings.some((r: any) => r.passed);
      if (!anyRingPassed) {
        raceTimerRef.current = 0;
        raceStartedRef.current = false;
        raceEndedRef.current = false;
      } else {
        const firstPassed = rings[0]?.passed;
        const lastPassed = rings[numRings - 1]?.passed;

        if (firstPassed && !raceEndedRef.current) {
          raceStartedRef.current = true;
          if (lastPassed) {
            raceEndedRef.current = true;
            if (finalTimeRef) finalTimeRef.current = raceTimerRef.current;
          } else {
            raceTimerRef.current += dt;
            if (finalTimeRef) finalTimeRef.current = raceTimerRef.current;
          }
        }
      }

      const formatTime = (seconds: number) => {
        if (seconds >= 60) {
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          const ms = Math.floor((seconds % 1) * 100);
          return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        } else {
          const ms = Math.floor((seconds % 1) * 100);
          return `${seconds.toFixed(2)}s`;
        }
      };

      if (activeRingDistRef.current) {
        activeRingDistRef.current.innerText = formatTime(raceTimerRef.current);
        if (raceEndedRef.current) {
          activeRingDistRef.current.style.color = "#10b981"; // verde quando terminar
        } else if (raceStartedRef.current) {
          activeRingDistRef.current.style.color = "#22d3ee"; // ciano enquanto corre
        } else {
          activeRingDistRef.current.style.color = "#a1a1aa"; // cinza parado
        }
      }

      // Atualiza o badge minimalista do radar com a distância
      if (radarDistanceTextRef.current) {
        if (activeRingIndex === -1) {
          radarDistanceTextRef.current.innerText = currEnv.routeComplete;
        } else {
          radarDistanceTextRef.current.innerText = `${activeRingDist} m`;
        }
      }

      if (radarBadgeRef.current) {
        if (activeRingIndex === -1) {
          radarBadgeRef.current.style.color = "#10b981";
          radarBadgeRef.current.style.borderColor = "rgba(16, 185, 129, 0.2)";
          radarBadgeRef.current.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.15)";
        } else {
          radarBadgeRef.current.style.color = activeRingHex;
          radarBadgeRef.current.style.borderColor = `${activeRingHex}25`;
          radarBadgeRef.current.style.boxShadow = `0 0 10px ${activeRingHex}15`;
        }
      }

      // Update Multiplier HUD
      if (multiplierTextRef.current) {
        multiplierTextRef.current.innerText = `x${multiplierRef.current}`;
        if (multiplierRef.current > 1) {
          multiplierTextRef.current.classList.add('text-cyan-400');
          multiplierTextRef.current.classList.remove('text-zinc-500');
        } else {
          multiplierTextRef.current.classList.remove('text-cyan-400');
          multiplierTextRef.current.classList.add('text-zinc-500');
        }
      }
      if (multiplierBarRef.current) {
        multiplierBarRef.current.style.width = `${Math.min(100, (multiplierRef.current / 10) * 100)}%`;
      }

      // Atualização do módulo de telemetria ambiental em tempo real
      const envLabel = document.getElementById("env-label");
      const envValueText = document.getElementById("env-value-text");
      const envBarContainer = document.getElementById("env-bar-container");
      const envBarFill = document.getElementById("env-bar-fill");
      const dangerAlert = document.getElementById("hud-danger-alert");
      const dangerText = document.getElementById("hud-danger-text");

      if (customRouteDataRef && customRouteDataRef.current) {
        const data = customRouteDataRef.current;
        
        // 1. Alerta de Perigo Vermelho Piscante
        if (dangerAlert && dangerText) {
          if (data.warningActive && data.warningText) {
            // Tradução simples para o warningText dinâmico se necessário
            let translatedWarning = data.warningText;
            const w = data.warningText;
            if (w.includes("FORA DA LINHA") || w.includes("OUT OF LINE")) {
              translatedWarning = currEnv.outOfLine;
            } else if (w.includes("SUPERNOVA EM") || w.includes("SUPERNOVA IN")) {
              translatedWarning = `${currEnv.solarShockwave} - ${data.shockwaveTimer.toFixed(1)}s`;
            } else if (w.includes("REVERSÃO") || w.includes("REVERSAL") || w.includes("POLARIDADE REVERSA")) {
              translatedWarning = currEnv.invertedControls;
            } else if (w.includes("LASER")) {
              translatedWarning = currEnv.laserActive;
            } else if (w.includes("TEMPERATURA DOS MOTORES CRÍTICA")) {
              translatedWarning = `${currEnv.engineTemp} CRÍTICA!`;
            } else if (w.includes("FORA DA TRILHA DE POEIRA")) {
              translatedWarning = currEnv.outOfTrack;
            } else if (w.includes("ONDA SOLAR ABSORVIDA")) {
              translatedWarning = currEnv.shockwaveAbsorbed;
            } else if (w.includes("ONDA SOLAR DEVASTADORA")) {
              translatedWarning = currEnv.shockwaveDevastating;
            } else if (w.includes("SOMBREIE EM UM ASTEROIDE")) {
              translatedWarning = currEnv.shockwaveTimerWarning;
            } else if (w.includes("CAMPO DE ATRAÇÃO CRÍTICO")) {
              translatedWarning = currEnv.attractionCritical;
            } else if (w.includes("PROPULSORES MANOBRA CONGELADOS")) {
              translatedWarning = `${currEnv.thrustersFrozen} (${Math.round(data.ice)}%): ${currEnv.slowControl}`;
            } else if (w.includes("BARREIRA DE LASER EM CURSO")) {
              translatedWarning = currEnv.laserBarrier;
            } else if (w.includes("RESERVA DE O2 CRÍTICA")) {
              translatedWarning = `${currEnv.o2ReserveCritical}: ${Math.round(data.fuel)}%! ${currEnv.rechargeThroughRings}`;
            }
            dangerText.innerText = translatedWarning;
            dangerAlert.classList.remove("opacity-0", "scale-95", "translate-y-[-10px]");
            dangerAlert.classList.add("opacity-100", "scale-100", "translate-y-0");
          } else {
            dangerAlert.classList.add("opacity-0", "scale-95", "translate-y-[-10px]");
            dangerAlert.classList.remove("opacity-100", "scale-100", "translate-y-0");
          }
        }
        
        // 2. Estado ou Barra Específica do Trajeto
        if (envLabel && envValueText && envBarContainer && envBarFill) {
          getRouteBehavior(selectedRoute.id).updateHUDStatus(data, currEnv, envLabel, envValueText, envBarContainer, envBarFill);
        }
      }
      
      animFrame = requestAnimationFrame(update);
    };
    animFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrame);
  }, [neonRingsRef, shipRef, velocityRef, energyRef, customRouteDataRef, selectedRoute, language, currEnv]);

  return (
    <>
      <style>{`
        @keyframes radar-sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes blip-glow {
          0%, 100% { transform: translate(-50%, 50%) scale(0.85); opacity: 0.7; }
          50% { transform: translate(-50%, 50%) scale(1.15); opacity: 1; }
        }
        @keyframes radar-ping {
          0% { transform: translate(-50%, 50%) scale(0.8); opacity: 0.8; }
          100% { transform: translate(-50%, 50%) scale(2.4); opacity: 0; }
        }
      `}</style>

      {/* Alerta de Perigo de Alta Prioridade (Centralizado no Topo) */}
      <div 
        id="hud-danger-alert" 
        className="absolute top-24 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-950/80 border border-red-500/30 backdrop-blur-md rounded-lg flex flex-col items-center justify-center gap-1 shadow-[0_0_25px_rgba(239,68,68,0.25)] select-none pointer-events-none transition-all duration-300 opacity-0 scale-95 z-20"
      >
        <span className="text-red-400 text-[10px] font-bold font-mono tracking-widest animate-pulse flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
          {currEnv.criticalAnomaly}
        </span>
        <span id="hud-danger-text" className="text-white text-xs font-bold font-mono tracking-wider uppercase text-center">
          {currEnv.criticalWarning}
        </span>
      </div>

      {/* Holographic Center Crosshair Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <div className="relative flex flex-col items-center justify-center">
          {/* Círculo limiar do Joystick Virtual (96px diâmetro = 48px raio total de mira) */}
          <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center relative">
            <div className="absolute left-[-12px] w-3.5 h-[1px] bg-white/10" />
            <div className="absolute right-[-12px] w-3.5 h-[1px] bg-white/10" />
            <div className="absolute top-[-12px] h-3.5 w-[1px] bg-white/10" />
            <div className="absolute bottom-[-12px] h-3.5 w-[1px] bg-white/10" />
            
            {/* Retículo Vetorizador Dinâmico (segue pointerRef em tempo real com lag-free 60fps) */}
            <div 
              ref={flightVectorRef}
              id="flight-vector" 
              className="absolute w-4 h-4 rounded-full border flex items-center justify-center shadow-lg transition-transform duration-75 ease-out"
              style={{ 
                borderColor: selectedColor.colorHex, 
                backgroundColor: `${selectedColor.colorHex}22`,
                boxShadow: `0 0 10px ${selectedColor.colorHex}55`,
                transform: 'translate3d(0px, 0px, 0)'
              }}
            >
              <div 
                className="w-1 h-1 rounded-full" 
                style={{ backgroundColor: selectedColor.colorHex }}
              />
            </div>
            
            {/* Ponto de zona morta central */}
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          
          {/* Instrução contextual de auxílio visual caso o pointer lock não esteja ativo */}
          {!document.pointerLockElement && (
            <span className="text-[8px] font-bold font-mono tracking-widest text-zinc-500 uppercase mt-3 animate-pulse">
              {t.mouseControlActive}
            </span>
          )}
        </div>
      </div>

      {/* Container Integrado de Radar e Telemetria no Lado Esquerdo */}
      <div className="absolute bottom-6 left-6 z-10 pointer-events-auto select-none flex flex-col items-center gap-3">
        {/* Radar Circular Tático via Canvas */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-[140px] h-[140px] relative border border-white/15 bg-black/75 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center">
            <canvas 
              ref={radarCanvasRef} 
              width={140} 
              height={140} 
              className="rounded-full"
            />
          </div>

          {/* Badge Informativo do Radar */}
          <div 
            ref={radarBadgeRef}
            className="px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded border border-white/5 text-[8px] font-bold font-mono tracking-widest uppercase shadow-md flex items-center gap-1.5"
          >
            <span>{currEnv.nextRing}</span>
            <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
            <span ref={radarDistanceTextRef}>--- m</span>
          </div>
        </div>

        {/* Painel de Telemetria */}
        <div className="flex flex-col gap-1.5 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/5 w-[200px] font-mono shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[8px] tracking-wider text-zinc-400">
            <span className="font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              {t.telemetry}
            </span>
            <span className="text-[7px] text-zinc-600">SYS_OK</span>
          </div>
          
          {/* Speed & Energy */}
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-zinc-500 uppercase tracking-widest text-[8px]">{t.speedLabel}</span>
            <span className="font-bold text-orange-400 flex items-center gap-0.5">
              <span ref={velTextRef}>0</span> <span className="text-[7px] text-zinc-500">km/s</span>
            </span>
          </div>

          {/* Energy Bar */}
          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="flex justify-between items-center text-[8px] font-bold">
              <span ref={energyLabelRef} className="text-emerald-400 uppercase tracking-widest">{t.energy}</span>
              <span ref={energyTextRef} className="text-emerald-300">100%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
              <div 
                ref={energyBarRef}
                className="h-full bg-emerald-400 transition-all duration-150" 
                style={{ width: `100%` }} 
              />
            </div>
          </div>

          {/* Active Ring Info Panel */}
          <div className="flex flex-col gap-1 mt-1 pt-1.5 border-t border-white/5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-widest text-[8px]">{currEnv.skillMultiplier}</span>
              <span ref={multiplierTextRef} className="font-bold font-mono tracking-wider text-zinc-500">x1</span>
            </div>
            <div className="h-1 w-full bg-zinc-800/50 rounded-full overflow-hidden mt-0.5">
              <div 
                ref={multiplierBarRef}
                className="h-full bg-cyan-500 transition-all duration-300" 
                style={{ width: `10%` }} 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-1 pt-1.5 border-t border-white/5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-widest text-[8px]">{currEnv.activeRing}</span>
              <span ref={activeRingTextRef} className="font-bold font-mono tracking-wider">1 / {selectedRoute.numRings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-widest text-[8px]">{currEnv.totalTime}</span>
              <span ref={activeRingDistRef} className="font-bold font-mono text-cyan-400">0.00s</span>
            </div>
          </div>

          {/* MÓDULO AMBIENTAL DINÂMICO */}
          <div id="env-module" className="flex flex-col gap-1 mt-1 pt-1.5 border-t border-white/10 text-[10px]">
            <div className="flex justify-between items-center">
              <span id="env-label" className="text-zinc-500 uppercase tracking-widest text-[8px]">{currEnv.sector}</span>
              <span id="env-value-text" className="font-bold text-zinc-300">{currEnv.stable}</span>
            </div>
            <div id="env-bar-container" className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5 hidden">
              <div 
                id="env-bar-fill"
                className="h-full bg-purple-500 transition-all duration-75" 
                style={{ width: `0%` }} 
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


function GameEngine({ shipRef, velocityRef, baseQuat, isHangarActive, setIsHangarActive, takeoffProgressRef, pointerRef, keysRef, scoreRef, multiplierRef, planets, asteroids, satellites, abilityActive, setAbilityActive, energyRef, currentShip, createExplosion, localMuted, shieldRef, armorRef, setIsGameOver, setIsVictory, trafficShips, shakeRef, explosionsRef, selectedColor, countdown, stats, neonRingsRef, selectedRoute, customRouteDataRef, asteroidsChangedRef, flightVectorRef }: any) {
  const cameraOffset = useRef(new THREE.Vector3(0, 2.5, 15));
  const collisionCooldownRef = useRef(0);
  

  // Performance-optimized reusable scratchpads for 60fps simulation (prevents GC stutters)
  const v_targetOff = useRef(new THREE.Vector3());
  const v_sp = useRef(new THREE.Vector3());
  const v_tcp = useRef(new THREE.Vector3());
  const v_hangarCamOffset = useRef(new THREE.Vector3());
  const v_spaceCamOffset = useRef(new THREE.Vector3());
  const v_rco = useRef(new THREE.Vector3());
  const v_targetCamPos = useRef(new THREE.Vector3());
  const v_hangarUp = useRef(new THREE.Vector3());
  const v_spaceUp = useRef(new THREE.Vector3());
  const v_hangarLookAt = useRef(new THREE.Vector3());
  const v_spaceLookAt = useRef(new THREE.Vector3());
  const q_deltaQuat = useRef(new THREE.Quaternion());
  const e_deltaEuler = useRef(new THREE.Euler());
  const v_forward = useRef(new THREE.Vector3());
  const m_tempMat = useRef(new THREE.Matrix4());
  const q_leveledQuat = useRef(new THREE.Quaternion());
  const q_rollQuat = useRef(new THREE.Quaternion());
  const v_axisZ = useRef(new THREE.Vector3(0, 0, 1));
  const v_pull = useRef(new THREE.Vector3());
  const v_fd = useRef(new THREE.Vector3());
  const v_np = useRef(new THREE.Vector3());
  const v_pushDir = useRef(new THREE.Vector3());
  const q_tempQuat = useRef(new THREE.Quaternion());
  const v_temp1 = useRef(new THREE.Vector3());
  const v_temp2 = useRef(new THREE.Vector3());
  const v_temp3 = useRef(new THREE.Vector3());
  const movementDirRef = useRef(new THREE.Vector3(0, 0, -1));
  
  useFrame((state, delta) => {
    
    const ship = shipRef.current; if (!ship) return; const dt = Math.min(delta, 0.1);
    
    // Atualizar som do motor e turbo (Web Audio API)
    audioService.updateEngine(velocityRef.current, keysRef.current[' '] || keysRef.current.ArrowUp, localMuted);

    // Amortecimento dinâmico: os controles retornam suavemente ao centro quando não há input ativo
    // Sempre aplicamos damping para evitar que a nave fique girando eternamente se o pointer lock cair
    const damping = Math.exp(-dt * 2.8); 
    pointerRef.current.x *= damping;
    pointerRef.current.y *= damping;

    // WASD steering support (same function as mouse)
    const kbRate = 3.5 * dt;
    if (keysRef.current.w) pointerRef.current.y = Math.min(1.5, pointerRef.current.y + kbRate);
    if (keysRef.current.s) pointerRef.current.y = Math.max(-1.5, pointerRef.current.y - kbRate);
    if (keysRef.current.a) pointerRef.current.x = Math.max(-1.5, pointerRef.current.x - kbRate);
    if (keysRef.current.d) pointerRef.current.x = Math.min(1.5, pointerRef.current.x + kbRate);
    
    // Zona morta mínima para evitar micro-oscilações
    if (Math.abs(pointerRef.current.x) < 0.001) pointerRef.current.x = 0;
    if (Math.abs(pointerRef.current.y) < 0.001) pointerRef.current.y = 0;

    // Atualizar a posição do retículo dinâmico no HUD (60 FPS)
    const vectorEl = flightVectorRef.current;
    if (vectorEl) {
      // Mapear pointerRef.current de [-1.5, 1.5] para pixels de translação (limite de 44px correspondente ao círculo HUD)
      const xPx = (pointerRef.current.x / 1.5) * 44; 
      const yPx = -(pointerRef.current.y / 1.5) * 44; // Negativo pois Y no canvas é para cima, mas no CSS é para baixo
      vectorEl.style.transform = `translate3d(${xPx}px, ${yPx}px, 0)`;
    }
    
    if (collisionCooldownRef.current > 0) collisionCooldownRef.current -= dt;
    
    // Penalize multiplier on damage or out-of-line
    const resetMultiplier = () => {
      if (multiplierRef.current > 1) {
        multiplierRef.current = 1;
        shakeRef.current = Math.max(shakeRef.current, 0.8);
      }
    };
    
    // Handle Energy & Turbo Drain/Recharge
    let isCurrentlyBoosting = abilityActive;
    
    // Physical attributes of the ship parsed from stats
    const maxVelocityStat = stats?.maxVelocity || 80;
    const accelerationStat = stats?.acceleration || 50;
    const massStat = stats?.mass || 50;

    if (!isHangarActive) {
      const turboStat = stats?.turbo ?? 50;
      const energyStat = stats?.energy ?? 50;
      
      // Massa adiciona estabilidade e reduz a taxa de consumo de energia de turbo (dura mais tempo)
      // Se massStat=10 (leve), o multiplicador de duração é 0.85x. Se massStat=120 (pesada), o multiplicador é 1.6x!
      const massEnergyBonus = 0.8 + (massStat / 120.0) * 0.8;
      const drainTimeSeconds = (1.0 + (energyStat / 100.0) * 8.0) * massEnergyBonus;
      
      // Recarga mais rápida de energia de turbo para naves de alta massa devido aos seus gigantescos geradores de fusão!
      // Se massStat=10, sem bônus (1.0x). Se massStat=120, recarrega até 1.5x mais rápido!
      const massRechargeBonus = 1.0 + (massStat / 120.0) * 0.5;
      const rechargeTimeSeconds = (12.0 - (energyStat / 100.0) * 7.5) / massRechargeBonus;
      
      const drainPerSecond = 100.0 / drainTimeSeconds;
      const rechargePerSecond = 100.0 / rechargeTimeSeconds;
      
      const isAttemptingBoost = keysRef.current[' '] || keysRef.current.ArrowUp || keysRef.current.Shift || keysRef.current.e;
      
      // Para iniciar o turbo, é necessário pelo menos 20% de energia para prevenir oscilação rápida em 0%
      const canStartBoost = !abilityActive && energyRef.current >= 20;
      const canContinueBoost = abilityActive && energyRef.current > 0;
      
      if (isAttemptingBoost && (canStartBoost || canContinueBoost)) {
        if (!abilityActive) {
          setAbilityActive(true);
          playSimSound("ability", localMuted);
          if (currentShip.id === "sparrow-01") {
            playSimSound("warp", localMuted);
          }
        }
        energyRef.current = Math.max(0, energyRef.current - drainPerSecond * dt);
        isCurrentlyBoosting = true;
      } else {
        if (abilityActive) {
          setAbilityActive(false);
        }
        energyRef.current = Math.min(100, energyRef.current + rechargePerSecond * dt);
        isCurrentlyBoosting = false;
      }
    }
    
    // 1. Maneuverability multiplier based on Mass (heavy ships are slower to steer, but still responsive enough to play)
    const maneuverability = 0.75 + ((120 - massStat) / 120) * 0.75;
    
    // Apply Ice Field dynamic reduction to effective maneuverability
    let effectiveManeuverability = maneuverability;
    if (customRouteDataRef && customRouteDataRef.current && selectedRoute.id === "route-ice-field") {
      const data = customRouteDataRef.current;
      if (data.ice !== undefined) {
        // At 100% ice, steering control is cut down to 30% of its normal sensitivity!
        effectiveManeuverability = maneuverability * (1.0 - (data.ice / 100.0) * 0.7);
      }
    }
    
    // 2. Max speeds (base top speed and turbo boosted top speed)
    const baseMaxSpeed = 150 + (maxVelocityStat / 100) * 280; // ranges de 150 a 430
    
    // Turbo determines boost power (how much velocity multiplies)
    // MULTIPLICADOR DE VELOCIDADE DO TURBO ADICIONA BÔNUS DE MASSA!
    // Se massStat=10 (leve), o bônus de turbo é +0.05. Se massStat=120 (pesada), o bônus é +0.6x no multiplicador!
    // Isso torna as retas extremamente vantajosas para naves pesadas compensarem a inércia em curvas.
    const turboStat = stats?.turbo ?? 50;
    const massTurboBonus = (massStat / 120.0) * 0.6;
    const boostSpeedMultiplier = 1.6 + (turboStat / 100) * 1.4 + massTurboBonus;
    const currentMaxSpeed = isCurrentlyBoosting ? baseMaxSpeed * boostSpeedMultiplier : baseMaxSpeed;
    
    // 3. Acceleration Rate (Acceleration determines how fast ship reaches max speed)
    // Naves leves possuem aceleração base incrível. Aplicamos um pequeno ajuste inercial de massa na aceleração base
    const massAccelBaseFactor = 1.1 - (massStat / 120.0) * 0.3; // 1.1x para leves, 0.8x para pesadas
    const baseAccelRate = (80 + (accelerationStat / 100) * 520) * massAccelBaseFactor;
    
    // Quando ativa o turbo, naves pesadas disparam os super propulsores inerciais!
    // Multiplicador de aceleração de turbo muito maior para naves de alta massa!
    // Se massStat=10, bônus de aceleração de turbo = 0. Se massStat=120, bônus é +1.2 no multiplicador de aceleração!
    const massTurboAccelBonus = (massStat / 120.0) * 1.2;
    const boostAccelMultiplier = 1.3 + (turboStat / 100) * 1.7 + massTurboAccelBonus;
    const currentAccelRate = isCurrentlyBoosting ? baseAccelRate * boostAccelMultiplier : baseAccelRate;

    if (isHangarActive) {
      if (takeoffProgressRef.current === 0) {
        ship.position.set(0, 0, 100);
        velocityRef.current = 0;
        baseQuat.current.identity();
        ship.quaternion.identity();
        movementDirRef.current.set(0, 0, -1);
        takeoffProgressRef.current = 1;
      }

      // Camera stays locked in tight first-person view inside the cockpit
      const targetOff = v_targetOff.current.set(0, 0, -1);
      cameraOffset.current.copy(targetOff);
      const sp = v_sp.current.copy(ship.position);
      const tcp = v_tcp.current.copy(sp).add(cameraOffset.current);
      state.camera.position.copy(tcp);
      state.camera.lookAt(sp.x, sp.y, sp.z - 100);
      return;
    }
    
    // Space mode: handle transition factor for smoother control takeover (pull-back effect)
    const isFirstFrame = takeoffProgressRef.current === 0;
    
    takeoffProgressRef.current = THREE.MathUtils.lerp(takeoffProgressRef.current, 1, dt * 1.5);
    const transitionFactor = takeoffProgressRef.current;
    
    // Fade in steering sensitivity after exit
    let ptr = pointerRef.current.y * 1.5 * transitionFactor; 
    let ytr = -pointerRef.current.x * 1.5 * transitionFactor; 
    let rtr = 0;
    if (keysRef.current.a) rtr -= 2.2 * transitionFactor; 
    if (keysRef.current.d) rtr += 2.2 * transitionFactor; 
    
    // Apply EMP reverse polarity control glitch effect on inputs
    if (customRouteDataRef && customRouteDataRef.current && customRouteDataRef.current.controlGlitched) {
      ptr = -ptr;
      ytr = -ytr;
    }
    
    // Apply pitch, yaw and roll as local rotations to baseQuat to allow infinite 6-DOF movement
    const deltaQuat = q_deltaQuat.current.setFromEuler(e_deltaEuler.current.set(ptr * dt * effectiveManeuverability, ytr * dt * effectiveManeuverability, rtr * dt * effectiveManeuverability, 'YXZ'));
    baseQuat.current.multiply(deltaQuat);
    
    // Smoothly restore the spaceship's roll alignment to horizontal axis (auto-leveling) when A/D keys are released
    if (!keysRef.current.a && !keysRef.current.d) {
      const forward = v_forward.current.set(0, 0, -1).applyQuaternion(baseQuat.current);
      if (Math.abs(forward.y) < 0.99) {
        const tempMat = m_tempMat.current.lookAt(v_temp1.current.set(0, 0, 0), forward, v_temp2.current.set(0, 1, 0));
        const leveledQuat = q_leveledQuat.current.setFromRotationMatrix(tempMat);
        baseQuat.current.slerp(leveledQuat, dt * 2.5); // Retorno suave ao horizonte
      }
    }
    
    const tPitch = pointerRef.current.y * 0.75 * effectiveManeuverability * transitionFactor;
    const tYaw = -pointerRef.current.x * 0.4 * effectiveManeuverability * transitionFactor;
    const tRoll = -pointerRef.current.x * 0.85 * effectiveManeuverability * transitionFactor;
    
    // Create a combined visual rotation quaternion (Pitch, Yaw, Roll)
    const visualQuat = q_rollQuat.current.setFromEuler(e_deltaEuler.current.set(tPitch, tYaw, tRoll, 'YXZ'));
    
    ship.quaternion.slerp(q_tempQuat.current.copy(baseQuat.current).multiply(visualQuat), dt * 7.0 * effectiveManeuverability);
    let tv = velocityRef.current;
    if (isCurrentlyBoosting) {
      if (tv > currentMaxSpeed) {
        // Smoothly decay down to max speed instead of clamping instantly
        tv = THREE.MathUtils.lerp(tv, currentMaxSpeed, dt * 1.5);
      } else {
        tv = Math.min(currentMaxSpeed, velocityRef.current + dt * currentAccelRate);
      }
    } else if (keysRef.current.s || keysRef.current.ArrowDown) {
      // Small level of forward movement even when braking
      tv = Math.max(50, velocityRef.current - dt * currentAccelRate);
    } else {
      // Automatic acceleration / cruising speed
      if (tv > baseMaxSpeed) {
        // Smoothly decay down to normal cruising speed instead of snapping
        tv = THREE.MathUtils.lerp(tv, baseMaxSpeed, dt * 1.0);
      } else {
        tv = Math.min(baseMaxSpeed, velocityRef.current + dt * currentAccelRate * 0.5);
      }
    }
    velocityRef.current = tv;
    if (scoreRef && !isHangarActive) { 
      scoreRef.current += Math.round(dt * (Math.max(0, tv) / 100) * (multiplierRef ? multiplierRef.current : 1)); 
    }
    
    // Update moving asteroids
    if (selectedRoute.hasMovingAsteroids) {
      asteroids.forEach((a: any) => {
        if (a.velocity) {
          a.pos.addScaledVector(a.velocity, dt);
        }
      });
    }



    // UPDATE ROUTE-SPECIFIC MECHANICS IN FRAME LOOP (60 FPS)
    if (!isHangarActive && customRouteDataRef && customRouteDataRef.current) {
      const data = customRouteDataRef.current;
      const currentPos = ship.position;
      
      // Reset frames of flags
      data.warningActive = false;
      data.warningText = "";
      data.draftActive = false;
      data.controlGlitched = false;

      getRouteBehavior(selectedRoute.id).updateTick(
        dt,
        data,
        currentPos,
        velocityRef,
        currentMaxSpeed,
        energyRef,
        asteroids,
        trafficShips,
        neonRingsRef,
        state.clock.elapsedTime,
        isCurrentlyBoosting,
        resetMultiplier,
        shakeRef,
        createExplosion,
        playSimSound,
        localMuted,
        ship as any
      );
    }

    // Apply gravity well effect if active
    if (selectedRoute.gravityWell && !isHangarActive) {
      // Pull towards 0,0 in the current Z plane (simplistic center-of-screen pull)
      const pullStrength = 0.25;
      const pull = v_pull.current.set(-ship.position.x, -ship.position.y, 0).multiplyScalar(dt * pullStrength);
      ship.position.add(pull);
    }

    const fd = v_fd.current.set(0, 0, -1).applyQuaternion(ship.quaternion); 
    
    // Calculate actual movement direction incorporating drift (inertia based on mass)
    // Leve (massa=10) se alinha extremamente rápido (~17 * dt) para máximo controle e agilidade
    // Pesado (massa=120) se alinha a (~6.5 * dt), dando uma sensação incrível e sutil de derrapagem inercial sem perder o controle dos aros e curvas fechadas
    const alignmentRate = 18.0 - (massStat / 120) * 11.5;
    if (!isHangarActive) {
      movementDirRef.current.lerp(fd, dt * alignmentRate).normalize();
    } else {
      movementDirRef.current.copy(fd);
    }

    const np = v_np.current.copy(ship.position).addScaledVector(movementDirRef.current, tv * dt);
    let cm = true; 
    const canTakeDamage = collisionCooldownRef.current <= 0;
    
    // Collision with Planets
    for (let p of planets) { 
      const distSq = np.distanceToSquared(p.pos);
      const minCDist = p.radius + 15;
      if (distSq < minCDist * minCDist) { 
        cm = false; 
        
        // Planet collision: heavy ships bounce back less and have lower shake/damage multiplier due to stable hull
        velocityRef.current = -50 - (120 - massStat) * 0.4; // -50 para 120, -94 para 10 de massa.
        shakeRef.current = Math.max(0.6, 2.5 - (massStat / 120) * 1.5);
        
        // Push back
        const pushDir = v_pushDir.current.subVectors(ship.position, p.pos).normalize();
        ship.position.addScaledVector(pushDir, 50 * dt);
        
        if (canTakeDamage) {
          playSimSound("hull_hit", localMuted);
          resetMultiplier();
          collisionCooldownRef.current = 0.5;
        }
        break; 
      } 
    }
    
    // Collision with Satellites
    if (cm) {
      for (let s of satellites) {
        const sDist = s.scale * 1.5 + 4;
        if (np.distanceToSquared(s.pos) < sDist * sDist) {
          cm = false;
          
          const bounceFactorSat = Math.max(-0.05, -0.5 + (massStat / 120) * 0.45);
          velocityRef.current = Math.max(-15, velocityRef.current * bounceFactorSat);
          shakeRef.current = Math.max(0.3, 1.5 - (massStat / 120) * 1.1);
          createExplosion(s.pos, "#ffffff");
          
          const pushDir = v_pushDir.current.subVectors(ship.position, s.pos).normalize();
          ship.position.addScaledVector(pushDir, 30 * dt);

          if (canTakeDamage) {
            resetMultiplier();
            playSimSound("hull_hit", localMuted);
            collisionCooldownRef.current = 0.4;
          }
          break;
        }
      }
    }



    if (cm) ship.position.copy(np);
    
    // Optimized asteroid checking and wrapping loop
    const tempScatter = v_temp3.current;
    const shipZ = ship.position.z;
    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i];
      if (!a) continue;
      
      const zDiff = a.pos.z - shipZ;
      const absZDiff = Math.abs(zDiff);
      
      if (absZDiff < 2500) {
        const aDist = 3.6 + a.scale * 0.9; // Slightly larger hitbox for asteroids
        const distSq = ship.position.distanceToSquared(a.pos);
        if (distSq < aDist * aDist) {
          // Slow down ship on collision and apply slight bounce (mitigated by mass momentum)
          const bounceFactor = Math.max(-0.05, -0.4 + (massStat / 120) * 0.35);
          velocityRef.current = Math.max(-10, velocityRef.current * bounceFactor);
          
          const pushDir = v_pushDir.current.subVectors(ship.position, a.pos).normalize();
          ship.position.addScaledVector(pushDir, (a.scale + 10) * dt);

          if (canTakeDamage) {
            if (isCurrentlyBoosting && ["sparrow-03", "sparrow-06", "sparrow-17", "sparrow-20"].includes(currentShip.id)) { 
              createExplosion(a.pos, "#00ffea"); 
              playSimSound("shield_hit", localMuted); 
              collisionCooldownRef.current = 0.1;
            } else {
              shakeRef.current = Math.max(0.3, 1.5 - (massStat / 120) * 1.1); 
              createExplosion(ship.position, "#ff3a00");
              playSimSound("hull_hit", localMuted); 
              collisionCooldownRef.current = 0.3;
            }
          }
        }
      } else if (zDiff > 25000) {
        // Wrap asteroids that are left far behind
        tempScatter.set((Math.random() - 0.5) * 40000, (Math.random() - 0.5) * 15000, (Math.random() - 0.5) * 40000);
        a.pos.copy(ship.position).addScaledVector(fd, 30000 + Math.random() * 20000).add(tempScatter);
        if (asteroidsChangedRef) {
          asteroidsChangedRef.current = true;
        }
      }
    }

    if (neonRingsRef && neonRingsRef.current) {
      neonRingsRef.current.forEach((ring: any, index: number) => {
        if (!ring.passed) {
          // Verificar se todos os aros anteriores a este já foram passados
          let allPreviousPassed = true;
          for (let prevIdx = 0; prevIdx < index; prevIdx++) {
            if (!neonRingsRef.current[prevIdx].passed) {
              allPreviousPassed = false;
              break;
            }
          }

          if (allPreviousPassed) {
            const distSq = ship.position.distanceToSquared(ring.pos);
            if (distSq < ring.radius * ring.radius) {
              ring.passed = true;
              playSimSound("ability", localMuted);
              multiplierRef.current = Math.min(10, (multiplierRef.current || 1) + 1);
              scoreRef.current += 5000 * multiplierRef.current;
              energyRef.current = Math.min(100, energyRef.current + 20); // Bonus energy!
              
              // Replenish void route O2 Fuel
              if (selectedRoute.id === "route-void" && customRouteDataRef && customRouteDataRef.current) {
                customRouteDataRef.current.fuel = Math.min(100, customRouteDataRef.current.fuel + 45);
              }

              // Se for o último aro, ativa a vitória!
              if (index === neonRingsRef.current.length - 1) {
                setTimeout(() => {
                  setIsVictory(true);
                  playSimSound("warp", localMuted);
                }, 500);
              }
            }
          }
        }
      });
    }

    // LATEUPDATE CAMERA TRACKING: Position and orient the camera AFTER all ship translation, steering and physics have settled
    // This removes 100% of the 1-frame lag jitter and stabilization wobble!
    const hangarCamOffset = v_hangarCamOffset.current.set(0, 1.2, 3.5);
    
    // Dynamic camera distance based on speed - smoothly pulls back when boosting instead of lagging
    const currentSpeed = velocityRef.current;
    const speedFactor = Math.max(0, Math.min(1.0, currentSpeed / currentMaxSpeed));
    const isBoost = keysRef.current[' '] || keysRef.current.ArrowUp || keysRef.current.Shift || keysRef.current.e || abilityActive;
    
    // Câmera posicionada ainda mais distante para enfatizar a escala e velocidade
    const targetSpaceZ = isBoost ? 60.0 : 40.0 + (speedFactor * 10.0);
    
    // Sensação de mergulho e guinada: a câmera balança na direção oposta ao movimento para dar profundidade
    const diveSwing = pointerRef.current.y * 14.0 * transitionFactor; 
    const yawSwing = -pointerRef.current.x * 16.0 * transitionFactor;  
    
    const spaceCamOffset = v_spaceCamOffset.current.set(yawSwing, 10.0 - diveSwing, targetSpaceZ);
    
    // Lerp the offset smoothly
    cameraOffset.current.lerpVectors(hangarCamOffset, spaceCamOffset, transitionFactor);
    const rco = v_rco.current.copy(cameraOffset.current).applyQuaternion(baseQuat.current); 
    
    const targetCamPos = v_targetCamPos.current.copy(ship.position).add(rco);
    
    // Rigidly attach camera to prevent any "back and forth" lagging
    state.camera.position.copy(targetCamPos);
    
    // Smoothly transition UP vector
    const hangarUp = v_hangarUp.current.set(0, 1, 0);
    const spaceUp = v_spaceUp.current.set(0, 1, 0).applyQuaternion(baseQuat.current);
    state.camera.up.copy(hangarUp.lerp(spaceUp, transitionFactor));
 
    // Smoothly transition lookAt target
    const lookAtHangarVec = v_temp1.current.set(0, 0.1, -10).applyQuaternion(baseQuat.current);
    const hangarLookAt = v_hangarLookAt.current.copy(ship.position).add(lookAtHangarVec);
    
    const lookAtSpaceVec = v_temp2.current.set(0, 0, -12).applyQuaternion(baseQuat.current);
    const spaceLookAt = v_spaceLookAt.current.copy(ship.position).add(lookAtSpaceVec);
    
    state.camera.lookAt(hangarLookAt.lerp(spaceLookAt, transitionFactor));

    if (shakeRef.current > 0.01) { state.camera.position.x += (Math.random() - 0.5) * shakeRef.current; state.camera.position.y += (Math.random() - 0.5) * shakeRef.current; shakeRef.current = THREE.MathUtils.lerp(shakeRef.current, 0, dt * 6); }
    for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
      const e = explosionsRef.current[i];
      e.life -= dt * 1.8;
      if (e.life <= 0) {
        explosionsRef.current.splice(i, 1);
        continue;
      }
      for (let j = 0; j < e.particles.length; j++) {
        const p = e.particles[j];
        // Optimized: Use scratchpad vector to update position without cloning
        v_temp1.current.copy(p.vel).multiplyScalar(dt);
        p.pos.add(v_temp1.current);
      }
    }
  });
  return null;
}
export default SpaceSimulator;
