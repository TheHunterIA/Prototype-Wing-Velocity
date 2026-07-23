import * as THREE from "three";

const thrusterPositionsCache = new Map<string, [number, number, number][]>();

export function scanShipThrusterPositions(scene: THREE.Group, modelFile: string): [number, number, number][] {
  if (thrusterPositionsCache.has(modelFile)) {
    return thrusterPositionsCache.get(modelFile)!;
  }

  const box = new THREE.Box3().setFromObject(scene);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Escanear vértices dos 15% traseiros da profundidade em Z do modelo
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

  if (rearVertices.length === 0) {
    const fallback: [number, number, number][] = [[0, -0.3 * 0.015, zOffset]];
    thrusterPositionsCache.set(modelFile, fallback);
    return fallback;
  }

  // Verificar se há agrupamentos em X (ex: motores duplos à esquerda e à direita)
  const leftVertices = rearVertices.filter(v => v.x < -0.15);
  const rightVertices = rearVertices.filter(v => v.x > 0.15);

  let nozzles: [number, number, number][] = [];

  if (leftVertices.length > 20 && rightVertices.length > 20) {
    const avgYLeft = leftVertices.reduce((acc, v) => acc + v.y, 0) / leftVertices.length;
    const avgXLeft = leftVertices.reduce((acc, v) => acc + v.x, 0) / leftVertices.length;
    const avgYRight = rightVertices.reduce((acc, v) => acc + v.y, 0) / rightVertices.length;
    const avgXRight = rightVertices.reduce((acc, v) => acc + v.x, 0) / rightVertices.length;

    nozzles = [
      [avgXLeft * 0.015, avgYLeft * 0.015, zOffset],
      [avgXRight * 0.015, avgYRight * 0.015, zOffset]
    ];
  } else {
    const avgY = rearVertices.reduce((acc, v) => acc + v.y, 0) / rearVertices.length;
    nozzles = [[0, avgY * 0.015, zOffset]];
  }

  thrusterPositionsCache.set(modelFile, nozzles);
  return nozzles;
}
