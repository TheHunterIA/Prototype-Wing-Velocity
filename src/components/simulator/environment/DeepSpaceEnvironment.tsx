import { useRef, useMemo, useEffect, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { STAR_VERTEX_SHADER, STAR_FRAGMENT_SHADER } from "../shaders/starShader";

// Cache de textura local para evitar recriação de texturas WebGL
const textureCache = new Map<string, THREE.CanvasTexture>();

function generateNebulaWispTexture() {
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

function generateNebulaCoreTexture() {
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

export const RenderNebulas = memo(function RenderNebulas({ nebulas }: { nebulas: any[] }) {
  const wispTexture = useMemo(() => generateNebulaWispTexture(), []);
  const coreTexture = useMemo(() => generateNebulaCoreTexture(), []);
  const outerRefs = useRef<(THREE.Sprite | null)[]>([]);
  const innerRefs = useRef<(THREE.Sprite | null)[]>([]);
  const haloRefs = useRef<(THREE.Sprite | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < nebulas.length; i++) {
      const outerMat = outerRefs.current[i]?.material as THREE.SpriteMaterial | undefined;
      if (outerMat) outerMat.rotation = t * 0.012 + i;
      const innerMat = innerRefs.current[i]?.material as THREE.SpriteMaterial | undefined;
      if (innerMat) innerMat.rotation = -t * 0.02 + i * 0.7;
      const haloMat = haloRefs.current[i]?.material as THREE.SpriteMaterial | undefined;
      if (haloMat) haloMat.rotation = t * 0.006 + i * 1.3;
    }
  });

  return (
    <group>
      {nebulas.map((neb, i) => (
        <group key={i}>
          <sprite ref={(el) => { haloRefs.current[i] = el; }} position={neb.pos} scale={[neb.scale * 2.2, neb.scale * 2.2, 1]}>
            <spriteMaterial map={wispTexture} color={neb.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.12} />
          </sprite>
          <sprite ref={(el) => { outerRefs.current[i] = el; }} position={neb.pos} scale={[neb.scale * 1.4, neb.scale * 1.4, 1]}>
            <spriteMaterial map={wispTexture} color={neb.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.2} />
          </sprite>
          <sprite ref={(el) => { innerRefs.current[i] = el; }} position={neb.pos} scale={[neb.scale * 0.7, neb.scale * 0.7, 1]}>
            <spriteMaterial map={coreTexture} color={neb.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.35} />
          </sprite>
        </group>
      ))}
    </group>
  );
});

function generateMilkyWayTexture() {
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
  ctx.globalCompositeOperation = "source-over";
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

export const RenderMilkyWay = memo(function RenderMilkyWay() {
  const texture = useMemo(() => generateMilkyWayTexture(), []);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.00012;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 2000, -34000]} rotation={[0.25, 0.4, 0.85]} renderOrder={-1}>
      <planeGeometry args={[95000, 42000]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
        fog={false}
      />
    </mesh>
  );
});

import { GraphicsQuality } from "../../../types";

export const RenderBackgroundStars = memo(function RenderBackgroundStars({ starlightColor, graphicsQuality }: { starlightColor?: string, graphicsQuality?: GraphicsQuality }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const count = graphicsQuality === "low" ? 600 : (graphicsQuality === "medium" ? 3000 : 6000);

  const { positions, colors, sizes, phases, brightnesses } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const brightness = new Float32Array(count);

    const tintColor = starlightColor ? new THREE.Color(starlightColor) : null;

    const starColors = [
      new THREE.Color("#c8d8ff"),
      new THREE.Color("#dce4ff"),
      new THREE.Color("#f0f0ff"),
      new THREE.Color("#ffffff"),
      new THREE.Color("#fff8e8"),
      new THREE.Color("#ffe4c4"),
      new THREE.Color("#ffc898"),
      new THREE.Color("#ffb0b0"),
    ];

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 30000 + Math.random() * 20000;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const color = starColors[Math.floor(Math.random() * starColors.length)].clone();
      if (tintColor) {
        color.lerp(tintColor, 0.25);
      }
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      const magnitude = Math.pow(Math.random(), 4);
      size[i] = 0.8 + magnitude * 8.0;
      brightness[i] = 0.3 + Math.random() * 0.7;
      phase[i] = Math.random() * 10.0;
    }
    return { positions: pos, colors: col, sizes: size, phases: phase, brightnesses: brightness };
  }, [starlightColor, count]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    if (pointsRef.current) {
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
        <bufferAttribute attach="attributes-aColor" count={count} array={colors} itemSize={3} />
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

// Componente principal de ambiente unificado que limpa texturas ao desmontar
export const DeepSpaceEnvironment = memo(function DeepSpaceEnvironment({ selectedRoute, graphicsQuality }: { selectedRoute: any, graphicsQuality: "high" | "low" }) {
  useEffect(() => {
    return () => {
      // Limpeza de cache de texturas criadas dinamicamente
      textureCache.forEach((tex) => tex.dispose());
      textureCache.clear();
    };
  }, []);

  return (
    <group>
      <RenderBackgroundStars starlightColor={selectedRoute?.starlightColor} graphicsQuality={graphicsQuality} />
      <RenderMilkyWay />
      {selectedRoute?.nebulas && <RenderNebulas nebulas={selectedRoute.nebulas} />}
    </group>
  );
});
