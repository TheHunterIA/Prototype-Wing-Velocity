import { useRef, useMemo, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface ExplosionState { 
  id: string; 
  position: THREE.Vector3; 
  particles: { 
    pos: THREE.Vector3; 
    vel: THREE.Vector3; 
    scale: number; 
    color: string; 
  }[]; 
  life: number; 
}

const EXPLOSION_LIGHT_POOL_SIZE = 4;

export const RenderExplosions = memo(function RenderExplosions({ explosionsRef }: { explosionsRef: React.RefObject<ExplosionState[]> }) {
  const meshRef = useRef<THREE.Points>(null);
  const maxParticles = 3000;
  const lightPoolRef = useRef<(THREE.PointLight | null)[]>([]);

  // Pré-alocar arrays na CPU para reusar e evitar Garbage Collection
  const [positions, colors, sizes] = useMemo(() => {
    return [
      new Float32Array(maxParticles * 3),
      new Float32Array(maxParticles * 4),
      new Float32Array(maxParticles)
    ];
  }, []);

  // Guarda quantas partículas foram desenhadas no frame anterior, pra sabermos
  // se o buffer já está zerado e podemos pular o upload pra GPU por completo.
  const lastParticleCountRef = useRef(0);

  useFrame(() => {
    if (meshRef.current && explosionsRef.current) {
      const explosions = explosionsRef.current;

      // Nenhuma explosão ativa e o buffer já foi zerado antes: não há nada
      // novo pra subir pra GPU, então pulamos o frame inteiro.
      if (explosions.length === 0 && lastParticleCountRef.current === 0) {
        return;
      }

      let particleIdx = 0;

      explosions.forEach(exp => {
        exp.particles.forEach(part => {
          if (particleIdx < maxParticles) {
            const pIdx3 = particleIdx * 3;
            const pIdx4 = particleIdx * 4;

            positions[pIdx3] = part.pos.x;
            positions[pIdx3 + 1] = part.pos.y;
            positions[pIdx3 + 2] = part.pos.z;

            // Se r, g, b não estiverem definidos (fallback), usa cores padrão de fogo
            colors[pIdx4] = (part as any).r ?? 1.0;
            colors[pIdx4 + 1] = (part as any).g ?? 0.5;
            colors[pIdx4 + 2] = (part as any).b ?? 0.0;
            colors[pIdx4 + 3] = exp.life; // Alfa baseado no tempo de vida da explosão

            sizes[particleIdx] = part.scale * exp.life;
            particleIdx++;
          }
        });
      });

      const geom = meshRef.current.geometry;
      if (geom) {
        const posAttr = geom.attributes.position as THREE.BufferAttribute;
        const colAttr = geom.attributes.color as THREE.BufferAttribute;
        const sizAttr = geom.attributes.size as THREE.BufferAttribute;

        if (posAttr && colAttr && sizAttr) {
          posAttr.needsUpdate = true;
          colAttr.needsUpdate = true;
          sizAttr.needsUpdate = true;
        }
        geom.setDrawRange(0, particleIdx);
      }

      lastParticleCountRef.current = particleIdx;

      // Distribui as explosões mais "vivas" (life mais alto = mais recente/brilhante) entre
      // as luzes disponíveis do pool. As demais explosões continuam só com as partículas.
      const sorted = [...explosions].sort((a, b) => b.life - a.life).slice(0, EXPLOSION_LIGHT_POOL_SIZE);
      for (let i = 0; i < EXPLOSION_LIGHT_POOL_SIZE; i++) {
        const light = lightPoolRef.current[i];
        if (!light) continue;
        const exp = sorted[i];
        if (exp) {
          light.position.copy(exp.position);
          // Curva de intensidade: pico logo após a explosão, apaga suavemente com o life
          light.intensity = Math.max(0, exp.life) * 22;
          light.color.set(exp.particles[0]?.color || "#ff8a3d");
        } else {
          light.intensity = 0;
        }
      }
    }
  });

  return (
    <>
      {Array.from({ length: EXPLOSION_LIGHT_POOL_SIZE }).map((_, i) => (
        <pointLight
          key={i}
          ref={(el) => { lightPoolRef.current[i] = el; }}
          intensity={0}
          distance={40}
          decay={2}
        />
      ))}
      <points ref={meshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={maxParticles}
            array={positions}
            itemSize={3}
            usage={THREE.DynamicDrawUsage}
          />
          <bufferAttribute
            attach="attributes-color"
            count={maxParticles}
            array={colors}
            itemSize={4}
            usage={THREE.DynamicDrawUsage}
          />
          <bufferAttribute
            attach="attributes-size"
            count={maxParticles}
            array={sizes}
            itemSize={1}
            usage={THREE.DynamicDrawUsage}
          />
        </bufferGeometry>
        <pointsMaterial size={1} vertexColors transparent blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
    </>
  );
});
