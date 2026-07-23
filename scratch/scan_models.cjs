const fs = require('fs');
const path = require('path');

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

function parseGLB(file) {
  const filePath = path.join(publicDir, file);
  const buffer = fs.readFileSync(filePath);

  // GLB Header: magic (4), version (4), length (4)
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546C67) return null; // 'glTF'

  // Chunk 0: JSON
  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.readUInt32LE(16);
  if (chunkType !== 0x4E4F534A) return null; // 'JSON'

  const jsonStr = buffer.toString('utf8', 20, 20 + chunkLength);
  const json = JSON.parse(jsonStr);

  // Find min/max in accessors for positions
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  if (json.accessors) {
    json.accessors.forEach(acc => {
      if (acc.type === 'VEC3' && acc.min && acc.max) {
        minX = Math.min(minX, acc.min[0]);
        minY = Math.min(minY, acc.min[1]);
        minZ = Math.min(minZ, acc.min[2]);
        maxX = Math.max(maxX, acc.max[0]);
        maxY = Math.max(maxY, acc.max[1]);
        maxZ = Math.max(maxZ, acc.max[2]);
      }
    });
  }

  const dx = Math.abs(maxX - minX);
  const dy = Math.abs(maxY - minY);
  const dz = Math.abs(maxZ - minZ);
  const volume = dx * dy * dz;

  return {
    file,
    width: parseFloat(dx.toFixed(1)),
    height: parseFloat(dy.toFixed(1)),
    length: parseFloat(dz.toFixed(1)),
    volume: Math.round(volume),
    maxDim: parseFloat(Math.max(dx, dy, dz).toFixed(1))
  };
}

const results = files.map(parseGLB).filter(Boolean);
results.sort((a, b) => b.volume - a.volume);

console.log("\n=== REAL 3D MODEL VOLUME SCAN ===");
console.table(results);
fs.writeFileSync(path.join(__dirname, 'glb_volumes.json'), JSON.stringify(results, null, 2));
