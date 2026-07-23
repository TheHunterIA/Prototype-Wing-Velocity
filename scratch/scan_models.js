const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
const { Canvas, Image } = require('canvas');

// Mock browser globals for THREE GLTFLoader
global.window = global;
global.document = {
  createElement: (nodeName) => {
    if (nodeName === 'canvas') return new Canvas(1, 1);
    if (nodeName === 'img') return new Image();
    return {};
  },
  createElementNS: () => ({}),
};
global.URL = { createObjectURL: () => '' };

const publicDir = path.join(__dirname, '../public');

const files = [
  "NaveJogador.glb",
  "StarSparrow02.glb",
  "StarSparrow03.glb",
  "StarSparrow04.glb",
  "StarSparrow05.glb",
  "StarSparrow06.glb",
  "StarSparrow07.glb",
  "StarSparrow08.glb",
  "StarSparrow09.glb",
  "StarSparrow10.glb",
  "StarSparrow11.glb",
  "StarSparrow12.glb",
  "StarSparrow13.glb",
  "StarSparrow14.glb",
  "StarSparrow15.glb",
  "StarSparrow16.glb",
  "StarSparrow17.glb",
  "StarSparrow18.glb",
  "StarSparrow19.glb",
  "StarSparrow20.glb"
];

const loader = new GLTFLoader();
const results = [];

let pending = files.length;

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  loader.parse(arrayBuffer, '', (gltf) => {
    const scene = gltf.scene;
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Calculate volume of bounding box
    const volume = size.x * size.y * size.z;
    const maxDim = Math.max(size.x, size.y, size.z);

    // Find rear nozzles
    const rearCutoff = box.max.z - (box.max.z - box.min.z) * 0.15;
    const rearVertices = [];

    scene.traverse(child => {
      if (child.isMesh && child.geometry) {
        const geo = child.geometry;
        const posAttr = geo.attributes.position;
        if (!posAttr) return;
        child.updateMatrixWorld(true);
        const mat = child.matrixWorld;
        const v = new THREE.Vector3();

        for (let i = 0; i < posAttr.count; i++) {
          v.fromBufferAttribute(posAttr, i);
          v.applyMatrix4(mat);
          if (v.z >= rearCutoff) {
            rearVertices.push(v.clone());
          }
        }
      }
    });

    const clusters = [];
    rearVertices.forEach(v => {
      let matched = false;
      for (let c of clusters) {
        const dx = v.x - c.x;
        const dy = v.y - c.y;
        if (dx * dx + dy * dy < 55 * 55) {
          c.x += (v.x - c.x) / (c.count + 1);
          c.y += (v.y - c.y) / (c.count + 1);
          c.count++;
          matched = true;
          break;
        }
      }
      if (!matched) {
        clusters.push({ x: v.x, y: v.y, z: v.z, count: 1 });
      }
    });

    const validNozzles = clusters.filter(c => c.count >= 10);

    results.push({
      file,
      width: size.x.toFixed(1),
      height: size.y.toFixed(1),
      length: size.z.toFixed(1),
      maxDim: maxDim.toFixed(1),
      volume: Math.round(volume),
      nozzleCount: validNozzles.length
    });

    pending--;
    if (pending === 0) {
      finish();
    }
  }, (err) => {
    console.error("Error parsing", file, err);
    pending--;
    if (pending === 0) finish();
  });
});

function finish() {
  results.sort((a, b) => b.volume - a.volume);
  fs.writeFileSync(path.join(__dirname, 'scanned_ships_report.json'), JSON.stringify(results, null, 2));
  console.log("Analysis complete. Saved to scratch/scanned_ships_report.json");
}
