import { useState, useEffect } from "react";
import * as THREE from "three";

export function useSafeTexture(url: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        if (!active) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        setTexture(tex);
      },
      undefined,
      (err) => {
        console.warn("Could not load texture safely: " + url + ", using procedural fallback.", err);
      }
    );
    return () => { active = false; };
  }, [url]);
  return texture;
}

export const textureCache = new Map<string, THREE.CanvasTexture>();

export function clearTextureCache() {
  textureCache.forEach((tex) => {
    try {
      tex.dispose();
    } catch (err) {
      console.warn("Error disposing cached texture:", err);
    }
  });
  textureCache.clear();
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

  let blurAmount = "2px";
  if (type === "jupiter" || type === "saturn") {
    blurAmount = "3.5px";
  } else if (type === "venus") {
    blurAmount = "4.5px";
  } else if (type === "earth") {
    blurAmount = "1.8px";
  } else if (type === "mars") {
    blurAmount = "2.2px";
  } else if (type === "asteroid" || type === "mercury") {
    blurAmount = "1.5px";
  } else if (type === "sun") {
    blurAmount = "0px";
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

    for (let i = 0; i < starLoops; i++) {
      const x = Math.random() * width; const y = Math.random() * height;
      ctx.globalAlpha = 0.05 + Math.random() * 0.15;
      ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#130e0a";
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    for (let i = 0; i < craterLoops; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height;
      const r = 2 + Math.pow(Math.random(), 3) * (isSmall ? 12 : 35);
      
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = "#ebd9c8";
      ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - width, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + width, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();
      
      drawBlob(cx, cy, r, "#120e0a", 0.75);
      
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = "#9c8e7f";
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath(); ctx.arc(cx + r * 0.15, cy + r * 0.15, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - width + r * 0.15, cy + r * 0.15, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + width + r * 0.15, cy + r * 0.15, r, 0, Math.PI * 2); ctx.stroke();
    }
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
    const areaFactor = Math.max(1, (width * height) / (512 * 256));
    const blobLoops = Math.round((isSmall ? 40 : 120) * areaFactor);
    const flareLoops = Math.round((isSmall ? 20 : 60) * areaFactor);
    const sunspots = Math.round((isSmall ? 3 : 9) * areaFactor);
    const granulation = Math.round((isSmall ? 300 : 1400) * areaFactor);

    for (let i = 0; i < blobLoops; i++) {
      const deep = Math.random() > 0.5;
      drawBlob(Math.random() * width, Math.random() * height, 12 + Math.random() * 34, deep ? "#c22c00" : "#ff6a00", 0.32);
    }
    for (let i = 0; i < blobLoops * 0.6; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = 6 + Math.random() * 14;
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "#ffd873";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }
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
    for (let i = 0; i < sunspots; i++) {
      const groupCx = Math.random() * width; const groupCy = Math.random() * height;
      const groupSize = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < groupSize; j++) {
        const cx = groupCx + (Math.random() - 0.5) * 24; const cy = groupCy + (Math.random() - 0.5) * 14;
        const r = 2.5 + Math.random() * 6;
        drawBlob(cx, cy, r * 2.6, "#8a1c00", 0.7);
        drawBlob(cx, cy, r, "#170300", 0.95);
      }
    }
    for (let i = 0; i < granulation; i++) {
      ctx.globalAlpha = Math.random() * 0.16;
      ctx.fillStyle = "#fff4d6";
      ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }
  } else if (type === "earth") {
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
      const cx = Math.random() * width;
      const cy = height * 0.14 + Math.random() * height * 0.72;
      const spine = isSmall ? 26 + Math.random() * 34 : 90 + Math.random() * 130;
      const aspect = 0.4 + Math.random() * 0.35;
      const rot = Math.random() * Math.PI;
      const segments = 3 + Math.floor(Math.random() * 3);

      const dx = Math.cos(rot); const dy = Math.sin(rot);
      for (let s = 0; s < segments; s++) {
        const t = (s / (segments - 1 || 1)) - 0.5;
        const sx = cx + dx * spine * t * 1.3;
        const sy = cy + dy * spine * t * 1.3 * 0.6;
        const segR = spine * (0.55 + Math.random() * 0.35) * (1 - Math.abs(t) * 0.3);
        drawEllipse(sx, sy, segR, segR * aspect, rot + (Math.random() - 0.5) * 0.6, "#d9b382", 0.92);
        drawEllipse(sx, sy, segR * 0.8, segR * aspect * 0.8, rot, "#1e5225", 0.85);
        if (Math.random() > 0.35) {
          drawEllipse(sx + (Math.random() - 0.5) * segR * 0.3, sy, segR * 0.35, segR * aspect * 0.35, rot, "#404a3e", 0.7);
        }
        if (Math.random() > 0.6) {
          drawEllipse(sx, sy, segR * 0.14, segR * aspect * 0.14, rot, "#ffffff", 0.9);
        }
      }
    }
    ctx.globalCompositeOperation = "destination-over";
    for (let i = 0; i < coastals; i++) {
      drawBlob(Math.random() * width, height * 0.1 + Math.random() * height * 0.8, (isSmall ? 30 : 100) + Math.random() * (isSmall ? 50 : 160), "#0e7490", 0.35);
    }
    ctx.globalCompositeOperation = "source-over";
    
    for (let i = 0; i < lights; i++) {
      const cx = Math.random() * width; const cy = height * 0.15 + Math.random() * height * 0.7;
      drawBlob(cx, cy, 1 + Math.random() * 3, "#fef08a", 0.35);
    }

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

    for (let i = 0; i < plains; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = (isSmall ? 30 : 100) + Math.random() * (isSmall ? 60 : 200);
      drawBlob(cx, cy, r, "#36160d", 0.6);
    }
    for (let i = 0; i < storms; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = (isSmall ? 40 : 140) + Math.random() * (isSmall ? 70 : 240);
      drawBlob(cx, cy, r, "#e28d68", 0.4);
    }
    for (let i = 0; i < craters; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = 2 + Math.random() * (isSmall ? 8 : 25);
      drawBlob(cx, cy, r, "#2d0f08", 0.75);
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = "#f3bca2";
      ctx.lineWidth = Math.max(1, r * 0.15);
      ctx.beginPath(); ctx.arc(cx + r * 0.1, cy + r * 0.1, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.98;
    ctx.fillRect(0, 0, width, height * 0.05);
    ctx.fillRect(0, height * 0.93, width, height * 0.07);
    for (let i = 0; i < icecaps; i++) {
      drawBlob(Math.random() * width, height * 0.05 + Math.random() * 5, 5 + Math.random() * 10, "#ffffff", 0.6);
      drawBlob(Math.random() * width, height * 0.93 - Math.random() * 5, 5 + Math.random() * 10, "#ffffff", 0.6);
    }
  } else if (type === "venus") {
    const cloudLoops = isSmall ? 10 : 25;
    const vortexLoops = isSmall ? 4 : 10;

    for (let i = 0; i < cloudLoops; i++) {
      const y = Math.random() * height;
      const x = Math.random() * width;
      ctx.globalAlpha = 0.2 + Math.random() * 0.3;
      ctx.fillStyle = Math.random() > 0.5 ? "#eedfa0" : "#d9bf80";
      ctx.beginPath();
      ctx.ellipse(x, y, (isSmall ? 40 : 120) + Math.random() * (isSmall ? 80 : 280), (isSmall ? 3 : 10) + Math.random() * (isSmall ? 8 : 28), Math.PI / 18, 0, Math.PI * 2);
      ctx.fill();
    }
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

    for (let i = 0; i < bandCount; i++) {
      const y = (i / bandCount) * height;
      ctx.fillStyle = bands[Math.floor(Math.random() * bands.length)];
      ctx.globalAlpha = 0.8 + Math.random() * 0.2;
      ctx.fillRect(0, y, width, height / bandCount);
    }
    
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
      drawBlob(width * 0.45, height * 0.7, isSmall ? 15 : 50, "#8a1c0d", 0.95);
      drawBlob(width * 0.45, height * 0.7, isSmall ? 13 : 45, "#b83d1d", 0.98);
      drawBlob(width * 0.47, height * 0.71, isSmall ? 8 : 25, "#ef4444", 0.8);
      drawBlob(width * 0.44, height * 0.69, isSmall ? 4 : 15, "#ffffff", 0.35);
      
      for (let i = 0; i < 4; i++) {
        drawBlob(width * (0.1 + i * 0.22), height * 0.8, isSmall ? 4 : 12, "#ffffff", 0.85);
      }
    }
  } else {
    const plainLoops = isSmall ? 3 : 6;
    const craterLoops = isSmall ? 50 : 180;

    for (let i = 0; i < plainLoops; i++) {
      const cx = Math.random() * width; const cy = Math.random() * height; const r = (isSmall ? 30 : 120) + Math.random() * (isSmall ? 50 : 200);
      drawBlob(cx, cy, r, "#1a1a1a", 0.45);
    }
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
      
      drawBlob(cx, cy, r, "#111111", 0.8);
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

export function generateSunGlowTexture(size: number = 512) {
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

export function generateSunFlareTexture(size: number = 512) {
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

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  grad.addColorStop(0, "rgba(255, 255, 240, 0.6)");
  grad.addColorStop(0.15, "rgba(255, 180, 50, 0.25)");
  grad.addColorStop(0.4, "rgba(230, 50, 0, 0.07)");
  grad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

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

export function generatePlanetGlowTexture(colorHex: string, size: number = 256) {
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

export function generateSaturnRingsTexture(size: number = 1024) {
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

    if (t > 0.48 && t < 0.54) {
      opacity = 0.01;
    } else if (t > 0.82 && t < 0.84) {
      opacity = 0.05;
    } else if (t < 0.12) {
      opacity *= 0.2;
    } else if (t > 0.94) {
      opacity *= 0.15;
    }

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

export function generateCloudsTexture(width: number, height: number) {
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
  const count = isSmall ? 20 : 65;
  for (let i = 0; i < count; i++) {
    const y = Math.random() * height;
    const x = Math.random() * width;
    drawBlob(x, y, (isSmall ? 4 : 12) + Math.random() * (isSmall ? 10 : 35), "#ffffff", 0.08 + Math.random() * 0.16);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function generateAccretionDiskTexture(size: number) {
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

export function generateNebulaWispTexture() {
  const cacheKey = "nebula_wisp_v3";
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;
  const size = 512;
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.filter = "blur(12px)";
  for (let i = 0; i < 16; i++) {
    const cx = size / 2 + (Math.random() - 0.5) * size * 0.5;
    const cy = size / 2 + (Math.random() - 0.5) * size * 0.5;
    const r = size * (0.22 + Math.random() * 0.32);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255,0.7)");
    g.addColorStop(0.3, "rgba(255,255,255,0.35)");
    g.addColorStop(0.65, "rgba(255,255,255,0.1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.filter = "blur(8px)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.bezierCurveTo(
      Math.random() * size, Math.random() * size,
      Math.random() * size, Math.random() * size,
      Math.random() * size, Math.random() * size
    );
    ctx.lineWidth = 3 + Math.random() * 6;
    ctx.strokeStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.15})`;
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(c);
  textureCache.set(cacheKey, texture);
  return texture;
}

export function generateNebulaCoreTexture() {
  const cacheKey = "nebula_core_v3";
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;
  const size = 512;
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.filter = "blur(6px)";
  for (let i = 0; i < 8; i++) {
    const cx = size / 2 + (Math.random() - 0.5) * size * 0.2;
    const cy = size / 2 + (Math.random() - 0.5) * size * 0.2;
    const r = size * (0.12 + Math.random() * 0.2);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.35, "rgba(255,255,255,0.45)");
    g.addColorStop(0.7, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(c);
  textureCache.set(cacheKey, texture);
  return texture;
}

export function generateMilkyWayTexture() {
  const cacheKey = "milkyway_band_v2";
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;
  const w = 1024, h = 512;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, "rgba(150,165,255,0)");
  grad.addColorStop(0.28, "rgba(175,180,255,0.08)");
  grad.addColorStop(0.42, "rgba(215,205,255,0.22)");
  grad.addColorStop(0.5, "rgba(240,230,255,0.35)");
  grad.addColorStop(0.58, "rgba(215,205,255,0.22)");
  grad.addColorStop(0.72, "rgba(175,180,255,0.08)");
  grad.addColorStop(1.0, "rgba(150,165,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.filter = "blur(2px)";
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * w;
    const y = h * 0.5 + (Math.random() - 0.5) * h * 0.34;
    const r = 4 + Math.random() * 14;
    ctx.globalAlpha = 0.04 + Math.random() * 0.04;
    ctx.fillStyle = "#050308";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * w;
    const y = h * 0.5 + (Math.random() - 0.5) * h * 0.35;
    ctx.globalAlpha = 0.2 + Math.random() * 0.5;
    ctx.fillStyle = "#ffffff";
    const s = Math.random() < 0.1 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }
  const texture = new THREE.CanvasTexture(c);
  ctx.globalCompositeOperation = "destination-in";
  const edgeMask = ctx.createLinearGradient(0, 0, w, 0);
  edgeMask.addColorStop(0.0, "rgba(0,0,0,0)");
  edgeMask.addColorStop(0.18, "rgba(0,0,0,1)");
  edgeMask.addColorStop(0.82, "rgba(0,0,0,1)");
  edgeMask.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = edgeMask;
  ctx.fillRect(0, 0, w, h);
  textureCache.set(cacheKey, texture);
  return texture;
}
