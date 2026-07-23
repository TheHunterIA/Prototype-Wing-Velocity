import React, { useRef, useMemo, Suspense } from "react";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ShipData } from "../../types";
import { scanShipThrusterPositions } from "./thrusterUtils";

function SingleNozzleFlame({
  unscaledNozzle,
  selectedColor,
  takeoffPercent,
  takeoffStarted
}: {
  unscaledNozzle: [number, number, number];
  selectedColor: any;
  takeoffPercent: number;
  takeoffStarted: boolean;
}) {
  const flamesGroupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const fireLightRef = useRef<THREE.PointLight>(null);

  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }), []);

  const outerMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: selectedColor.colorHex || "#00ffff",
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }), [selectedColor.colorHex]);

  const fireMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#ff4d00",
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }), []);

  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: selectedColor.colorHex || "#00ffff",
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }), [selectedColor.colorHex]);

  const coreGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.8, 5.0, 16);
    g.translate(0, 2.5, 0);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);

  const outerGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(1.6, 9.0, 16);
    g.translate(0, 4.5, 0);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);

  const fireGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(2.8, 15.0, 16);
    g.translate(0, 7.5, 0);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);

  const ring1Geo = useMemo(() => new THREE.TorusGeometry(1.2, 0.18, 8, 24), []);
  const ring2Geo = useMemo(() => new THREE.TorusGeometry(1.8, 0.22, 8, 24), []);
  const ring3Geo = useMemo(() => new THREE.TorusGeometry(2.5, 0.28, 8, 24), []);

  useFrame((state) => {
    if (!flamesGroupRef.current) return;

    const time = state.clock.elapsedTime;
    const progress = takeoffStarted ? Math.min(1.0, takeoffPercent / 100) : 0;
    const pulse = 0.88 + Math.sin(time * 48) * 0.12 + Math.cos(time * 32) * 0.08;

    // Animação de shock rings / mach diamonds
    if (ring1Ref.current) {
      ring1Ref.current.position.z = 1.8 + Math.sin(time * 24) * 0.4;
      ring1Ref.current.scale.setScalar(0.9 + Math.sin(time * 18) * 0.15);
    }
    if (ring2Ref.current) {
      ring2Ref.current.position.z = 4.2 + Math.sin(time * 24 + 1.0) * 0.6;
      ring2Ref.current.scale.setScalar(1.0 + Math.sin(time * 18 + 1.0) * 0.2);
    }
    if (ring3Ref.current) {
      ring3Ref.current.position.z = 7.0 + Math.sin(time * 24 + 2.0) * 0.8;
      ring3Ref.current.scale.setScalar(1.1 + Math.sin(time * 18 + 2.0) * 0.25);
    }

    if (!takeoffStarted) {
      // Estado de repouso no hangar / pré-decolagem
      flamesGroupRef.current.scale.set(
        0.65 * pulse,
        0.65 * pulse,
        0.85 * (0.85 + Math.sin(time * 12) * 0.15)
      );
      coreMat.opacity = 0.85;
      outerMat.opacity = 0.75;
      fireMat.opacity = 0.45;

      if (lightRef.current) {
        lightRef.current.intensity = 12 + Math.sin(time * 20) * 4;
      }
      if (fireLightRef.current) {
        fireLightRef.current.intensity = 8 + Math.sin(time * 15) * 3;
      }
    } else {
      // Estado de decolagem ativa (chama se expande massivamente)
      const flameLength = (2.2 + progress * 10.0) * (0.92 + Math.sin(time * 65) * 0.16);
      const flameThickness = (1.2 + progress * 2.8) * pulse;

      flamesGroupRef.current.scale.set(
        flameThickness,
        flameThickness,
        flameLength
      );

      coreMat.opacity = Math.min(1.0, 0.9 + progress * 0.1);
      outerMat.opacity = Math.min(1.0, 0.8 + progress * 0.2);
      fireMat.opacity = Math.min(1.0, 0.5 + progress * 0.5);

      if (lightRef.current) {
        lightRef.current.intensity = (12 + progress * 24) * pulse;
      }
      if (fireLightRef.current) {
        fireLightRef.current.intensity = (8 + progress * 16) * pulse;
      }
    }
  });

  return (
    <group position={unscaledNozzle}>
      <group ref={flamesGroupRef}>
        <mesh geometry={coreGeo} material={coreMat} />
        <mesh geometry={outerGeo} material={outerMat} />
        <mesh geometry={fireGeo} material={fireMat} />
        
        {/* Anéis de energia choque (Mach diamonds) */}
        <mesh ref={ring1Ref} geometry={ring1Geo} material={ringMat} />
        <mesh ref={ring2Ref} geometry={ring2Geo} material={ringMat} />
        <mesh ref={ring3Ref} geometry={ring3Geo} material={ringMat} />
      </group>

      {/* Luz principal do jato na cor personalizada */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 1.2]}
        color={selectedColor.colorHex || "#00ffff"}
        intensity={30}
        distance={90}
        decay={1.2}
      />
      
      {/* Luz secundária de combustão quente / fogo */}
      <pointLight
        ref={fireLightRef}
        position={[0, 0, 3.8]}
        color="#ff4d00"
        intensity={20}
        distance={60}
        decay={1.4}
      />
    </group>
  );
}

