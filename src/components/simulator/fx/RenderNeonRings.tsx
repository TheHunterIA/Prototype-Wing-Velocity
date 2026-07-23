import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function RenderNeonRings({ ringsRef, shipRef }: { ringsRef: React.MutableRefObject<any[]>, shipRef: React.MutableRefObject<THREE.Group | null> }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Criar a geometria apenas UMA VEZ e reutilizar em todos os aros para evitar Garbage Collection e lag de recriação de buffer WebGL
  const torusGeo = useMemo(() => new THREE.TorusGeometry(120, 2.6, 8, 32), []);
  const torusGlowGeo = useMemo(() => new THREE.TorusGeometry(120, 7.5, 8, 32), []);
 
  // Criar os materiais apenas UMA VEZ e reutilizar para evitar compilação repetida de Shaders na GPU
  const materials = useMemo(() => {
    return {
      green: new THREE.MeshStandardMaterial({
        color: "#10b981",
        emissive: "#10b981",
        emissiveIntensity: 12.0,
        toneMapped: false,
      }),
      purple: new THREE.MeshStandardMaterial({
        color: "#a855f7",
        emissive: "#a855f7",
        emissiveIntensity: 12.0,
        toneMapped: false,
      }),
      red: new THREE.MeshStandardMaterial({
        color: "#ef4444",
        emissive: "#ef4444",
        emissiveIntensity: 12.0,
        toneMapped: false,
      }),
    };
  }, []);

  // Materiais de brilho básico aditivo (100% emissivos e auto-iluminados) para a aura volumétrica externa
  const glowMaterials = useMemo(() => {
    return {
      green: new THREE.MeshBasicMaterial({
        color: "#10b981",
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      purple: new THREE.MeshBasicMaterial({
        color: "#c084fc", // Roxo ligeiramente mais claro para sobressair no espaço
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      red: new THREE.MeshBasicMaterial({
        color: "#f87171", // Vermelho mais vibrante para a linha de chegada
        transparent: true,
        opacity: 0.45,
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
