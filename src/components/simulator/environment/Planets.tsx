import { useRef, useMemo, useEffect, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { 
  useSafeTexture, 
  generateNoiseTexture, 
  generateNormalMapFromAlbedo, 
  textureCache 
} from "../utils/textures";

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
    let r = 255, g = 255, b = 255;
    if (clean.length === 3) {
      r = parseInt(clean[0] + clean[0], 16);
      g = parseInt(clean[1] + clean[1], 16);
      b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length === 6) {
      r = parseInt(clean.substring(0, 2), 16);
      g = parseInt(clean.substring(2, 4), 16);
      b = parseInt(clean.substring(4, 6), 16);
    }
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

export function SaturnRingsInstanced({ radius }: { radius: number }) {
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
      const x = Math.cos(theta) * r; const y = (Math.random() - 0.5) * 450; const z = Math.sin(theta) * r;
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const s = 1.0 + Math.random() * 5.5;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [radius, count, dummy]);
  
  useFrame((state, delta) => { if (meshRef.current) meshRef.current.rotation.y += delta * 0.015; });
  
  return (
    <group rotation={[Math.PI / 18, 0, 0]}>
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
            depthWrite={false}
          />
        </mesh>
      )}

      <instancedMesh ref={meshRef} args={[null as any, null as any, count]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#d4c5b0" map={activeTexture || undefined} roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

export const MoonModel = memo(function MoonModel({ moon }: { moon: { id: string; distance: number; radius: number; color: string; speed: number } }) {
  const groupRef = useRef<THREE.Group>(null); const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * moon.speed;
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.08;
  });
  const texture = useMemo(() => generateNoiseTexture(256, 128, "asteroid", moon.color), [moon.color]);
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

export const EarthModel = memo(function EarthModel({ planet }: { planet: { id: string; pos: THREE.Vector3; radius: number; color: string; emissive: string; moons?: any[] } }) {
  const planetRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const realEarthTexture = useSafeTexture("/earth_texture.webp");
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

export const BlackHoleModel = memo(function BlackHoleModel({ planet }: { planet: { id: string; pos: THREE.Vector3; radius: number; color: string; emissive: string } }) {
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
      <mesh>
        <sphereGeometry args={[planet.radius, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

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

export const PlanetModel = memo(function PlanetModel({ planet }: { planet: { id: string; pos: THREE.Vector3; radius: number; color: string; emissive: string; moons?: any[] } }) {
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

  const materialProps = useMemo(() => {
    let baseColor = new THREE.Color(planet.color);
    let emissiveColor = new THREE.Color(planet.color);
    let emissiveIntensity = 0.45;
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
        emissiveColor = new THREE.Color(planet.emissive || planet.color);
        emissiveIntensity = 0.50;
        roughness = 0.75; metalness = 0.08;
        break;
    }

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
          <pointLight distance={150000} decay={1.2} intensity={5.0} color={planet.color} castShadow={false} />
          <pointLight distance={35000} decay={1.8} intensity={1.8} color="#90a2be" />
        </>
      )}
    </group>
  );
});
