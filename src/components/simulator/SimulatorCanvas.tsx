import { useRef, useMemo, memo, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

const SceneVRAMCleaner = memo(function SceneVRAMCleaner() {
  const { scene } = useThree();
  useEffect(() => {
    return () => {
      VRAMManager.disposeScene(scene);
    };
  }, [scene]);
  return null;
});
import { Environment } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { ShipData, RouteData, GraphicsQuality } from "../../types";
import { GameEngine } from "./GameEngine";
import { RenderAsteroids } from "./environment/RenderAsteroids";
import { RenderNeonRings } from "./fx/RenderNeonRings";
import { SpeedParticles } from "./fx/SpeedParticles";
import { SpaceDust } from "./fx/SpaceDust";
import { RenderExplosions } from "./fx/RenderExplosions";
import { PilotShip } from "./environment/PilotShip";
import { ShipThrusters, ShipCrosshair } from "./environment/PilotShip";
import { PlanetModel } from "./environment/Planets";
import { DestroyedSatelliteModel } from "./environment/Satellites";
import { AAADeepSpaceBackground } from "../AAADeepSpaceBackground";
import { RenderBackgroundStars } from "./environment/DeepSpaceEnvironment";
import { VRAMManager } from "../../services/vramManager";
import { ShaderWarmup } from "../../services/shaderWarmup";

const PerformanceController = memo(function PerformanceController({
  graphicsQuality,
  setGraphicsQuality
}: {
  graphicsQuality: GraphicsQuality;
  setGraphicsQuality: (q: GraphicsQuality) => void;
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
      const avgFps = 1 / (times.reduce((a, b) => a + b, 0) / 180);
      let isManual = false;
      try {
        isManual = localStorage.getItem("graphicsQualityManual") === "true";
      } catch (e) {}

      if (!isManual) {
        if (graphicsQuality === "high" && avgFps < 35) {
          console.warn(`[AutoQuality] Média de FPS baixa (${avgFps.toFixed(1)}). Reduzindo para Qualidade Média.`);
          setGraphicsQuality("medium");
          frameTimesRef.current = [];
        } else if (graphicsQuality === "medium" && avgFps < 30) {
          console.warn(`[AutoQuality] Média de FPS muito baixa (${avgFps.toFixed(1)}). Reduzindo para Qualidade Baixa.`);
          setGraphicsQuality("low");
          frameTimesRef.current = [];
        }
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
      const targetFov = 45 + Math.min(absVelocity * 0.008, 15);
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.05);
      camera.updateProjectionMatrix();
    }
  });
  return null;
});

