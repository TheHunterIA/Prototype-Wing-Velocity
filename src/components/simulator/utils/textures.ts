import { useState, useEffect } from "react";
import * as THREE from "three";

export const textureCache = new Map<string, THREE.CanvasTexture>();
export const normalMapCache = new Map<string, THREE.CanvasTexture>();

export function useSafeTexture(url: string) {
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

export function generateNoiseTexture(width: number, height: number, type: string, baseColor: string) {
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
      
      drawBlob(cx, cy, r, "#1a1614", 0.7); // Sombra interna (fundo da cratera)
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath(); ctx.arc(cx + r * 0.1, cy + r * 0.1, r, 0, Math.PI * 2); ctx.stroke(); // borda iluminada
    }
    // Fissuras tectônicas / vales profundos
    ctx.filter = "none";
    for (let i = 0; i < fissureLoops; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.strokeStyle = "#14100e";
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.stroke();
    }
  } else if (type === "jupiter" || type === "saturn" || type === "venus" || type === "mercury") {
    // Bandas ou turbulências
    const bands = isSmall ? 15 : 35;
    for (let i = 0; i < bands; i++) {
      const y = Math.random() * height;
      const hSize = (isSmall ? 3 : 8) + Math.random() * (isSmall ? 10 : 35);
      const grad = ctx.createLinearGradient(0, y, 0, y + hSize);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, Math.random() > 0.4 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, width, hSize);
    }
    // Mancha de tempestades gigantes (como a Grande Mancha Vermelha de Júpiter)
    if (type === "jupiter") {
      drawBlob(width * 0.65, height * 0.7, isSmall ? 14 : 36, "#992a15", 0.35); // Mancha principal
      drawBlob(width * 0.65, height * 0.7, isSmall ? 6 : 14, "#dd6a45", 0.2);   // Núcleo
    }
  } else if (type === "earth") {
    // Oceanos e continentes procedurais (ruído por blocos de manchas de grama/deserto)
    const continents = isSmall ? 10 : 30;
    for (let i = 0; i < continents; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height;
      const r = (isSmall ? 14 : 45) + Math.random() * (isSmall ? 25 : 85);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, Math.random() > 0.3 ? "#1e5e2f" : "#ebd07f"); // floresta vs deserto
      grad.addColorStop(0.7, "#144c23");
      grad.addColorStop(1.0, "rgba(10,59,140,0)"); // fade suave para o oceano azul de base
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === "mars") {
    // Desertos e calotas polares de dióxido de carbono
    const craters = isSmall ? 15 : 40;
    for (let i = 0; i < craters; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height;
      const r = (isSmall ? 5 : 12) + Math.random() * (isSmall ? 15 : 45);
      // Depressões marcianas escuras
      drawBlob(cx, cy, r, "#5e1d0b", 0.28);
    }
    // Calotas polares ultra-brilhantes nos extremos norte e sul
    drawBlob(width * 0.5, 0, isSmall ? 12 : 32, "#ffffff", 0.88);      // Polo Norte
    drawBlob(width * 0.5, height, isSmall ? 12 : 32, "#ffffff", 0.88); // Polo Sul
  } else if (type === "sun") {
    // Fotosfera em chamas (manchas solares ativas e filamentos magmáticos)
    ctx.fillStyle = "#ff6a00";
    ctx.fillRect(0, 0, width, height);
    const loops = isSmall ? 120 : 450;
    for (let i = 0; i < loops; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height;
      const r = (isSmall ? 4 : 12) + Math.random() * (isSmall ? 10 : 32);
      drawBlob(cx, cy, r, "#ffd800", 0.08 + Math.random() * 0.12); // Zonas superaquecidas
      if (Math.random() > 0.94) {
        drawBlob(cx, cy, r * 0.4, "#2e0500", 0.45); // Manchas solares frias magnéticas
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, texture);
  return texture;
}

export function generateNormalMapFromAlbedo(albedo: THREE.CanvasTexture, cacheKey: string, strength = 1.4) {
  if (normalMapCache.has(cacheKey)) return normalMapCache.get(cacheKey)!;

  const src = albedo.image as HTMLCanvasElement;
  if (!src || !src.getContext) return null;
  const width = src.width, height = src.height;
  const srcCtx = src.getContext("2d");
  if (!srcCtx) return null;
  const srcData = srcCtx.getImageData(0, 0, width, height).data;

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
    const wx = (x + width) % width;
    const wy = Math.min(height - 1, Math.max(0, y));
    return heights[wy * width + wx];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
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