function TakeoffThrusterFlames({ 
  scene, 
  currentShip, 
  selectedColor, 
  takeoffPercent, 
  takeoffStarted 
}: { 
  scene: THREE.Group; 
  currentShip: ShipData; 
  selectedColor: any; 
  takeoffPercent: number; 
  takeoffStarted: boolean; 
}) {
  const rawOffsets = useMemo(() => scanShipThrusterPositions(scene, currentShip.modelFile), [scene, currentShip.modelFile]);
  
  const unscaledNozzles = useMemo(() => {
    return rawOffsets.map(o => [o[0] / 0.015, o[1] / 0.015, o[2] / 0.015] as [number, number, number]);
  }, [rawOffsets]);

  return (
    <group>
      {unscaledNozzles.map((nozzle, idx) => (
        <SingleNozzleFlame
          key={idx}
          unscaledNozzle={nozzle}
          selectedColor={selectedColor}
          takeoffPercent={takeoffPercent}
          takeoffStarted={takeoffStarted}
        />
      ))}
    </group>
  );
}

function Takeoff3DShipView({ 
  scene, 
  currentShip, 
  selectedColor, 
  takeoffPercent, 
  takeoffStarted 
}: { 
  scene: THREE.Group; 
  currentShip: ShipData; 
  selectedColor: any; 
  takeoffPercent: number; 
  takeoffStarted: boolean; 
}) {
  const texture = useTexture(selectedColor.textureFile) as THREE.Texture;
  const pbrMaps = useTexture({
    normalMap: "/StarSparrow_Normal.webp",
    roughnessMap: "/StarSparrow_Roughness.webp",
    metalnessMap: "/StarSparrow_Metallic.webp",
    emissiveMap: "/StarSparrow_Emission.webp",
  });

  const shipMesh = useMemo(() => {
    const clone = scene.clone();
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    pbrMaps.normalMap.flipY = false;
    pbrMaps.roughnessMap.flipY = false;
    pbrMaps.metalnessMap.flipY = false;
    pbrMaps.emissiveMap.flipY = false;

    pbrMaps.normalMap.needsUpdate = true;
    pbrMaps.roughnessMap.needsUpdate = true;
    pbrMaps.metalnessMap.needsUpdate = true;
    pbrMaps.emissiveMap.needsUpdate = true;

    // Centralizar a geometria do clone no seu próprio centro de massa
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    clone.children.forEach((child) => {
      child.position.sub(center);
    });

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.geometry) {
          mesh.geometry.computeVertexNormals();
        }
        mesh.material = new THREE.MeshStandardMaterial({
          map: texture,
          normalMap: pbrMaps.normalMap,
          roughnessMap: pbrMaps.roughnessMap,
          metalnessMap: pbrMaps.metalnessMap,
          emissiveMap: pbrMaps.emissiveMap,
          emissive: new THREE.Color(selectedColor.colorHex || "#00ffff"),
          emissiveIntensity: 0.8,
          roughness: 0.35,
          metalness: 0.65,
          side: THREE.DoubleSide,
        });
      }
    });

    return clone;
  }, [scene, texture, pbrMaps, selectedColor]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const baseShipScale = 0.015 * (1.0 + ((currentShip.massa || 2) - 2) * 0.04);

    if (!takeoffStarted) {
      // Estado em repouso no Hangar / Tela de Carregamento: nave estacionada no centro com leve flutuação
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

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={shipMesh} />
      <TakeoffThrusterFlames 
        scene={scene} 
        currentShip={currentShip} 
        selectedColor={selectedColor} 
        takeoffPercent={takeoffPercent} 
        takeoffStarted={takeoffStarted} 
      />
    </group>
  );
}

function Takeoff3DShipLoader({ 
  currentShip, 
  selectedColor, 
  takeoffPercent, 
  takeoffStarted 
}: { 
  currentShip: ShipData; 
  selectedColor: any; 
  takeoffPercent: number; 
  takeoffStarted: boolean; 
}) {
  const gltf = useLoader(GLTFLoader, currentShip.modelFile);
  return <Takeoff3DShipView scene={gltf.scene} currentShip={currentShip} selectedColor={selectedColor} takeoffPercent={takeoffPercent} takeoffStarted={takeoffStarted} />;
}

export function Takeoff3DShipCanvas({ 
  currentShip, 
  selectedColor, 
  takeoffPercent, 
  takeoffStarted 
}: { 
  currentShip: ShipData; 
  selectedColor: any; 
  takeoffPercent: number; 
  takeoffStarted: boolean; 
}) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <Canvas 
        camera={{ position: [0, 2, 16], fov: 50 }}
        gl={{ alpha: true }}
        onCreated={({ gl }) => gl.setClearColor("#000000", 0)}
      >
        <ambientLight intensity={0.7} color="#8090b0" />
        <directionalLight position={[10, 15, 10]} intensity={2.2} color="#ffffff" />
        <directionalLight position={[-10, -5, -10]} intensity={1.2} color={selectedColor.colorHex} />
        <Suspense fallback={null}>
          <Takeoff3DShipLoader currentShip={currentShip} selectedColor={selectedColor} takeoffPercent={takeoffPercent} takeoffStarted={takeoffStarted} />
        </Suspense>
      </Canvas>
    </div>
  );
}
