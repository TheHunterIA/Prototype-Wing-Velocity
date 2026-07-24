import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DUST_VERTEX_SHADER, DUST_FRAGMENT_SHADER } from "../shaders/dustShader";

import { GraphicsQuality } from "../../../types";

export function SpaceDust({ shipRef, dustColor = "#5e6d8a", graphicsQuality }: { shipRef: React.RefObject<THREE.Group>, dustColor?: string, graphicsQuality?: GraphicsQuality }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = graphicsQuality === "low" ? 40 : (graphicsQuality === "medium" ? 600 : 1200);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 800;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 800;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 800;
    }
    return pos;
  }, [count]);

  const dustColorVec = useMemo(() => new THREE.Color(dustColor), [dustColor]);

  const uniforms = useMemo(() => ({
    uShipPosition: { value: new THREE.Vector3() },
    uTime: { value: 0 },
    uDustColor: { value: dustColorVec }
  }), [dustColorVec]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uDustColor.value.copy(dustColorVec);
      if (shipRef.current) {
        materialRef.current.uniforms.uShipPosition.value.copy(shipRef.current.position);
      }
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={DUST_VERTEX_SHADER}
        fragmentShader={DUST_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
