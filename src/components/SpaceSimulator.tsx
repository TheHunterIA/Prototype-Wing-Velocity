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
import { ShipData, RouteData } from "../types";
import { LoadingScreen } from "./LoadingScreen";
import { AAADeepSpaceBackground } from "./AAADeepSpaceBackground";
import { Takeoff3DShipCanvas } from "./simulator/TakeoffCanvas";
import { scanShipThrusterPositions } from "./simulator/thrusterUtils";
import { PilotShip, PilotShipView, ShipThrusters } from "./simulator/PilotShip";
import {
  useSafeTexture,
  generateNoiseTexture,
  generateNormalMapFromAlbedo,
  generateSunGlowTexture,
  generateSunFlareTexture,
  generatePlanetGlowTexture,
  generateSaturnRingsTexture,
  generateCloudsTexture,
  generateAccretionDiskTexture,
  generateNebulaWispTexture,
  generateNebulaCoreTexture,
  generateMilkyWayTexture,
  clearTextureCache
} from "./simulator/textureGenerators";
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





const EarthModel = memo(function EarthModel({ planet }: { planet: { id: string; pos: THREE.Vector3; radius: number; color: string; emissive: string; moons?: any[] } }) {
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
        roughness = 0.1; metalness = 0.0; toneMapped = true;
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

  const frameCountRef = useRef(0);

  // Executar a rotação e animação contínua de todos os asteroides a cada frame para dar sensação de universo em movimento
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    frameCountRef.current++;

    // Em qualidade baixa quando os asteroides apenas rotacionam no lugar, alterna a atualização dos dados a cada 2 frames para economizar tráfego na GPU
    if (graphicsQuality === "low" && !selectedRoute.hasMovingAsteroids && !asteroidsChangedRef?.current && frameCountRef.current % 2 !== 0) {
      return;
    }

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
}





function BossShipModel({ position, rotation, scale }: { position: THREE.Vector3, rotation: [number, number, number], scale: number }) {
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
        emissiveIntensity: 3.5,
        toneMapped: true,
      }),
      purple: new THREE.MeshStandardMaterial({
        color: "#a855f7",
        emissive: "#a855f7",
        emissiveIntensity: 3.5,
        toneMapped: true,
      }),
      red: new THREE.MeshStandardMaterial({
        color: "#ef4444",
        emissive: "#ef4444",
        emissiveIntensity: 3.5,
        toneMapped: true,
      }),
    };
  }, []);

  // Materiais de brilho básico aditivo (100% emissivos e auto-iluminados) para a aura volumétrica externa
  const glowMaterials = useMemo(() => {
    return {
      green: new THREE.MeshBasicMaterial({
        color: "#10b981",
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      purple: new THREE.MeshBasicMaterial({
        color: "#c084fc", // Roxo ligeiramente mais claro para sobressair no espaço
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      red: new THREE.MeshBasicMaterial({
        color: "#f87171", // Vermelho mais vibrante para a linha de chegada
        transparent: true,
        opacity: 0.25,
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
  graphicsQuality: "high" | "low";
  setGraphicsQuality: (quality: "high" | "low") => void;
  language?: Language;
  onHangarStateChange?: (isActive: boolean) => void;
  isMobile?: boolean;
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

function SpeedParallaxDust({ shipRef, velocityRef, keysRef, abilityActive, graphicsQuality }: any) {
  const count = graphicsQuality === "low" ? 120 : 300;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 600,
        z: (Math.random() - 0.5) * 1000 - 300,
        size: 0.15 + Math.random() * 0.4,
        speedFactor: 0.75 + Math.random() * 0.5
      });
    }
    return arr;
  }, []);

  const geo = useMemo(() => new THREE.BoxGeometry(0.2, 0.2, 1.2), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#a0e8ff",
    transparent: true,
    opacity: 0.35,
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

    const stretchZ = Math.min(8.0, 1.0 + (speed / 150.0) * (isBoost ? 3.0 : 1.5));
    mat.opacity = isBoost ? 0.45 : Math.min(0.35, 0.15 + (speed / 450.0) * 0.2);

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
  const t = translations[language || "en"];
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
  const pointerRef = useRef({ x: 0, y: 0 }); const targetPointerRef = useRef({ x: 0, y: 0 }); const shakeRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const touchBoostActiveRef = useRef<boolean>(false);
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
    };
  }, []);
  


  const countdown = null;
  
  // Aumentamos a base de asteroides e meteoros nos trajetos para exigir maior habilidade e manobras ágeis
  const baseAsteroidCount = graphicsQuality === "high"
    ? (isMobile ? 250 : 550)
    : (isMobile ? 80 : 180);
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

      // Posicionamento seguro e elegante para garantir que NENHUM aro fique dentro do planeta ou sua atmosfera
      const routeCenter = getRouteCenterAtZ(finalPos.z);
      
      let dx = p.pos.x - routeCenter.x;
      let dy = p.pos.y - routeCenter.y;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);

      if (distToCenter > 1) {
        dx /= distToCenter;
        dy /= distToCenter;
      } else {
        dx = 0.7071;
        dy = 0.7071;
      }

      // Distância base generosa
      const baseClearance = p.id === "saturn" ? 4500 : 3800;
      let targetDistance = newRadius + baseClearance;

      // Garantia matemática: testar contra todos os aros da pista e afastar o planeta se necessário
      const minRequiredSafety = newRadius + 3000; // Margem de segurança de 3000 unidades entre superfície do planeta e qualquer aro
      for (let r of ringsData) {
        let candidatePos = new THREE.Vector3(
          routeCenter.x + dx * targetDistance,
          routeCenter.y + dy * targetDistance,
          finalPos.z
        );
        let dist3D = candidatePos.distanceTo(r.pos);
        if (dist3D < minRequiredSafety + (r.radius || 120)) {
          const needed = (minRequiredSafety + (r.radius || 120)) - dist3D + 500;
          targetDistance += needed;
        }
      }

      finalPos.x = routeCenter.x + dx * targetDistance;
      finalPos.y = routeCenter.y + dy * targetDistance;

      // Ajuste proporcional das luas para orbitarem o planeta em área limpa
      let newMoons = p.moons;
      if (p.moons) {
        const maxMoonOrbit = Math.max(newRadius * 1.2, targetDistance - newRadius - 1500);
        newMoons = p.moons.map((m: any) => ({
          ...m,
          radius: m.radius * scaleMultiplier,
          distance: Math.min(m.distance * 1.25, maxMoonOrbit)
        }));
      }

      return { ...p, radius: newRadius, moons: newMoons, pos: finalPos };
    });
  }, [selectedRoute, getRouteCenterAtZ, ringsData]);

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
        targetPointerRef.current.x += e.movementX * sens;
        targetPointerRef.current.y -= e.movementY * sens; // Natural: mouse para cima = nariz para cima
        
        targetPointerRef.current.x = Math.max(-1.5, Math.min(1.5, targetPointerRef.current.x));
        targetPointerRef.current.y = Math.max(-1.5, Math.min(1.5, targetPointerRef.current.y));
      } else {
        // Suporte a controle de mouse livre mesmo fora do Pointer Lock
        const normX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
        const normY = -(e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
        targetPointerRef.current.x = THREE.MathUtils.clamp(normX * 1.2, -1.2, 1.2);
        targetPointerRef.current.y = THREE.MathUtils.clamp(normY * 1.2, -1.2, 1.2);
      }
    };
    const pointerLockChange = () => {
      if (!document.pointerLockElement) {
        targetPointerRef.current.x = 0;
        targetPointerRef.current.y = 0;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isHangarActive) return;
      const now = Date.now();
      if (now - lastTapTimeRef.current < 320) {
        // Double tap toggles Turbo / Boost
        touchBoostActiveRef.current = !touchBoostActiveRef.current;
        keysRef.current[' '] = touchBoostActiveRef.current;
        playSimSound(touchBoostActiveRef.current ? "boost" : "click", localMuted);
      }
      lastTapTimeRef.current = now;

      if (e.touches[0]) {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isHangarActive || !touchStartRef.current || !e.touches[0]) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      const sens = 0.012;
      targetPointerRef.current.x = THREE.MathUtils.clamp(deltaX * sens, -1.5, 1.5);
      targetPointerRef.current.y = THREE.MathUtils.clamp(-deltaY * sens, -1.5, 1.5);
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
      targetPointerRef.current.x = 0;
      targetPointerRef.current.y = 0;
    };

    window.addEventListener("keydown", down); 
    window.addEventListener("keyup", up); 
    window.addEventListener("mousemove", move);
    document.addEventListener("pointerlockchange", pointerLockChange);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => { 
      window.removeEventListener("keydown", down); 
      window.removeEventListener("keyup", up); 
      window.removeEventListener("mousemove", move); 
      document.removeEventListener("pointerlockchange", pointerLockChange);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isGameOver, localMuted, isHangarActive]);

  useEffect(() => {
    playSimSound("warp", localMuted); baseQuat.current.identity();
    if (shipRef.current) { shipRef.current.position.set(0, 0, 0); shipRef.current.rotation.set(0, 0, 0); }
    return () => {
      // Resource Manager: Limpeza profunda de texturas WebGL procedimentais
      clearTextureCache();
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
        takeoffProgressRef.current = 0.0; // Inicia em 0.0 para transição suave de câmera sem salto
        shakeRef.current = 0.0; // Sem tremor na transição
        playSimSound("warp", localMuted);
        crazyGamesService.gameplayStart();
      }, 3200); // Perfeitamente sincronizado com o zoom da tela de decolagem
      return () => clearTimeout(timer);
    }
  }, [isHangarActive, takeoffStarted, localMuted]);

  const flightVectorRef = useRef<HTMLDivElement>(null);

  const resetGame = () => {
    touchBoostActiveRef.current = false;
    keysRef.current[' '] = false;
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
      

      <div className="absolute inset-0 z-0 bg-black">
        <Canvas 
          camera={{ position: [0, 6, 26], fov: 45, near: 1.5, far: 60000 }} 
          shadows={graphicsQuality === "high" ? "basic" : false}
          dpr={[0.75, graphicsQuality === "high" ? 1.5 : 1.0]}
          gl={{ logarithmicDepthBuffer: false, antialias: graphicsQuality === "high", powerPreference: "high-performance" }}
          onCreated={({ gl }) => gl.setClearColor("#000000")}
        >
          <PerformanceController graphicsQuality={graphicsQuality} setGraphicsQuality={setGraphicsQuality} />
          <SpeedParticles velocityRef={velocityRef} shipRef={shipRef} graphicsQuality={graphicsQuality} />
          <SpaceDust shipRef={shipRef} dustColor={selectedRoute.dustColor || "#5e6d8a"} graphicsQuality={graphicsQuality} />
          <color attach="background" args={[selectedRoute.ambientColor === "#09090b" ? "#000000" : "#020205"]} />
          <fog attach="fog" args={[selectedRoute.fogColor || selectedRoute.ambientColor, 1000, 100000]} />
          <Suspense fallback={null}>
            {/* Ambient lift — planetas precisam de luz de preenchimento generosa em espaço aberto */}
            <ambientLight intensity={0.55} color="#8090b0" />
            <hemisphereLight color="#7b93c2" groundColor="#050812" intensity={0.75} />
            {/* Fonte de reflexo/iluminação indireta para materiais PBR (casco da nave, etc.) — sem isso,
                MeshStandardMaterial nunca recebe envMap e fica com aparência "plástica" mesmo com boa luz direta */}
            {graphicsQuality === "high" && <Environment preset="night" environmentIntensity={0.6} />}
            {/* Luz solar principal — colateral para o eixo Z do trajeto, cria sombra lateral dramática nos planetas */}
            <directionalLight 
              position={[18, 30, 10]} 
              intensity={5.5}
              color={selectedRoute.sunLightColor || "#ffe8d0"}
              castShadow={graphicsQuality === "high"} 
              shadow-mapSize={graphicsQuality === "high" ? [1024, 1024] : [512, 512]}
              shadow-camera-near={1}
              shadow-camera-far={200}
              shadow-camera-left={-60}
              shadow-camera-right={60}
              shadow-camera-top={60}
              shadow-camera-bottom={-60}
              shadow-bias={-0.0005}
            />
            {/* Rim light de cor da rota — ilumina a borda traseira dos planetas e naves */}
            <directionalLight position={[-20, 10, -20]} intensity={3.0} color={selectedColor.colorHex} />
            {/* Fill baixo suave — evita sombras completamente pretas */}
            <directionalLight position={[0, -25, 5]} intensity={1.2} color="#1a2040" />
            {/* AAA Deep Space Environment (Volumetric Ray-warped Skybox + Flare Stars) */}
            <AAADeepSpaceBackground selectedRoute={selectedRoute} graphicsQuality={graphicsQuality} />
            <RenderBackgroundStars starlightColor={selectedRoute.starlightColor} graphicsQuality={graphicsQuality} />
            
              <GameEngine 
                shipRef={shipRef} 
                velocityRef={velocityRef} 
                baseQuat={baseQuat} 
                isHangarActive={isHangarActive} 
                setIsHangarActive={setIsHangarActive} 
                takeoffProgressRef={takeoffProgressRef} 
                pointerRef={pointerRef} 
                targetPointerRef={targetPointerRef}
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
                repulsionVelRef={repulsionVelRef}
              />
            
            <RenderNeonRings ringsRef={neonRingsRef} shipRef={shipRef} />
            <SpeedParallaxDust shipRef={shipRef} velocityRef={velocityRef} keysRef={keysRef} abilityActive={abilityActive} graphicsQuality={graphicsQuality} />

            
            {/* Planets always visible so the corridor exit frames them beautifully */}
            {planets.map(p => <PlanetModel key={p.id} planet={p} />)}
            
            {/* Keep asteroids, satellites, and explosions always rendered so you can see them from inside the corridor before exiting */}
            <RenderExplosions explosionsRef={explosionsRef} />
            {satellites.map(s => <DestroyedSatelliteModel key={s.id} position={[s.pos.x, s.pos.y, s.pos.z]} rotation={s.rot} scale={s.scale} selectedRoute={selectedRoute} />)}
            {/* Render highly optimized instanced asteroids with just 1 Draw Call! */}
            <RenderAsteroids asteroids={asteroids} texture={asteroidTexture || fallbackAsteroidTexture} selectedRoute={selectedRoute} graphicsQuality={graphicsQuality} asteroidsChangedRef={asteroidsChangedRef} />
            

            <group ref={shipRef} visible={!isHangarActive}>
              <PilotShip currentShip={currentShip} selectedColor={selectedColor} abilityActive={abilityActive} isHangarActive={isHangarActive} />
              <ShipThrusters currentShip={currentShip} selectedColor={selectedColor} keysRef={keysRef} abilityActive={abilityActive} velocityRef={velocityRef} takeoffProgressRef={takeoffProgressRef} />
              <ShipCrosshair selectedColor={selectedColor} />

              {/* Luzes locais de destaque atreladas à nave */}
              {graphicsQuality === "high" ? (
                <>
                  <pointLight position={[0, 6, 10]} intensity={8.0} distance={100} decay={1.5} />
                  <pointLight position={[0, -6, -10]} intensity={6.0} distance={80} decay={1.5} color={selectedColor.colorHex} />
                </>
              ) : (
                <pointLight position={[0, 5, 8]} intensity={5.0} distance={60} decay={1.5} />
              )}
              <directionalLight position={[5, 15, 15]} intensity={6.0} />
            </group>
          </Suspense>

          {graphicsQuality === "high" && (
            <EffectComposer key="sim-composer-high" multisampling={0}>
              {/* Bloom threshold 0.82: nebula cores ficam abaixo, só spikes estelares e propulsores disparam */}
              <Bloom luminanceThreshold={0.82} mipmapBlur intensity={0.45} radius={0.6} />
              <ChromaticAberration offset={[0.0004, 0.0004]} radialModulation modulationOffset={0.18} />
              <BrightnessContrast brightness={0.01} contrast={0.08} />
              <HueSaturation hue={0} saturation={0.10} />
              <Vignette eskil={false} offset={0.12} darkness={0.55} />
            </EffectComposer>
          )}
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
            {/* Imagem nítida e fixa da tela de decolagem (sem a distorção do zoom antigo) */}
            <div className="absolute inset-0 w-full h-full">
              <img 
                id="hangar-image"
                src="/loading_bg.webp"
                className="w-full h-full object-cover select-none brightness-90"
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

            {/* Desktop Control Info Panel (positioned on the right side of the screen - hidden on mobile) */}
            <div className="hidden md:flex absolute bottom-6 right-6 z-10 pointer-events-none flex-col gap-1.5 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/5 w-[210px] font-mono select-none shadow-2xl">
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

const DUST_VERTEX_SHADER = `
  uniform vec3 uShipPosition;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    vec3 pos = position;
    
    // Wave movement
    pos.y += sin(uTime * 0.15 + pos.x * 0.05 + pos.z * 0.05) * 4.0;
    pos.x += cos(uTime * 0.1 + pos.y * 0.05) * 2.0;
    
    vec3 diff = pos - uShipPosition;
    vec3 wrapped = mod(diff + vec3(400.0), 800.0) - vec3(400.0);
    vec3 finalPos = uShipPosition + wrapped;
    
    // Fade edge to prevent pop-in
    float distToEdge = min(min(400.0 - abs(wrapped.x), 400.0 - abs(wrapped.y)), 400.0 - abs(wrapped.z));
    vAlpha = smoothstep(0.0, 60.0, distToEdge) * 0.22;
    
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    float depth = max(1.0, -mvPosition.z);
    gl_PointSize = min(12.0, 0.85 * (400.0 / depth));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const DUST_FRAGMENT_SHADER = `
  uniform vec3 uDustColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv) * 2.0;
    float alpha = smoothstep(1.0, 0.0, dist);
    gl_FragColor = vec4(uDustColor * alpha * vAlpha, alpha * vAlpha);
  }
