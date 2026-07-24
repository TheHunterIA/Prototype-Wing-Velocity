// --- GERENCIADOR DE OBJECT POOLING DE PARTÍCULAS (ZERO GC STUTTER) ---
// Pré-aloca e recicla objetos de efeitos visuais sem alocação dinâmica durante o voo

import * as THREE from "three";

export interface PoolParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: string;
  size: number;
  life: number;
}

export class ParticlePool {
  private static instance: ParticlePool;
  private pool: PoolParticle[] = [];
  private readonly maxParticles = 80;

  private constructor() {
    // Pré-alocar estaticamente todas as partículas na inicialização do jogo
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        color: "#ffffff",
        size: 1.0,
        life: 0.0,
      });
    }
  }

  public static getInstance(): ParticlePool {
    if (!ParticlePool.instance) {
      ParticlePool.instance = new ParticlePool();
    }
    return ParticlePool.instance;
  }

  /**
   * Obtém uma partícula inativa do reservatório estático sem alocar memória.
   */
  public spawn(pos: THREE.Vector3, vel: THREE.Vector3, color: string, size = 1.0, life = 1.0): PoolParticle | null {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.active = true;
        p.pos.copy(pos);
        p.vel.copy(vel);
        p.color = color;
        p.size = size;
        p.life = life;
        return p;
      }
    }
    return null;
  }

  /**
   * Recicla uma partícula ativa e marca para reúso imediato.
   */
  public recycle(p: PoolParticle) {
    p.active = false;
  }

  public getActiveParticles(): PoolParticle[] {
    return this.pool.filter((p) => p.active);
  }
}

export const particlePool = ParticlePool.getInstance();
