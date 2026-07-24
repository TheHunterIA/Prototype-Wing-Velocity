// --- WEB WORKER DE FÍSICA E COLISÃO (THREAD SECUNDÁRIA) ---
// Processa cálculos de proximidade e reposicionamento de asteroides em paralelo

export interface AsteroidPhysicsData {
  id: number;
  x: number;
  y: number;
  z: number;
  scale: number;
}

export interface PhysicsWorkerInput {
  shipPos: { x: number; y: number; z: number };
  asteroids: AsteroidPhysicsData[];
}

export interface PhysicsWorkerResult {
  collidedId: number | null;
  wrappedAsteroids: { id: number; newX: number; newY: number; newZ: number }[];
}

self.onmessage = (event: MessageEvent<PhysicsWorkerInput>) => {
  const { shipPos, asteroids } = event.data;
  let collidedId: number | null = null;
  const wrappedAsteroids: { id: number; newX: number; newY: number; newZ: number }[] = [];

  const shipX = shipPos.x;
  const shipY = shipPos.y;
  const shipZ = shipPos.z;

  for (let i = 0; i < asteroids.length; i++) {
    const a = asteroids[i];
    const dx = a.x - shipX;
    const dy = a.y - shipY;
    const dz = a.z - shipZ;

    const absZDiff = Math.abs(dz);

    if (absZDiff < 2500) {
      const aDist = 3.6 + a.scale * 0.9;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < aDist * aDist) {
        collidedId = a.id;
      }
    } else if (dz > 25000) {
      // Reposicionar asteroides que ficaram longe para trás
      wrappedAsteroids.push({
        id: a.id,
        newX: shipX + (Math.random() - 0.5) * 40000,
        newY: shipY + (Math.random() - 0.5) * 15000,
        newZ: shipZ - (30000 + Math.random() * 20000)
      });
    }
  }

  const result: PhysicsWorkerResult = {
    collidedId,
    wrappedAsteroids
  };

  self.postMessage(result);
};

export {};
