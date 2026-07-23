import { useRef, useMemo, useEffect, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RouteData } from "../../../types";
import { getRouteBehavior } from "../../../routes/routeBehaviors";
import { generateNormalMapFromAlbedo } from "../utils/textures";

const asteroidGeometryCache = new Map<string, THREE.DodecahedronGeometry>();

export const RenderAsteroids = memo(function RenderAsteroids({ 
  asteroids, 
  texture, 
  selectedRoute, 
  graphicsQuality, 
  asteroidsChangedRef 
}: { 
  asteroids: any[], 
  texture: THREE.Texture | null, 
  selectedRoute: RouteData, 
  graphicsQuality: "high" | "low", 
  asteroidsChangedRef: React.RefObject<boolean> 
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = asteroids.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Criar uma geometria de asteroide procedural altamente realista, craterada e irregular (formato de batata cósmica)
  const asteroidGeometry = useMemo(() => {
    if (asteroidGeometryCache.has(graphicsQuality)) {
      return asteroidGeometryCache.get(graphicsQuality)!;
    }
    const detail = graphicsQuality === "high" ? 2 : 0; // Subdivisão 0 no modo de baixa qualidade (Dodecaedro simples)
    const geo = new THREE.DodecahedronGeometry(1, detail);
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
      
      // Elongação assimétrica em cada eixo para criar o formato de batata realista (not-esférico)
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

  // Executar a rotação e animação contínua de todos os asteroides a cada frame para dar sensação de universo em movimento
  useFrame((state, delta) => {
    if (!meshRef.current) return;
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
    if (asteroidsChangedRef && asteroidsChangedRef.current) {
      (asteroidsChangedRef as any).current = false;
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
