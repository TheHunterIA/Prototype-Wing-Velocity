import { useRef, useMemo, useEffect, memo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";

// Mapas PBR compartilhados por todos os modelos StarSparrow. Definido como
// constante do módulo (fora do componente) para que o mesmo objeto de
// referência seja passado ao useTexture em toda renderização, evitando que
// o hook (e o useMemo que depende dele) seja invalidado a cada re-render —
// causa do soluço perceptível na rotação da nave no hangar.
const PBR_MAP_PATHS = {
  normalMap: "/StarSparrow_Normal.webp",
  roughnessMap: "/StarSparrow_Roughness.webp",
  metalnessMap: "/StarSparrow_Metallic.webp",
  emissiveMap: "/StarSparrow_Emission.webp",
} as const;

import { GraphicsQuality } from "../types";

interface SpaceshipProps {
  modelFile: string;
  textureFile: string;
  position?: [number, number, number];
  isLocked?: boolean;
  graphicsQuality?: GraphicsQuality;
}

interface SpaceshipViewProps {
  scene: THREE.Group;
  textureFile: string;
  position?: [number, number, number];
  isGlb?: boolean;
  isLocked?: boolean;
  graphicsQuality?: GraphicsQuality;
}

const SpaceshipView = memo(function SpaceshipView({
  scene,
  textureFile,
  position = [0, 0, 0],
  isGlb = false,
  isLocked = false,
  graphicsQuality = "high"
}: SpaceshipViewProps) {
  // Base color texture
  const texture = useTexture(textureFile);
  
  // PBR Maps (Common for all StarSparrow models)
  const pbrMaps = useTexture(PBR_MAP_PATHS);

  const groupRef = useRef<THREE.Group>(null);
  const internalRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(0);

  const isLow = graphicsQuality === "low";

  // Apply the texture to the cloned object to avoid side-effects on cache
  const { clonedObj, sharedMaterial } = useMemo(() => {
    const clone = scene.clone();

    // Configure textures
    const textures = isLow ? [texture] : [texture, ...Object.values(pbrMaps)];
    textures.forEach(t => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = isLow ? 1 : 8; // 1x anisotropy on low quality, 8x on high
      t.flipY = isGlb ? false : true;
      t.needsUpdate = true;
    });

    texture.colorSpace = THREE.SRGBColorSpace;

    // Create a single shared material instance for this ship
    const material = isLow
      ? new THREE.MeshLambertMaterial({
          map: texture,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshStandardMaterial({
          map: texture,
          normalMap: pbrMaps.normalMap,
          roughnessMap: pbrMaps.roughnessMap,
          metalnessMap: pbrMaps.metalnessMap,
          emissiveMap: isLocked ? null : pbrMaps.emissiveMap,
          emissive: isLocked ? new THREE.Color(0x000000) : new THREE.Color(0xffffff),
          emissiveIntensity: isLocked ? 0 : 0.25,
          roughness: 0.35,
          metalness: 0.82,
          envMapIntensity: 1.25,
          side: THREE.DoubleSide,
        });

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Compute vertex normals ONLY if they are not already defined by the model file
        if (mesh.geometry && mesh.geometry.attributes.position && !mesh.geometry.attributes.normal) {
          let hasNaN = false;
          const posArray = mesh.geometry.attributes.position.array;
          for (let i = 0; i < posArray.length; i++) {
            if (Number.isNaN(posArray[i])) {
              hasNaN = true;
              break;
            }
          }
          if (!hasNaN) {
            mesh.geometry.computeVertexNormals();
          }
        }

        mesh.material = material;
        mesh.castShadow = !isLow;
        mesh.receiveShadow = !isLow;
      }
    });

    // Center the group itself by using bounding box of the whole hierarchy
    // This is instant and keeps the relative placements of wings, cockpit, and thrusters fully intact!
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    clone.children.forEach((child) => {
      child.position.sub(center);
    });

    return { clonedObj: clone, sharedMaterial: material };
  }, [scene, texture, pbrMaps, isGlb, isLocked]);

  // Clean up material when clonedObj changes or unmounts to prevent memory leaks in GPU
  useEffect(() => {
    return () => {
      sharedMaterial.dispose();
    };
  }, [sharedMaterial]);

  // Animate the spaceship with complex floating and tilting motion
  useFrame((state) => {
    if (groupRef.current && internalRef.current) {
      const t = state.clock.elapsedTime;
      
      // Smooth entrance scale
      scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, 1, 0.05);
      
      // Base continuous rotation
      groupRef.current.rotation.y += 0.005;
      
      // Multi-axis floating (Harmonic motion)
      // Y-axis (Up/Down)
      groupRef.current.position.y = position[1] + Math.sin(t * 0.7) * 0.15;
      // X-axis (Side to Side)
      groupRef.current.position.x = position[0] + Math.cos(t * 0.5) * 0.05;
      
      // Mouse Parallax Tilting (Removido para que a nave não siga o cursor no hangar)
      internalRef.current.rotation.x = THREE.MathUtils.lerp(internalRef.current.rotation.x, 0, 0.05);
      internalRef.current.rotation.z = THREE.MathUtils.lerp(internalRef.current.rotation.z, 0, 0.05);

      // Idle Sway (Roll and Pitch)
      groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.02;
      
      // Subtle scale pulse (Breathing effect)
      const scalePulse = (1 + Math.sin(t * 1.5) * 0.005) * scaleRef.current;
      groupRef.current.scale.set(scalePulse, scalePulse, scalePulse);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={internalRef}>
        <primitive
          object={clonedObj}
          scale={0.015} // Appropriately scale the 1000-unit model to fit the scene
          position={[0, 0, 0]}
        />
      </group>
      {/* Luzes internas removidas — o Canvas do hangar já tem iluminação própria
          completa (6 fontes). Manter luzes aqui causava super-iluminação e tom
          incompatível com o simulador (9 fontes simultâneas). */}
    </group>
  );
});

function GLTFSpaceship({ modelFile, textureFile, position, isLocked, graphicsQuality }: SpaceshipProps) {
  const gltf = useLoader(GLTFLoader, modelFile);
  return <SpaceshipView scene={gltf.scene} textureFile={textureFile} position={position} isGlb={true} isLocked={isLocked} graphicsQuality={graphicsQuality} />;
}

function OBJSpaceship({ modelFile, textureFile, position, isLocked, graphicsQuality }: SpaceshipProps) {
  const obj = useLoader(OBJLoader, modelFile);
  return <SpaceshipView scene={obj} textureFile={textureFile} position={position} isGlb={false} isLocked={isLocked} graphicsQuality={graphicsQuality} />;
}

const Spaceship = memo(function Spaceship({
  modelFile, 
  textureFile, 
  position = [0, 0, 0],
  isLocked = false,
  graphicsQuality
}: SpaceshipProps) {
  const isGlb = modelFile.endsWith(".glb");
  if (isGlb) {
    return <GLTFSpaceship modelFile={modelFile} textureFile={textureFile} position={position} isLocked={isLocked} graphicsQuality={graphicsQuality} />;
  } else {
    return <OBJSpaceship modelFile={modelFile} textureFile={textureFile} position={position} isLocked={isLocked} graphicsQuality={graphicsQuality} />;
  }
});

export default Spaceship;
