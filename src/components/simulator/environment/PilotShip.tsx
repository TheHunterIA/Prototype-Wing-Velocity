import { useRef, useMemo, useEffect, memo, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { ShipData, GraphicsQuality } from "../../../types";

const thrusterPositionsCache = new Map<string, [number, number, number][]>();

export function scanShipThrusterPositions(scene: THREE.Group, modelFile: string): [number, number, number][] {
  if (thrusterPositionsCache.has(modelFile)) {
    return thrusterPositionsCache.get(modelFile)!;
  }

  const box = new THREE.Box3().setFromObject(scene);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const rearCutoff = box.max.z - (box.max.z - box.min.z) * 0.15;
  const rearVertices: THREE.Vector3[] = [];

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geom = mesh.geometry;
      if (geom && geom.attributes.position) {
        const posAttr = geom.attributes.position;
        const worldMat = mesh.matrixWorld;
        const v = new THREE.Vector3();

        for (let i = 0; i < posAttr.count; i++) {
          v.fromBufferAttribute(posAttr, i);
          v.applyMatrix4(worldMat);
          v.sub(center);

          if (v.z >= rearCutoff) {
            rearVertices.push(v.clone());
          }
        }
      }
    }
  });

  const zOffset = (box.max.z - center.z) * 0.015;

  let avgY = -0.3;
  if (rearVertices.length > 0) {
    avgY = rearVertices.reduce((acc, v) => acc + v.y, 0) / rearVertices.length;
  }

  const singleNozzle: [number, number, number][] = [
    [0, avgY * 0.015, zOffset]
  ];

  thrusterPositionsCache.set(modelFile, singleNozzle);
  return singleNozzle;
}

interface PilotShipViewProps {
  scene: THREE.Group;
  currentShip: ShipData;
  selectedColor: any;
  abilityActive: boolean;
  isHangarActive: boolean;
  graphicsQuality?: GraphicsQuality;
}

