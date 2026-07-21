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
}

interface SpaceshipViewProps {
  scene: THREE.Group;
  textureFile: string;
  position?: [number, number, number];
  isGlb?: boolean;
}

function SpaceshipView({
  scene,
  textureFile,
  position = [0, 0, 0],
  isGlb = false
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
      emissiveMap: pbrMaps.emissiveMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.5,
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
    clone.position.sub(center);

    return { clonedObj: clone, sharedMaterial: material };
  }, [scene, texture, pbrMaps, isGlb]);

  // Clean up material when clonedObj changes or unmounts to prevent memory leaks in GPU
  useEffect(() => {
    return () => {
      sharedMaterial.dispose();
    };
  }, [sharedMaterial]);

  // Animate the spaceship with constant gentle rotation and floating motion
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Rotation on Y axis
      groupRef.current.rotation.y += delta * 0.15;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.4) * 0.05;
      // Soft vertical floating motion
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.6) * 0.6;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <primitive
        object={clonedObj}
        scale={0.015} // Appropriately scale the 1000-unit model to fit the scene
        position={[0, 0, 0]}
      />
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
    </group>
  );
}

function GLTFSpaceship({ modelFile, textureFile, position }: SpaceshipProps) {
  const gltf = useLoader(GLTFLoader, modelFile);
  return <SpaceshipView scene={gltf.scene} textureFile={textureFile} position={position} isGlb={true} />;
}

function OBJSpaceship({ modelFile, textureFile, position }: SpaceshipProps) {
  const obj = useLoader(OBJLoader, modelFile);
  return <SpaceshipView scene={obj} textureFile={textureFile} position={position} isGlb={false} />;
}

export default function Spaceship({ 
  modelFile, 
  textureFile, 
  position = [0, 0, 0] 
}: SpaceshipProps) {
  const isGlb = modelFile.endsWith(".glb");
  if (isGlb) {
    return <GLTFSpaceship modelFile={modelFile} textureFile={textureFile} position={position} />;
  } else {
    return <OBJSpaceship modelFile={modelFile} textureFile={textureFile} position={position} />;
  }
}
