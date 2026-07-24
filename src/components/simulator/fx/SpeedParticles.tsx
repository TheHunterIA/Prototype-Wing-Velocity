import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SPEED_PARTICLES_VERTEX_SHADER, SPEED_PARTICLES_FRAGMENT_SHADER } from "../shaders/speedShader";

import { GraphicsQuality } from "../../../types";

export function SpeedParticles({ velocityRef, shipRef, graphicsQuality }: { velocityRef: React.MutableRefObject<number>, shipRef: React.RefObject<THREE.Group>, graphicsQuality?: GraphicsQuality }) {
  const pointsRef = useRef<THREE.Points>(null); 
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = graphicsQuality === "low" ? 120 : (graphicsQuality === "medium" ? 450 : 900);
  
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 22 + Math.random() * 180;
      pos[i * 3] = Math.cos(angle) * dist;
      pos[i * 3 + 1] = Math.sin(angle) * dist;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 500;
      speed[i] = 1.2 + Math.random() * 2.5;
    }
    return [pos, speed];
  }, [count]);

  const uniforms = useMemo(() => ({
    uShipPosition: { value: new THREE.Vector3() },
    uTravelOffset: { value: 0 },
    uOpacity: { value: 0 }
  }), []);

  const travelOffsetRef = useRef(0);

  useFrame((state, dt) => {
    const absVelocity = Math.abs(velocityRef.current);
    travelOffsetRef.current += (absVelocity * 0.45 + 120) * dt;
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTravelOffset.value = travelOffsetRef.current;
      materialRef.current.uniforms.uOpacity.value = Math.min(0.65, 0.20 + absVelocity / 350);
      if (shipRef.current) {
        materialRef.current.uniforms.uShipPosition.value.copy(shipRef.current.position);
      }
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSpeed" count={count} array={speeds} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={SPEED_PARTICLES_VERTEX_SHADER}
        fragmentShader={SPEED_PARTICLES_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