`;

const SPEED_PARTICLES_VERTEX_SHADER = `
  uniform vec3 uShipPosition;
  uniform float uTravelOffset;
  uniform float uOpacity;
  attribute float aSpeed;
  varying float vAlpha;
  void main() {
    vec3 pos = position;
    
    float zDiff = pos.z - uShipPosition.z - uTravelOffset * aSpeed;
    float wrappedZ = mod(zDiff + 250.0, 500.0) - 250.0;
    
    vec3 finalPos = vec3(pos.xy + uShipPosition.xy, uShipPosition.z + wrappedZ);
    
    float distToEdge = min(250.0 - abs(wrappedZ), 90.0);
    vAlpha = smoothstep(0.0, 60.0, distToEdge) * uOpacity;
    
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    float pSize = (0.5 + aSpeed * 0.3) * (350.0 / max(1.0, -mvPosition.z));
    gl_PointSize = min(8.0, pSize);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SPEED_PARTICLES_FRAGMENT_SHADER = `
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv) * 2.0;
    float alpha = smoothstep(1.0, 0.0, dist);
    gl_FragColor = vec4(vec3(0.70, 0.82, 0.95) * alpha * vAlpha, alpha * vAlpha);
  }
`;

function SpeedParticles({ velocityRef, shipRef, graphicsQuality }: { velocityRef: React.MutableRefObject<number>, shipRef: React.RefObject<THREE.Group>, graphicsQuality?: "high" | "low" }) {
  const pointsRef = useRef<THREE.Points>(null); 
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = graphicsQuality === "low" ? 350 : 900;
  
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 22 + Math.random() * 180;
      pos[i * 3] = Math.cos(angle) * dist;
      pos[i * 3 + 1] = Math.sin(angle) * dist;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 500;
      speed[i] = 1.2 + Math.random() * 2.5;
    }
    return [pos, speed];
  }, []);

  const uniforms = useMemo(() => ({
    uShipPosition: { value: new THREE.Vector3() },
    uTravelOffset: { value: 0 },
    uOpacity: { value: 0 }
  }), []);

  const travelOffsetRef = useRef(0);

  useFrame((state, dt) => {
    const absVelocity = Math.abs(velocityRef.current);
    travelOffsetRef.current += (absVelocity * 0.45 + 120) * dt;
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTravelOffset.value = travelOffsetRef.current;
      materialRef.current.uniforms.uOpacity.value = Math.min(0.65, 0.20 + absVelocity / 350);
      if (shipRef.current) {
        materialRef.current.uniforms.uShipPosition.value.copy(shipRef.current.position);
      }
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSpeed" count={count} array={speeds} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={SPEED_PARTICLES_VERTEX_SHADER}
        fragmentShader={SPEED_PARTICLES_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function SpaceDust({ shipRef, dustColor = "#5e6d8a", graphicsQuality }: { shipRef: React.RefObject<THREE.Group>, dustColor?: string, graphicsQuality?: "high" | "low" }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = graphicsQuality === "low" ? 400 : 1200;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 800;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 800;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 800;
    }
    return pos;
  }, []);

  const dustColorVec = useMemo(() => new THREE.Color(dustColor), [dustColor]);

  const uniforms = useMemo(() => ({
    uShipPosition: { value: new THREE.Vector3() },
    uTime: { value: 0 },
    uDustColor: { value: dustColorVec }
  }), [dustColorVec]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uDustColor.value.copy(dustColorVec);
      if (shipRef.current) {
        materialRef.current.uniforms.uShipPosition.value.copy(shipRef.current.position);
      }
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={DUST_VERTEX_SHADER}
        fragmentShader={DUST_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function DynamicFOV({ velocityRef }: { velocityRef: React.MutableRefObject<number> }) {
  // FOV tracking is now handled directly inside GameEngine to prevent dual-controller matrix fights
  return null;
}



const RenderNebulas = memo(function RenderNebulas({ nebulas }: { nebulas: any[] }) {
  const wispTexture = useMemo(() => generateNebulaWispTexture(), []);
  const coreTexture = useMemo(() => generateNebulaCoreTexture(), []);
  const outerRefs = useRef<(THREE.Sprite | null)[]>([]);
  const innerRefs = useRef<(THREE.Sprite | null)[]>([]);
  const haloRefs = useRef<(THREE.Sprite | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < nebulas.length; i++) {
      // Rotação de parallax por camada — velocidades diferentes criam profundidade
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
          {/* Halo externo gigante — brilho difuso amplo */}
          <sprite ref={(el) => { haloRefs.current[i] = el; }} position={neb.pos} scale={[neb.scale * 2.2, neb.scale * 2.2, 1]}>
            <spriteMaterial map={wispTexture} color={neb.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.12} />
          </sprite>
          {/* Camada intermediária — nuvem volumétrica */}
          <sprite ref={(el) => { outerRefs.current[i] = el; }} position={neb.pos} scale={[neb.scale * 1.4, neb.scale * 1.4, 1]}>
            <spriteMaterial map={wispTexture} color={neb.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.2} />
          </sprite>
          {/* Núcleo brilhante */}
          <sprite ref={(el) => { innerRefs.current[i] = el; }} position={neb.pos} scale={[neb.scale * 0.7, neb.scale * 0.7, 1]}>
            <spriteMaterial map={coreTexture} color={neb.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.35} />
          </sprite>
        </group>
      ))}
    </group>
  );
});



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
        opacity={0.65}
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
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  attribute float aBrightness;
  uniform float uTime;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = aColor;
    // Cintilação sutil: cada estrela tem uma fase própria pra não piscarem em sincronia
    vTwinkle = aBrightness * (0.78 + 0.22 * sin(uTime * (0.6 + aPhase * 0.9) + aPhase * 6.2831));
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float depth = max(10.0, -mvPosition.z);
    gl_PointSize = min(24.0, aSize * (420.0 / depth));
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