export function PilotShipView({
  scene,
  currentShip,
  selectedColor,
  abilityActive,
  isHangarActive,
  graphicsQuality = "high",
}: PilotShipViewProps) {
  const texture = useTexture(selectedColor.textureFile) as THREE.Texture;
  
  const pbrMaps = useTexture({
    normalMap: "/StarSparrow_Normal.webp",
    roughnessMap: "/StarSparrow_Roughness.webp",
    metalnessMap: "/StarSparrow_Metallic.webp",
    emissiveMap: "/StarSparrow_Emission.webp",
  });

  const isLow = graphicsQuality === "low";

  const shipMesh = useMemo(() => {
    const clone = scene.clone();

    const allTextures = isLow ? [texture] : [texture, ...Object.values(pbrMaps)];
    allTextures.forEach(t => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = isLow ? 1 : 16;
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
        mesh.castShadow = !isLow;
        mesh.receiveShadow = !isLow;
        mesh.material = isLow
          ? new THREE.MeshPhongMaterial({
               map: texture,
               color: new THREE.Color("#ffffff"),
               shininess: 30,
               specular: new THREE.Color("#334466"),
               transparent: true,
               opacity: 1.0,
               side: THREE.DoubleSide,
            })
          : new THREE.MeshStandardMaterial({
               map: texture, 
               normalMap: pbrMaps.normalMap,
               roughnessMap: pbrMaps.roughnessMap,
               metalnessMap: pbrMaps.metalnessMap,
               emissiveMap: pbrMaps.emissiveMap,
               emissive: new THREE.Color(0xffffff),
               emissiveIntensity: 0.25,
               roughness: 0.55, 
               metalness: 0.38,
               envMapIntensity: 0.35,
               transparent: true, 
               opacity: 1.0, 
               color: new THREE.Color("#ffffff"), 
               side: THREE.DoubleSide,
            });
      }
    });
    const box = new THREE.Box3().setFromObject(clone); const center = new THREE.Vector3(); box.getCenter(center); clone.children.forEach((child) => { child.position.sub(center); });
    return clone;
  }, [scene, texture, pbrMaps, currentShip.id, isLow]);

  useEffect(() => {
    const isCloaked = abilityActive && currentShip.id === "sparrow-03";
    shipMesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as any;
        if (mat) {
          if (mat.emissive) {
            const defaultEmissiveColor = mat.emissiveMap ? "#ffffff" : "#000000";
            mat.emissive.set(isCloaked ? "#00ffea" : defaultEmissiveColor);
          }
          if (mat.emissiveIntensity !== undefined) {
            const defaultEmissiveIntensity = mat.emissiveMap ? 0.15 : 0;
            mat.emissiveIntensity = isCloaked ? 0.8 : defaultEmissiveIntensity;
          }
          if (mat.roughness !== undefined) mat.roughness = isCloaked ? 0.9 : 0.45;
          if (mat.metalness !== undefined) mat.metalness = isCloaked ? 0.1 : 0.75;
          mat.opacity = isCloaked ? 0.25 : 1.0;
          mat.color.set(isCloaked ? "#00ffea" : "#ffffff");
          // Atualização dinâmica via Uniforms sem recompilar Shaders da GPU (elimina travamento de turbo/boost)
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
  isHangarActive, 
  graphicsQuality 
}: { 
  currentShip: ShipData, 
  selectedColor: any, 
  abilityActive: boolean, 
  isHangarActive: boolean, 
  graphicsQuality?: GraphicsQuality 
}) {
  const gltf = useLoader(GLTFLoader, currentShip.modelFile);
  return <PilotShipView scene={gltf.scene} currentShip={currentShip} selectedColor={selectedColor} abilityActive={abilityActive} isHangarActive={isHangarActive} graphicsQuality={graphicsQuality} />;
}

export function Takeoff3DShipView({ 
  scene, 
  currentShip, 
  selectedColor, 
  takeoffPercent, 
  takeoffStarted, 
  graphicsQuality 
}: { 
  scene: THREE.Group, 
  currentShip: ShipData, 
  selectedColor: any, 
  takeoffPercent: number, 
  takeoffStarted: boolean, 
  graphicsQuality?: GraphicsQuality 
}) {
  const texture = useTexture(selectedColor.textureFile) as THREE.Texture;
  const pbrMaps = useTexture({
    normalMap: "/StarSparrow_Normal.webp",
    roughnessMap: "/StarSparrow_Roughness.webp",
    metalnessMap: "/StarSparrow_Metallic.webp",
    emissiveMap: "/StarSparrow_Emission.webp",
  });

  const isLow = graphicsQuality === "low";

  const shipMesh = useMemo(() => {
    const clone = scene.clone();

    const allTextures = isLow ? [texture] : [texture, ...Object.values(pbrMaps)];
    allTextures.forEach(t => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = isLow ? 1 : 16;
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
        mesh.castShadow = !isLow;
        mesh.receiveShadow = !isLow;
        mesh.material = isLow
          ? new THREE.MeshLambertMaterial({
               map: texture,
               transparent: false,
               opacity: 1.0,
               color: new THREE.Color("#ffffff"),
               side: THREE.DoubleSide,
            })
          : new THREE.MeshStandardMaterial({
               map: texture, 
               normalMap: pbrMaps.normalMap,
               roughnessMap: pbrMaps.roughnessMap,
               metalnessMap: pbrMaps.metalnessMap,
               emissiveMap: pbrMaps.emissiveMap,
               emissive: new THREE.Color(0xffffff),
               emissiveIntensity: 0.15,
               roughness: 0.55, 
               metalness: 0.38, 
               envMapIntensity: 0.35,
               transparent: false, 
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
  }, [scene, texture, pbrMaps, currentShip.id, isLow]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const baseShipScale = 0.015 * (1.0 + ((currentShip.massa || 2) - 2) * 0.04);

    if (!takeoffStarted) {
      const idleHover = Math.sin(state.clock.elapsedTime * 2.0) * 0.12;
      groupRef.current.position.set(0, idleHover, 0);
      groupRef.current.scale.setScalar(baseShipScale);
      groupRef.current.rotation.set(0.02, Math.PI, Math.sin(state.clock.elapsedTime * 1.5) * 0.02);
    } else {
      const progress = Math.min(1.0, takeoffPercent / 100);
      const zPos = -progress * 175;
      const yPos = progress * 12;
      const scale = Math.max(0.0005, (1.0 - progress * 0.94) * baseShipScale);

      groupRef.current.position.set(0, yPos, zPos);
      groupRef.current.scale.setScalar(scale);
      groupRef.current.rotation.set(progress * 0.08, Math.PI, Math.sin(progress * Math.PI * 2) * 0.04);
    }
  });

  const thrusterOffsets = useMemo(() => scanShipThrusterPositions(scene, currentShip.modelFile), [scene, currentShip.modelFile]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={shipMesh} />
      {thrusterOffsets.map((o, idx) => (
        <pointLight 
          key={idx}
          position={[o[0] * 65, o[1] * 65, -5]} 
          intensity={takeoffStarted ? Math.max(25, 65 * (takeoffPercent / 35)) : 5} 
          distance={45} 
          color={selectedColor.colorHex} 
        />
      ))}
    </group>
  );
}

export function Takeoff3DShipLoader({ 
  currentShip, 
  selectedColor, 
  takeoffPercent, 
  takeoffStarted, 
  graphicsQuality 
}: { 
  currentShip: ShipData, 
  selectedColor: any, 
  takeoffPercent: number, 
  takeoffStarted: boolean, 
  graphicsQuality?: GraphicsQuality 
}) {
  const gltf = useLoader(GLTFLoader, currentShip.modelFile);
  return <Takeoff3DShipView scene={gltf.scene} currentShip={currentShip} selectedColor={selectedColor} takeoffPercent={takeoffPercent} takeoffStarted={takeoffStarted} graphicsQuality={graphicsQuality} />;
}

export function Takeoff3DShipCanvas({ 
  currentShip, 
  selectedColor, 
  takeoffPercent, 
  takeoffStarted, 
  graphicsQuality 
}: { 
  currentShip: ShipData, 
  selectedColor: any, 
  takeoffPercent: number, 
  takeoffStarted: boolean, 
  graphicsQuality?: GraphicsQuality 
}) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <Canvas 
        camera={{ position: [0, 2, 16], fov: 50 }}
        shadows={graphicsQuality === "low" ? false : "soft"}
        dpr={graphicsQuality === "low" ? 0.75 : [1, 1.5]}
        gl={graphicsQuality === "low" 
          ? { alpha: true, antialias: false, powerPreference: "high-performance", precision: "lowp" }
          : { alpha: true, antialias: true, powerPreference: "high-performance" }
        }
      >
        <ambientLight intensity={0.4} color="#8090b0" />
        <directionalLight position={[10, 15, 10]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-10, -5, -10]} intensity={0.6} color={selectedColor.colorHex} />
        <Suspense fallback={null}>
          <Takeoff3DShipLoader currentShip={currentShip} selectedColor={selectedColor} takeoffPercent={takeoffPercent} takeoffStarted={takeoffStarted} graphicsQuality={graphicsQuality} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export function BossShipModel({ position, rotation, scale }: { position: THREE.Vector3, rotation: [number, number, number], scale: number }) {
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

export function ShipThrusters({ 
  currentShip, 
  selectedColor, 
  keysRef, 
  abilityActive, 
  velocityRef, 
  takeoffProgressRef 
}: { 
  currentShip: ShipData, 
  selectedColor: any, 
  keysRef: React.RefObject<any>, 
  abilityActive: boolean, 
  velocityRef: React.RefObject<number>, 
  takeoffProgressRef?: React.RefObject<number> 
}) {
  const gltf = useLoader(GLTFLoader, currentShip.modelFile);
  const scene = gltf.scene;
  const groupRef = useRef<THREE.Group>(null); 
  
  // Material Shader Procedural de Plasma de Alta Tecnologia (Volumétrico com Mach Diamonds)
  const shaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(selectedColor.colorHex) },
        uSpeedRatio: { value: 0 },
        uBoost: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uSpeedRatio;
        uniform float uBoost;

        varying vec2 vUv;
        varying vec3 vNormal;

        float rand(vec2 co) {
          return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          float lengthPos = vUv.y; // 0.0 no bocal -> 1.0 na cauda
          float radialDist = abs(vUv.x - 0.5) * 2.0;

          // Ondas de choque supersônicas (Mach Diamonds)
          float shockWave = sin(lengthPos * 26.0 - uTime * (25.0 + uBoost * 25.0)) * 0.5 + 0.5;
          shockWave = pow(shockWave, 3.5);

          // Pulsação turbulenta do plasma
          float turbulence = sin(lengthPos * 45.0 + uTime * 35.0 + rand(vec2(vUv.x, uTime * 0.05)) * 0.15) * 0.5 + 0.5;

          // Núcleo incandescente branco no centro do fluxo
          float coreIntensity = pow(1.0 - radialDist, 3.0) * (1.0 - lengthPos * 0.65);

          // Mistura de cor base -> núcleo incandescente
          vec3 finalColor = mix(uColor, vec3(1.0, 1.0, 1.0), coreIntensity * 0.9);

          // Adiciona os anéis de energia Mach Diamonds
          finalColor += vec3(0.5, 0.8, 1.0) * shockWave * (1.0 - lengthPos) * (0.2 + uBoost * 0.6);

          // Suavização e transição suave nas extremidades (evita corte seco e artefatos)
          float tailFade = smoothstep(1.0, 0.05, lengthPos);
          float nozzleFade = smoothstep(0.0, 0.06, lengthPos);
          float edgeFade = smoothstep(1.0, 0.0, radialDist);

          float baseAlpha = (0.25 + uSpeedRatio * 0.65 + uBoost * 0.5) * (0.85 + turbulence * 0.15);
          float finalAlpha = tailFade * nozzleFade * edgeFade * baseAlpha;

          if (finalAlpha < 0.005) discard;

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, [selectedColor.colorHex]);

  // Geometria cônica imponente para o jato de plasma da nave espacial
  const thrusterGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.18, 0.85, 4.8, 32, 24, true);
    g.translate(0, 2.4, 0);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);

  const offsets = useMemo(() => scanShipThrusterPositions(scene, currentShip.modelFile), [scene, currentShip.modelFile]);
  const engineLightRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    if (!groupRef.current || !keysRef.current) return;
    
    const isBoost = keysRef.current[' '] || keysRef.current.ArrowUp || keysRef.current.Shift || keysRef.current.e || abilityActive;
    const speed = Math.max(0, velocityRef.current || 0);
    const isBraking = keysRef.current.ArrowDown;
    
    const speedRatio = Math.min(1.0, speed / 400.0);
    
    // Atualiza uniforms do Shader
    shaderMat.uniforms.uTime.value = state.clock.elapsedTime;
    shaderMat.uniforms.uSpeedRatio.value = isBraking ? 0 : speedRatio;
    shaderMat.uniforms.uBoost.value = isBoost ? 1.0 : 0.0;
    
    const targetScaleZ = isBoost ? 2.5 : (isBraking ? 0 : Math.min(2.0, 0.6 + speedRatio * 1.4));
    const targetScaleXY = isBoost ? 1.8 : (isBraking ? 0.15 : 1.25 + Math.sin(state.clock.elapsedTime * 30) * 0.1);

    groupRef.current.children.forEach(engine => {
       const flame = engine.children.find(c => c.name === "flameScale");
       if (flame) {
         flame.scale.z = THREE.MathUtils.lerp(flame.scale.z, targetScaleZ, delta * 12);
         flame.scale.x = THREE.MathUtils.lerp(flame.scale.x, targetScaleXY, delta * 18);
         flame.scale.y = THREE.MathUtils.lerp(flame.scale.y, targetScaleXY, delta * 18);
       }
    });

    if (engineLightRef.current) {
      const progress = takeoffProgressRef ? takeoffProgressRef.current : 1;
      const cameraClosenessFade = progress < 0.1 ? 0 : THREE.MathUtils.smoothstep(progress, 0.1, 0.95);
      const targetIntensity = isBraking ? 0 : (isBoost ? 1.8 : THREE.MathUtils.lerp(0.2, 1.0, speedRatio));
      engineLightRef.current.intensity = THREE.MathUtils.lerp(engineLightRef.current.intensity, targetIntensity * cameraClosenessFade, delta * 10);
    }
  });

  if (abilityActive && currentShip.id === "sparrow-03") return null;

  return (
    <group>
      <group ref={groupRef}>
        {offsets.map((o, i) => (
          <group key={i} position={o}>
            <group name="flameScale">
              <mesh geometry={thrusterGeo} material={shaderMat} />
            </group>
            <pointLight
              ref={i === 0 ? engineLightRef : undefined}
              position={[0, 0, 0.2]}
              color={selectedColor.colorHex}
              intensity={0}
              distance={3.0}
              decay={2}
            />
          </group>
        ))}
      </group>
    </group>
  );
}

export function ShipCrosshair({ selectedColor }: { selectedColor: any }) {
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
