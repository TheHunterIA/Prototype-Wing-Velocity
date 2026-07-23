import fs from "fs";
import path from "path";

const publicDir = "c:/Users/Windows 10 2023/Downloads/Wing2/public";
const files = fs.readdirSync(publicDir).filter(f => f.endsWith(".glb"));

function parseGlb(filePath) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67) return null;
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString("utf8", 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);
  
  // Find BIN chunk
  let binBuf = null;
  let offset = 20 + jsonLen;
  while (offset < buf.length) {
    const chunkLen = buf.readUInt32LE(offset);
    const chunkType = buf.readUInt32LE(offset + 4);
    if (chunkType === 0x004e4942) { // "BIN\0"
      binBuf = buf.subarray(offset + 8, offset + 8 + chunkLen);
      break;
    }
    offset += 8 + chunkLen;
  }
  return { gltf, binBuf };
}

function getAccessorData(gltf, binBuf, accessorIndex) {
  const acc = gltf.accessors[accessorIndex];
  const bv = gltf.bufferViews[acc.bufferView];
  const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const count = acc.count;
  
  const result = [];
  if (acc.type === "VEC3" && acc.componentType === 5126) { // FLOAT
    for (let i = 0; i < count; i++) {
      const idx = byteOffset + i * 12;
      const x = binBuf.readFloatLE(idx);
      const y = binBuf.readFloatLE(idx + 4);
      const z = binBuf.readFloatLE(idx + 8);
      result.push([x, y, z]);
    }
  }
  return result;
}

const analysis = {};

files.forEach(file => {
  const parsed = parseGlb(path.join(publicDir, file));
  if (!parsed || !parsed.binBuf) return;
  const { gltf, binBuf } = parsed;
  
  let allPositions = [];
  gltf.meshes.forEach(m => {
    m.primitives.forEach(p => {
      if (p.attributes && p.attributes.POSITION !== undefined) {
        const pts = getAccessorData(gltf, binBuf, p.attributes.POSITION);
        allPositions.push(...pts);
      }
    });
  });

  if (allPositions.length === 0) return;

  // Find min/max Z
  let minZ = Infinity, maxZ = -Infinity;
  allPositions.forEach(([x, y, z]) => {
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  });

  // Filter rear vertices (near maxZ)
  const rearCutoff = maxZ - (maxZ - minZ) * 0.15;
  const rearPts = allPositions.filter(([x, y, z]) => z >= rearCutoff);

  // Group rear vertices into spatial clusters in XY plane (looking for cylindrical nozzles)
  const clusters = [];
  const radiusSq = 80 * 80; // Distance threshold for cluster

  rearPts.forEach(([x, y, z]) => {
    let found = false;
    for (let c of clusters) {
      const dx = x - c.centerX;
      const dy = y - c.centerY;
      if (dx * dx + dy * dy < radiusSq) {
        c.pts.push([x, y, z]);
        c.centerX = c.pts.reduce((sum, p) => sum + p[0], 0) / c.pts.length;
        c.centerY = c.pts.reduce((sum, p) => sum + p[1], 0) / c.pts.length;
        c.centerZ = c.pts.reduce((sum, p) => sum + p[2], 0) / c.pts.length;
        found = true;
        break;
      }
    }
    if (!found) {
      clusters.push({ centerX: x, centerY: y, centerZ: z, pts: [[x, y, z]] });
    }
  });

  // Filter out tiny noise clusters (< 15 points)
  const validClusters = clusters.filter(c => c.pts.length > 15).map(c => {
    // calculate radius spread around cluster center
    const radii = c.pts.map(([px, py]) => Math.sqrt((px - c.centerX) ** 2 + (py - c.centerY) ** 2));
    const avgRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
    return {
      x: Number(c.centerX.toFixed(2)),
      y: Number(c.centerY.toFixed(2)),
      z: Number(c.centerZ.toFixed(2)),
      ptsCount: c.pts.length,
      avgRadius: Number(avgRadius.toFixed(2))
    };
  });

  analysis[file] = {
    totalRearPts: rearPts.length,
    nozzleCount: validClusters.length,
    nozzles: validClusters
  };
});

fs.writeFileSync("c:/Users/Windows 10 2023/Downloads/Wing2/scratch/cylinder_analysis.json", JSON.stringify(analysis, null, 2));
console.log("Analysis saved to scratch/cylinder_analysis.json");