const RenderBackgroundStars = memo(function RenderBackgroundStars({ starlightColor, graphicsQuality = "high" }: { starlightColor?: string; graphicsQuality?: "high" | "low" }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const count = graphicsQuality === "low" ? 2200 : 6000;

  const { positions, colors, sizes, phases, brightnesses } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const brightness = new Float32Array(count);

    const tintColor = starlightColor ? new THREE.Color(starlightColor) : null;

    // Cores de estrelas astronômicas com saturação variada
    const starColors = [
      new THREE.Color("#c8d8ff"), // Azul estrelar (tipo O/B)
      new THREE.Color("#dce4ff"), // Azul suave
      new THREE.Color("#f0f0ff"), // Branco azulado
      new THREE.Color("#ffffff"), // Branco Puro (tipo A)
      new THREE.Color("#fff8e8"), // Branco quente
      new THREE.Color("#ffe4c4"), // Amarelo (tipo G, como o Sol)
      new THREE.Color("#ffc898"), // Laranja (tipo K)
      new THREE.Color("#ffb0b0"), // Vermelho suave (tipo M)
    ];

    for (let i = 0; i < count; i++) {
      // Posicionar estrelas em uma esfera celeste distante
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 30000 + Math.random() * 20000; // Esfera distante com variação

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const color = starColors[Math.floor(Math.random() * starColors.length)].clone();
      if (tintColor) {
        color.lerp(tintColor, 0.25); // Matiz sutil da rota
      }
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      // Distribuição de magnitude mais balanceada — muitas estrelas tênues, mas bem mais visíveis
      const magnitude = Math.pow(Math.random(), 4);
      size[i] = 0.8 + magnitude * 8.0; // Tamanhos de 0.8 a ~8.8
      brightness[i] = 0.3 + Math.random() * 0.7; // Brilho mínimo mais alto
      phase[i] = Math.random() * 10.0;
    }
    return { positions: pos, colors: col, sizes: size, phases: phase, brightnesses: brightness };
  }, [starlightColor]);

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

