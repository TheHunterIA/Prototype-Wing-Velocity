import { useRef, useMemo, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";

interface SpaceshipProps {
  modelFile: string;
  textureFile: string;
  position?: [number, number, number];
  isLocked?: boolean;
}

interface SpaceshipViewProps {
  scene: THREE.Group;
  textureFile: string;
  position?: [number, number, number];
  isGlb?: boolean;
  isLocked?: boolean;
}

function SpaceshipView({
  scene,
  textureFile,
  position = [0, 0, 0],
  isGlb = false,
  isLocked = false
}: SpaceshipViewProps) {
  // Base color texture
  const texture = useTexture(textureFile);
  
  // PBR Maps (Common for all StarSparrow models)
  const pbrMaps = useTexture({
    normalMap: "/StarSparrow_Normal.webp",
    roughnessMap: "/StarSparrow_Roughness.webp",
    metalnessMap: "/StarSparrow_Metallic.webp",
    emissiveMap: "/StarSparrow_Emission.webp",
  });

  const groupRef = useRef<THREE.Group>(null);
  const internalRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(0);

  // Apply the texture to the cloned object to avoid side-effects on cache
  const { clonedObj, sharedMaterial } = useMemo(() => {
    const clone = scene.clone();

    // Configure textures
    const textures = [texture, ...Object.values(pbrMaps)];
    textures.forEach(t => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8; // 8x is high-performance and visually identical to 16x
      t.flipY = isGlb ? false : true;
      t.needsUpdate = true;
    });

    texture.colorSpace = THREE.SRGBColorSpace;

    // Create a single shared material instance for this ship
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      normalMap: pbrMaps.normalMap,
      roughnessMap: pbrMaps.roughnessMap,
      metalnessMap: pbrMaps.metalnessMap,
      emissiveMap: isLocked ? null : pbrMaps.emissiveMap,
      emissive: isLocked ? new THREE.Color(0x000000) : new THREE.Color(0xffffff),
      emissiveIntensity: isLocked ? 0 : 0.5,
      roughness: 1,
      metalness: 1,
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
      {!isLocked && (
        <>
          {/* Luz principal do topo e ligeiramente frontal em intensidade bem suave */}
          <directionalLight
            intensity={0.8}
            position={[0, 10, 6]}
            color="#ffffff"
          />
          {/* Luz focalizada traseira (Spotlight) azul tecnológica de destaque suave */}
          <spotLight
            position={[0, 8, -8]}
            angle={Math.PI / 2.5}
            penumbra={0.9}
            intensity={1.2}
            color="#3b82f6"
          />
          {/* Luz de preenchimento inferior sutil em tom âmbar quente */}
          <pointLight
            position={[0, -6, 0]}
            intensity={0.5}
            color="#ff7f1e"
            distance={30}
          />
        </>
      )}
    </group>
  );
}

function GLTFSpaceship({ modelFile, textureFile, position, isLocked }: SpaceshipProps) {
  const gltf = useLoader(GLTFLoader, modelFile);
  return <SpaceshipView scene={gltf.scene} textureFile={textureFile} position={position} isGlb={true} isLocked={isLocked} />;
}

function OBJSpaceship({ modelFile, textureFile, position, isLocked }: SpaceshipProps) {
  const obj = useLoader(OBJLoader, modelFile);
  return <SpaceshipView scene={obj} textureFile={textureFile} position={position} isGlb={false} isLocked={isLocked} />;
}

export default function Spaceship({ 
  modelFile, 
  textureFile, 
  position = [0, 0, 0],
  isLocked = false
}: SpaceshipProps) {
  const isGlb = modelFile.endsWith(".glb");
  if (isGlb) {
    return <GLTFSpaceship modelFile={modelFile} textureFile={textureFile} position={position} isLocked={isLocked} />;
  } else {
    return <OBJSpaceship modelFile={modelFile} textureFile={textureFile} position={position} isLocked={isLocked} />;
  }
}
