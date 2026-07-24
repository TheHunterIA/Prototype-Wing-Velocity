import { useRef, useMemo, useEffect, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RouteData } from "../../../types";
import { getRouteBehavior } from "../../../routes/routeBehaviors";
import { generateNormalMapFromAlbedo } from "../utils/textures";

import { GraphicsQuality } from "../../../types";

const asteroidGeometryCache = new Map<string, THREE.BufferGeometry>();

export const RenderAsteroids = memo(function RenderAsteroids({ 
  asteroids, 
  texture, 
  selectedRoute, 
  graphicsQuality, 
  asteroidsChangedRef,
  shipRef
}: { 
  asteroids: any[], 
  texture: THREE.Texture | null, 
  selectedRoute: RouteData, 
  graphicsQuality: GraphicsQuality, 
  asteroidsChangedRef: React.RefObject<boolean>,
  shipRef?: React.MutableRefObject<THREE.Group | null>
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = asteroids.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const normalScaleVector = useMemo(() => new THREE.Vector2(1.1, 1.1), []);

  const asteroidGeometry = useMemo(() => {
    if (asteroidGeometryCache.has(graphicsQuality)) {
      return asteroidGeometryCache.get(graphicsQuality)!;
    }
    const detail = graphicsQuality === "high" ? 2 : (graphicsQuality === "medium" ? 1 : 0);
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

  const dysonScrapGeometry = useMemo(() => {
    if (asteroidGeometryCache.has("dysonScrap_" + graphicsQuality)) {
      return asteroidGeometryCache.get("dysonScrap_" + graphicsQuality)!;
    }
    const geo = new THREE.BoxGeometry(2.5, 0.4, 1.2);
    asteroidGeometryCache.set("dysonScrap_" + graphicsQuality, geo);
    return geo;
  }, [graphicsQuality]);

  const highwayGeometry = useMemo(() => {
    if (asteroidGeometryCache.has("highway_" + graphicsQuality)) {
      return asteroidGeometryCache.get("highway_" + graphicsQuality)!;
    }
    const geo = new THREE.OctahedronGeometry(1.2, 0);
    asteroidGeometryCache.set("highway_" + graphicsQuality, geo);
    return geo;
  }, [graphicsQuality]);

  const plasmaGeometry = useMemo(() => {
    if (asteroidGeometryCache.has("plasma_" + graphicsQuality)) {
      return asteroidGeometryCache.get("plasma_" + graphicsQuality)!;
    }
    const detail = graphicsQuality === "high" ? 1 : 0;
    const geo = new THREE.IcosahedronGeometry(1, detail);
    asteroidGeometryCache.set("plasma_" + graphicsQuality, geo);
    return geo;
  }, [graphicsQuality]);

  // Gerar mapa de normais procedurais apenas se houver textura carregada
  const asteroidNormalTexture = useMemo(() => {
    if (!texture) return null;
    return generateNormalMapFromAlbedo(texture as THREE.CanvasTexture, "asteroid_field");
  }, [texture]);

  // Propriedades visuais do material ajustadas dinamicamente com base no ambiente da rota
  const materialProps = useMemo(() => {
    const obstacleType = getRouteBehavior(selectedRoute.id).obstacleGeometryType;
    if (obstacleType === "dysonScrap") {
      return {
        color: new THREE.Color("#4a5568"),
        emissive: new THREE.Color("#1a202c"),
        emissiveIntensity: 0.1,
        roughness: 0.4,
        metalness: 0.85,
        useTexture: false
      };
    } else if (obstacleType === "plasma") {
      return {
        color: new THREE.Color("#93c5fd"),
        emissive: new THREE.Color("#3b82f6"),
        emissiveIntensity: 1.2,
        roughness: 0.2,
        metalness: 0.1,
        useTexture: false
      };
    } else if (selectedRoute.id === "route-ice-field" || selectedRoute.id === "route-saturn-rings") {
      return {
        color: new THREE.Color("#bae6fd"),
        emissive: new THREE.Color("#0284c7"),
        emissiveIntensity: 0.2,
        roughness: 0.3,
        metalness: 0.2,
        useTexture: true
      };
    } else if (selectedRoute.id === "route-supernova" || selectedRoute.id === "route-asteroid-alpha") {
      return {
        color: new THREE.Color("#fed7aa"),
        emissive: new THREE.Color("#ea580c"),
        emissiveIntensity: 0.15,
        roughness: 0.8,
        metalness: 0.3,
        useTexture: true
      };
    } else {
      return {
        color: new THREE.Color("#888888"),
        emissive: new THREE.Color("#000000"),
        emissiveIntensity: 0,
        roughness: 0.85,
        metalness: 0.15,
        useTexture: true
      };
    }
  }, [selectedRoute, dysonScrapGeometry, highwayGeometry, plasmaGeometry]);

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

  useEffect(() => {
    const t = setTimeout(() => {
      updateAsteroidMatrices();
    }, 50);
    return () => clearTimeout(t);
  }, [asteroids, count, geometryToUse]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;
    const shipPos = shipRef?.current ? shipRef.current.position : null;
    const shipZ = shipPos ? shipPos.z : 0;

    for (let i = 0; i < count; i++) {
      const a = asteroids[i];
      if (!a) continue;

      // Culling por distância: se o asteroide estiver a mais de 3500m da nave, pular recalculo de matriz
      if (shipPos && Math.abs(a.pos.z - shipZ) > 3500) continue;

      a.rot[0] += (a.rotSpeedX || 0.15) * dt;
      a.rot[1] += (a.rotSpeedY || 0.25) * dt;
      a.rot[2] += (a.rotSpeedZ || 0.10) * dt;

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
        normalScale={asteroidNormalTexture ? normalScaleVector : undefined}
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