export const SimulatorCanvas = memo(function SimulatorCanvas(props: {
  graphicsQuality: GraphicsQuality;
  setGraphicsQuality: (q: GraphicsQuality) => void;
  velocityRef: React.MutableRefObject<number>;
  shipRef: React.MutableRefObject<THREE.Group | null>;
  selectedRoute: RouteData;
  isHangarActive: boolean;
  setIsHangarActive: (val: boolean) => void;
  takeoffProgressRef: React.MutableRefObject<number>;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  keysRef: React.MutableRefObject<any>;
  scoreRef: React.MutableRefObject<number>;
  multiplierRef: React.MutableRefObject<number>;
  planets: any[];
  asteroids: any[];
  satellites: any[];
  abilityActive: boolean;
  setAbilityActive: (val: boolean) => void;
  energyRef: React.MutableRefObject<number>;
  currentShip: ShipData;
  createExplosion: (pos: THREE.Vector3, color: string) => void;
  localMuted: boolean;
  shieldRef: React.MutableRefObject<number>;
  armorRef: React.MutableRefObject<number>;
  flightVectorRef: React.MutableRefObject<HTMLDivElement | null>;
  setArmorState: (val: number) => void;
  setShieldState: (val: number) => void;
  setIsGameOver: (val: boolean) => void;
  setIsVictory: (val: boolean) => void;
  trafficShips: any[];
  shakeRef: React.MutableRefObject<number>;
  explosionsRef: React.MutableRefObject<any[]>;
  selectedColor: any;
  countdown: number | null;
  stats: any;
  neonRingsRef: React.MutableRefObject<any[]>;
  customRouteDataRef: React.MutableRefObject<any>;
  asteroidsChangedRef: React.MutableRefObject<boolean>;
  repulsionVelRef: React.MutableRefObject<THREE.Vector3>;
  asteroidTexture: THREE.Texture | null;
  fallbackAsteroidTexture: THREE.Texture;
  baseQuat: React.MutableRefObject<THREE.Quaternion>;
  envPreset: string;
}) {
  const {
    graphicsQuality,
    setGraphicsQuality,
    velocityRef,
    shipRef,
    selectedRoute,
    isHangarActive,
    setIsHangarActive,
    takeoffProgressRef,
    pointerRef,
    keysRef,
    scoreRef,
    multiplierRef,
    planets,
    asteroids,
    satellites,
    abilityActive,
    setAbilityActive,
    energyRef,
    currentShip,
    createExplosion,
    localMuted,
    shieldRef,
    armorRef,
    flightVectorRef,
    setArmorState,
    setShieldState,
    setIsGameOver,
    setIsVictory,
    trafficShips,
    shakeRef,
    explosionsRef,
    selectedColor,
    countdown,
    stats,
    neonRingsRef,
    customRouteDataRef,
    asteroidsChangedRef,
    repulsionVelRef,
    asteroidTexture,
    fallbackAsteroidTexture,
    baseQuat,
    envPreset
  } = props;

  const activeQualityRef = useRef<GraphicsQuality>(graphicsQuality);

  const canvasGl = useMemo(() => {
    return activeQualityRef.current === "low"
      ? { alpha: false, antialias: false, powerPreference: "high-performance" as const, precision: "lowp" as const }
      : { logarithmicDepthBuffer: true, antialias: true, powerPreference: "high-performance" as const, precision: "highp" as const };
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      <Canvas 
        camera={{ position: [0, 6, 26], fov: 45, far: graphicsQuality === "low" ? 120000 : 200000 }} 
        shadows={graphicsQuality === "low" ? false : "soft"}
        dpr={graphicsQuality === "low" ? 0.75 : (graphicsQuality === "medium" ? 1.0 : [1, 1.25])}
        gl={canvasGl}
        onCreated={({ gl, scene, camera }) => {
          if (activeQualityRef.current === "low") {
            gl.setClearColor("#000000", 1);
          }
          ShaderWarmup.warmup(gl, scene, camera);
        }}
      >
        <SceneVRAMCleaner />
        <PerformanceController graphicsQuality={graphicsQuality} setGraphicsQuality={setGraphicsQuality} />
        <DynamicFOV velocityRef={velocityRef} />
        <SpeedParticles velocityRef={velocityRef} shipRef={shipRef} graphicsQuality={graphicsQuality} />
        <SpaceDust shipRef={shipRef} dustColor={selectedRoute.dustColor || "#5e6d8a"} graphicsQuality={graphicsQuality} />
        <color attach="background" args={[graphicsQuality === "low" ? "#000000" : (selectedRoute.ambientColor === "#09090b" ? "#000000" : "#020205")]} />
        {graphicsQuality !== "low" && (
          <fog attach="fog" args={[selectedRoute.fogColor || selectedRoute.ambientColor, 1000, 100000]} />
        )}
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} color={selectedRoute.ambientColor} />
          <hemisphereLight color={selectedRoute.sunLightColor || selectedRoute.ambientColor} groundColor="#080d1a" intensity={0.4} />
          {graphicsQuality !== "low" && (
            <Environment preset={envPreset as any} environmentIntensity={graphicsQuality === "medium" ? 0.4 : 0.65} />
          )}

          <directionalLight
            position={[18, 30, 10]}
            intensity={graphicsQuality === "low" ? 1.4 : 2.4}
            color={selectedRoute.sunLightColor || "#ffe8d0"}
            castShadow={graphicsQuality !== "low"}
            shadow-mapSize={graphicsQuality === "low" ? [256, 256] : [2048, 2048]}
            shadow-camera-near={1}
            shadow-camera-far={200}
            shadow-camera-left={-60}
            shadow-camera-right={60}
            shadow-camera-top={60}
            shadow-camera-bottom={-60}
            shadow-bias={-0.0005}
          />

          <directionalLight position={[-20, 10, -20]} intensity={1.2} color={selectedColor.colorHex} />
          <directionalLight position={[0, -25, 5]} intensity={0.4} color={selectedRoute.ambientColor} />
          <directionalLight position={[0, 10, 20]} intensity={0.8} color="#ffffff" />

          {!isHangarActive && (
            <>
              <AAADeepSpaceBackground selectedRoute={selectedRoute} />
              <RenderBackgroundStars starlightColor={selectedRoute.starlightColor} graphicsQuality={graphicsQuality} />
            </>
          )}
          
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
            repulsionVelRef={repulsionVelRef}
          />
          
          <RenderNeonRings ringsRef={neonRingsRef} shipRef={shipRef} />

          {planets.map(p => <PlanetModel key={p.id} planet={p} />)}
          <RenderExplosions explosionsRef={explosionsRef} />
          {satellites.map(s => <DestroyedSatelliteModel key={s.id} position={[s.pos.x, s.pos.y, s.pos.z]} rotation={s.rot} scale={s.scale} selectedRoute={selectedRoute} />)}
          <RenderAsteroids asteroids={asteroids} texture={asteroidTexture || fallbackAsteroidTexture} selectedRoute={selectedRoute} graphicsQuality={graphicsQuality} asteroidsChangedRef={asteroidsChangedRef} shipRef={shipRef} />

          <group ref={shipRef} visible={!isHangarActive}>
            <PilotShip currentShip={currentShip} selectedColor={selectedColor} abilityActive={abilityActive} isHangarActive={isHangarActive} graphicsQuality={graphicsQuality} />
            <ShipThrusters currentShip={currentShip} selectedColor={selectedColor} keysRef={keysRef} abilityActive={abilityActive} velocityRef={velocityRef} takeoffProgressRef={takeoffProgressRef} />
            <ShipCrosshair selectedColor={selectedColor} />

            <pointLight position={[0, 10, 15]} intensity={0.4} distance={100} decay={2.5} />
            <pointLight position={[0, -8, -15]} intensity={0.3} distance={80} decay={2.5} color={selectedColor.colorHex} />
            <directionalLight position={[5, 15, 15]} intensity={0.08} />
          </group>
        </Suspense>

        {graphicsQuality === "high" && (
          <EffectComposer key="sim-composer-high" multisampling={0}>
            <Bloom luminanceThreshold={0.82} mipmapBlur intensity={0.5} radius={0.65} />
            <ChromaticAberration offset={[0.00055, 0.00055]} radialModulation modulationOffset={0.18} />
            <Vignette eskil={false} offset={0.18} darkness={0.5} />
          </EffectComposer>
        )}

        {graphicsQuality === "medium" && (
          <EffectComposer key="sim-composer-medium" multisampling={0}>
            <Bloom luminanceThreshold={0.9} mipmapBlur intensity={0.3} radius={0.5} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
});
