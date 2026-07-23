import React, { useEffect, useMemo, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ShipData } from "../../types";
import { scanShipThrusterPositions } from "./thrusterUtils";

interface PilotShipViewProps {
  scene: THREE.Group;
  currentShip: ShipData;
  selectedColor: any;
  abilityActive: boolean;
  isHangarActive: boolean;
}

export function PilotShipView({
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
        mesh.castShadow = true;
        mesh.receiveShadow = true;
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
    const box = new THREE.Box3().setFromObject(clone); 
    const center = new THREE.Vector3(); 
    box.getCenter(center); 
    clone.children.forEach((child) => { child.position.sub(center); });
    return clone;
  }, [scene, texture, pbrMaps, currentShip.id]);

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

  const tiltX = !isHangarActive ? 0.03 : 0;
  const massScale = 0.015 * (1.0 + ((currentShip.massa || 2) - 2) * 0.04);
  return <primitive object={shipMesh} scale={massScale} rotation={[tiltX, Math.PI, 0]} />;
}

export function PilotShip({ 
  currentShip, 
  selectedColor, 
  abilityActive, 
  isHangarActive 
}: { 
  currentShip: ShipData; 
  selectedColor: any; 
  abilityActive: boolean; 
  isHangarActive: boolean; 
}) {
  const gltf = useLoader(GLTFLoader, currentShip.modelFile);
  return <PilotShipView scene={gltf.scene} currentShip={currentShip} selectedColor={selectedColor} abilityActive={abilityActive} isHangarActive={isHangarActive} />;
}

export function ShipThrusters({ 
  currentShip, 
  selectedColor, 
  keysRef, 
  abilityActive, 
  velocityRef, 
  takeoffProgressRef 
}: { 
  currentShip: ShipData; 
  selectedColor: any; 
  keysRef: React.RefObject<any>; 
  abilityActive: boolean; 
  velocityRef: React.RefObject<number>; 
  takeoffProgressRef?: React.RefObject<number>; 
}) {
  const gltf = useLoader(GLTFLoader, currentShip.modelFile);
  const scene = gltf.scene;
  const groupRef = useRef<THREE.Group>(null); 
  
  const mat1 = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const mat2 = useMemo(() => new THREE.MeshBasicMaterial({ color: selectedColor.colorHex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), [selectedColor.colorHex]);
  
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