const EXPLOSION_LIGHT_POOL_SIZE = 4;

const RenderExplosions = memo(function RenderExplosions({ explosionsRef }: { explosionsRef: React.RefObject<ExplosionState[]> }) {
  const meshRef = useRef<THREE.Points>(null);
  const maxParticles = 3000;
  const lightPoolRef = useRef<(THREE.PointLight | null)[]>([]);

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
      if (explosions.length === 0) {
        if (lastParticleCountRef.current !== 0) {
          if (meshRef.current && meshRef.current.geometry) {
            meshRef.current.geometry.setDrawRange(0, 0);
          }
          lastParticleCountRef.current = 0;
          for (let i = 0; i < EXPLOSION_LIGHT_POOL_SIZE; i++) {
            if (lightPoolRef.current[i]) lightPoolRef.current[i]!.intensity = 0;
          }
        }
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

      // Distribui as explosões mais "vivas" (life mais alto = mais recente/brilhante) entre
      // as luzes disponíveis do pool. As demais explosões continuam só com as partículas.
      const sorted = [...explosions].sort((a, b) => b.life - a.life).slice(0, EXPLOSION_LIGHT_POOL_SIZE);
      for (let i = 0; i < EXPLOSION_LIGHT_POOL_SIZE; i++) {
        const light = lightPoolRef.current[i];
        if (!light) continue;
        const exp = sorted[i];
        if (exp) {
          light.position.copy(exp.position);
          // Curva de intensidade: pico logo após a explosão, apaga suavemente com o life
          light.intensity = Math.max(0, exp.life) * 22;
          light.color.set(exp.particles[0]?.color || "#ff8a3d");
        } else {
          light.intensity = 0;
        }
      }
    }
  });

  return (
    <>
      {Array.from({ length: EXPLOSION_LIGHT_POOL_SIZE }).map((_, i) => (
        <pointLight
          key={i}
          ref={(el) => { lightPoolRef.current[i] = el; }}
          intensity={0}
          distance={40}
          decay={2}
        />
      ))}
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
    </>
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
  const lang = language || "en";
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

            ctx.fillStyle = blipColor;
            
            ctx.beginPath();
            ctx.arc(baseX, elevY, (isBehind ? 3.5 : 4.5) * pulse, 0, Math.PI * 2);
            ctx.fill();
          }

          // Desenhar a nave do jogador no centro (Seta indicadora de direção branca brilhante)
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(cx, cy - 5);      // bico da nave
          ctx.lineTo(cx - 4, cy + 4);  // asa esquerda
          ctx.lineTo(cx, cy + 2);      // motor traseiro
          ctx.lineTo(cx + 4, cy + 4);  // asa direita
          ctx.closePath();
          ctx.fill();
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

      // Lógica de tempo do trajeto (Cronômetro contínuo sem resets ao usar Turbo)
      const rings = neonRingsRef?.current || [];
      const numRings = selectedRoute.numRings;
      
      const firstPassed = rings[0]?.passed || raceStartedRef.current;
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
      <div className="absolute bottom-2 left-2 sm:bottom-6 sm:left-6 z-10 pointer-events-auto select-none flex flex-col items-center gap-1.5 sm:gap-3">
        {/* Radar Circular Tático via Canvas */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-[90px] h-[90px] sm:w-[140px] sm:h-[140px] relative border border-white/15 bg-black/75 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center">
            <canvas 
              ref={radarCanvasRef} 
              width={140} 
              height={140} 
              className="w-full h-full rounded-full object-cover"
            />
          </div>

          {/* Badge Informativo do Radar */}
          <div 
            ref={radarBadgeRef}
            className="px-1.5 sm:px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded border border-white/5 text-[7px] sm:text-[8px] font-bold font-mono tracking-widest uppercase shadow-md flex items-center gap-1 sm:gap-1.5"
          >
            <span>{currEnv.nextRing}</span>
            <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
            <span ref={radarDistanceTextRef}>--- m</span>
          </div>
        </div>

        {/* Painel de Telemetria */}
        <div className="flex flex-col gap-1 sm:gap-1.5 bg-black/60 backdrop-blur-md p-2 sm:p-3 rounded-lg border border-white/5 w-[130px] sm:w-[200px] font-mono shadow-2xl text-[8px] sm:text-[10px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-0.5 sm:pb-1 text-[7px] sm:text-[8px] tracking-wider text-zinc-400">
            <span className="font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              {t.telemetry}
            </span>
            <span className="text-[6px] sm:text-[7px] text-zinc-600">SYS_OK</span>
          </div>
          
          {/* Speed & Energy */}
          <div className="flex justify-between items-center text-[8px] sm:text-[10px]">
            <span className="text-zinc-500 uppercase tracking-widest text-[7px] sm:text-[8px]">{t.speedLabel}</span>
            <span className="font-bold text-cyan-300 flex items-center gap-0.5">
              <span ref={velTextRef}>0</span> <span className="text-[6px] sm:text-[7px] text-zinc-500">km/s</span>
            </span>
          </div>

          {/* Energy Bar */}
          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="flex justify-between items-center text-[7px] sm:text-[8px] font-bold">
              <span ref={energyLabelRef} className="text-emerald-400 uppercase tracking-widest">{t.energy}</span>
              <span ref={energyTextRef} className="text-emerald-300">100%</span>
            </div>
            <div className="h-1 sm:h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
              <div 
                ref={energyBarRef}
                className="h-full bg-emerald-400 transition-all duration-150" 
                style={{ width: `100%` }} 
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 pt-1 sm:pt-1.5 border-t border-white/5 text-[8px] sm:text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-widest text-[7px] sm:text-[8px]">{currEnv.activeRing}</span>
              <span ref={activeRingTextRef} className="font-bold font-mono tracking-wider">1 / {selectedRoute.numRings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-widest text-[7px] sm:text-[8px]">{currEnv.totalTime}</span>
              <span ref={activeRingDistRef} className="font-bold font-mono text-cyan-400">0.00s</span>
            </div>
          </div>

          {/* MÓDULO AMBIENTAL DINÂMICO */}
          <div id="env-module" className="flex flex-col gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 pt-1 sm:pt-1.5 border-t border-white/10 text-[8px] sm:text-[10px]">
            <div className="flex justify-between items-center">
              <span id="env-label" className="text-zinc-500 uppercase tracking-widest text-[7px] sm:text-[8px]">{currEnv.sector}</span>
              <span id="env-value-text" className="font-bold text-zinc-300 truncate max-w-[65px] sm:max-w-none">{currEnv.stable}</span>
            </div>
            <div id="env-bar-container" className="h-1 sm:h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5 hidden">
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


function GameEngine({ shipRef, velocityRef, baseQuat, isHangarActive, setIsHangarActive, takeoffProgressRef, pointerRef, targetPointerRef, keysRef, scoreRef, multiplierRef, planets, asteroids, satellites, abilityActive, setAbilityActive, energyRef, currentShip, createExplosion, localMuted, shieldRef, armorRef, setIsGameOver, setIsVictory, trafficShips, shakeRef, explosionsRef, selectedColor, countdown, stats, neonRingsRef, selectedRoute, customRouteDataRef, asteroidsChangedRef, flightVectorRef, repulsionVelRef }: any) {
  const cameraOffset = useRef(new THREE.Vector3(0, 2.5, 15));
  // Quaternion "atrasado" só para orientar a câmera (nunca a posição/física da nave) — dá um
  // leve efeito de câmera cinematográfica em curvas fechadas sem tocar na física ou na
  // ordem de atualização que corrigiu o bug de jitter original (ver comentário mais abaixo).
  const cameraLagQuat = useRef(new THREE.Quaternion());
  const cameraLagInitialized = useRef(false);
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
    const ship = shipRef.current; if (!ship) return; const dt = Math.min(delta, 0.033);
    
    // Processar vetor de repulsão física elástica (afasta a nave de obstáculos após colisão)
    if (repulsionVelRef && repulsionVelRef.current && repulsionVelRef.current.lengthSq() > 0.01) {
      ship.position.addScaledVector(repulsionVelRef.current, dt);
      repulsionVelRef.current.lerp(v_temp1.current.set(0, 0, 0), dt * 7.5);
    }

    // Atualizar som do motor e turbo (Web Audio API)
    audioService.updateEngine(velocityRef.current, keysRef.current[' '] || keysRef.current.ArrowUp, localMuted);

    // Amortecimento dinâmico e consolidação de entradas de teclado + mouse/touch
    let kbX = 0;
    let kbY = 0;
    let kbRoll = 0;
    if (keysRef.current.w || (keysRef.current.ArrowUp && !abilityActive)) kbY += 1.0;
    if (keysRef.current.s || keysRef.current.ArrowDown) kbY -= 1.0;
    if (keysRef.current.ArrowLeft) kbX -= 1.0;
    if (keysRef.current.ArrowRight) kbX += 1.0;
    if (keysRef.current.a) kbRoll -= 2.2;
    if (keysRef.current.d) kbRoll += 2.2;

    // Se estiver em Pointer Lock (movimento relativo do mouse), amortecer targetPointerRef suavemente
    if (document.pointerLockElement) {
      const damping = Math.exp(-dt * 3.0); 
      targetPointerRef.current.x *= damping;
      targetPointerRef.current.y *= damping;
    }

    // Combina alvo do mouse/touch com entradas de teclado sem duplicar nem gerar saltos bruscos
    const desX = THREE.MathUtils.clamp(targetPointerRef.current.x + kbX, -1.5, 1.5);
    const desY = THREE.MathUtils.clamp(targetPointerRef.current.y + kbY, -1.5, 1.5);

    // Suavização ultra-fluida de 60fps para eliminar qualquer tremor/glitch no desktop ou celular
    pointerRef.current.x = THREE.MathUtils.lerp(pointerRef.current.x, desX, Math.min(1, dt * 10.0));
    pointerRef.current.y = THREE.MathUtils.lerp(pointerRef.current.y, desY, Math.min(1, dt * 10.0));
    
    // Zona morta mínima para evitar micro-oscilações
    if (Math.abs(pointerRef.current.x) < 0.001) pointerRef.current.x = 0;
    if (Math.abs(pointerRef.current.y) < 0.001) pointerRef.current.y = 0;

    // Atualizar a posição do retículo dinâmico no HUD (60 FPS)
    const vectorEl = flightVectorRef.current;
    if (vectorEl) {
      const xPx = (pointerRef.current.x / 1.5) * 44; 
      const yPx = -(pointerRef.current.y / 1.5) * 44;
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
      if (takeoffProgressRef.current !== 0) {
        ship.position.set(0, 0, 0);
        velocityRef.current = 0;
        baseQuat.current.identity();
        ship.quaternion.identity();
        movementDirRef.current.set(0, 0, -1);
        takeoffProgressRef.current = 0;
      }
      cameraLagInitialized.current = false;

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
    let rtr = kbRoll * transitionFactor; 
    
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
    // Time trial mode: duration/time is tracked instead of points score
    
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
        
        velocityRef.current = Math.max(20, velocityRef.current * 0.25);
        shakeRef.current = Math.max(0.6, 2.5 - (massStat / 120) * 1.5);
        
        const pushDir = v_pushDir.current.subVectors(ship.position, p.pos).normalize();
        if (pushDir.lengthSq() === 0) pushDir.set(0, 1, -1).normalize();
        
        // Ejeção geométrica instantânea + impulso de repulsão
        ship.position.copy(p.pos).addScaledVector(pushDir, minCDist + 8.0);
        if (repulsionVelRef && repulsionVelRef.current) {
          repulsionVelRef.current.copy(pushDir).multiplyScalar(130.0);
        }
        
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
          
          velocityRef.current = Math.max(25, velocityRef.current * 0.35);
          shakeRef.current = Math.max(0.3, 1.5 - (massStat / 120) * 1.1);
          createExplosion(s.pos, "#ffffff");
          
          const pushDir = v_pushDir.current.subVectors(ship.position, s.pos).normalize();
          if (pushDir.lengthSq() === 0) pushDir.set(0, 1, -1).normalize();

          ship.position.copy(s.pos).addScaledVector(pushDir, sDist + 4.0);
          if (repulsionVelRef && repulsionVelRef.current) {
            repulsionVelRef.current.copy(pushDir).multiplyScalar(85.0);
          }

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
        const aDist = 3.6 + a.scale * 0.9;
        // Fast-path: só executa física 3D pesada se o asteroide estiver realmente próximo do raio da nave
        if (absZDiff < aDist + 15 && Math.abs(a.pos.x - ship.position.x) < aDist + 15 && Math.abs(a.pos.y - ship.position.y) < aDist + 15) {
          const distSq = ship.position.distanceToSquared(a.pos);
          if (distSq < aDist * aDist) {
            cm = false;
            // Redução significativa de velocidade mantida ao colidir
            velocityRef.current = Math.max(30, velocityRef.current * 0.35);
            
            const pushDir = v_pushDir.current.subVectors(ship.position, a.pos).normalize();
            if (pushDir.lengthSq() === 0) pushDir.set(0, 1, -1).normalize();

            // Ejeção geométrica instantânea fora do raio de colisão do meteoro
            ship.position.copy(a.pos).addScaledVector(pushDir, aDist + 3.0);
            
            // Impulso de repulsão física elástica
            if (repulsionVelRef && repulsionVelRef.current) {
              repulsionVelRef.current.copy(pushDir).multiplyScalar(95.0);
            }

            if (canTakeDamage) {
              if (isCurrentlyBoosting && ["sparrow-03", "sparrow-06", "sparrow-17", "sparrow-20"].includes(currentShip.id)) { 
                createExplosion(a.pos, "#00ffea"); 
                playSimSound("shield_hit", localMuted); 
                collisionCooldownRef.current = 0.1;
              } else {
                shakeRef.current = Math.max(0.3, 1.5 - (massStat / 120) * 1.1); 
                createExplosion(ship.position, "#ff3a00");
                playSimSound("hull_hit", localMuted); 
                collisionCooldownRef.current = 0.35;
              }
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
              energyRef.current = Math.min(100, energyRef.current + 8); // Pequeno bônus de Turbo ao passar pelo aro
              velocityRef.current = Math.min(currentMaxSpeed * 1.25, velocityRef.current + 150); // Impulso de velocidade
              
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
    
    // Expand FOV dynamically at high speed and during turbo for intense hyperspeed parallax effect!
    const cam = state.camera as THREE.PerspectiveCamera;
    if (cam.fov !== undefined) {
      const targetFov = isCurrentlyBoosting ? 82.0 : 65.0 + Math.min(14.0, (speedFactor * 12.0));
      const nextFov = THREE.MathUtils.lerp(cam.fov, targetFov, dt * 6.0);
      if (Math.abs(cam.fov - nextFov) > 0.01) {
        cam.fov = nextFov;
        cam.updateProjectionMatrix();
      }
    }

    // Câmera posicionada ainda mais distante para enfatizar a escala e velocidade
    const targetSpaceZ = isBoost ? 60.0 : 40.0 + (speedFactor * 10.0);
    
    // Sensação de mergulho e guinada: a câmera balança na direção oposta ao movimento para dar profundidade
    const diveSwing = pointerRef.current.y * 14.0 * transitionFactor; 
    const yawSwing = -pointerRef.current.x * 16.0 * transitionFactor;  
    
    const spaceCamOffset = v_spaceCamOffset.current.set(yawSwing, 10.0 - diveSwing, targetSpaceZ);
    
    // Lerp the offset smoothly
    cameraOffset.current.lerpVectors(hangarCamOffset, spaceCamOffset, transitionFactor);

    // Orientação "atrasada" da câmera: NÃO mexe na posição/translação da nave (que continua
    // rígida, como antes) — só suaviza a rotação usada para orientar offset/up/lookAt, dando
    // um leve efeito de câmera cinematográfica ao entrar em curvas fechadas. Como isso roda
    // depois que a física da nave já se resolveu no frame (mesma ordem de sempre), não
    // reintroduz o bug de jitter que o "rigidly attach" original corrigiu.
    if (!cameraLagInitialized.current) {
      cameraLagQuat.current.copy(baseQuat.current);
      cameraLagInitialized.current = true;
    } else {
      cameraLagQuat.current.slerp(baseQuat.current, Math.min(1, dt * 9));
    }
    const camQuat = cameraLagQuat.current;

    const rco = v_rco.current.copy(cameraOffset.current).applyQuaternion(camQuat); 
    
    const targetCamPos = v_targetCamPos.current.copy(ship.position).add(rco);
    
    // Rigidly attach camera to prevent any "back and forth" lagging
    state.camera.position.copy(targetCamPos);
    
    // Smoothly transition UP vector
    const hangarUp = v_hangarUp.current.set(0, 1, 0);
    const spaceUp = v_spaceUp.current.set(0, 1, 0).applyQuaternion(camQuat);
    state.camera.up.copy(hangarUp.lerp(spaceUp, transitionFactor)).normalize();
 
    // Smoothly transition lookAt target
    const lookAtHangarVec = v_temp1.current.set(0, 0.1, -10).applyQuaternion(camQuat);
    const hangarLookAt = v_hangarLookAt.current.copy(ship.position).add(lookAtHangarVec);
    
    const lookAtSpaceVec = v_temp2.current.set(0, 0, -12).applyQuaternion(camQuat);
    const spaceLookAt = v_spaceLookAt.current.copy(ship.position).add(lookAtSpaceVec);
    
    state.camera.lookAt(hangarLookAt.lerp(spaceLookAt, transitionFactor));

    // Head-bob sutil de cockpit em alta velocidade - vibração contínua e pequena, separada
    // do shake de impacto abaixo (que é um evento pontual, não contínuo)
    if (!isHangarActive && transitionFactor > 0.98) {
      const bobStrength = speedFactor * (isBoost ? 1.6 : 1.0);
      if (bobStrength > 0.01) {
        const t = state.clock.elapsedTime;
        state.camera.position.y += Math.sin(t * 22.0) * 0.045 * bobStrength;
        state.camera.position.x += Math.sin(t * 14.5 + 1.3) * 0.03 * bobStrength;
      }
    }

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