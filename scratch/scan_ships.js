import fs from "fs";
import path from "path";

const publicDir = "c:/Users/Windows 10 2023/Downloads/Wing2/public";
const files = fs.readdirSync(publicDir).filter(f => f.endsWith(".glb"));

function parseGlb(filePath) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67) return null; // "glTF"
  
  const jsonLen = buf.readUInt32LE(12);
  const jsonFormat = buf.readUInt32LE(16);
  if (jsonFormat !== 0x4e4f534a) return null; // "JSON"
  
  const jsonStr = buf.toString("utf8", 20, 20 + jsonLen);
  return JSON.parse(jsonStr);
}

const report = {};

files.forEach(file => {
  const fullPath = path.join(publicDir, file);
  try {
    const gltf = parseGlb(fullPath);
    if (!gltf) return;
    
    const nodes = gltf.nodes || [];
    const meshes = gltf.meshes || [];
    const accessors = gltf.accessors || [];
    
    const allNodeNames = nodes.map(n => n.name).filter(Boolean);
    const thrusterNodes = nodes.filter(n => {
      if (!n.name) return false;
      const name = n.name.toLowerCase();
      return name.includes("engine") || name.includes("thruster") || name.includes("exhaust") || 
             name.includes("nozzle") || name.includes("reactor") || name.includes("jet") || 
             name.includes("flame") || name.includes("glow") || name.includes("light") || name.includes("rear");
    });
    
    // Find mesh bounding boxes
    const meshBounds = [];
    meshes.forEach((m, mIdx) => {
      (m.primitives || []).forEach(p => {
        if (p.attributes && p.attributes.POSITION !== undefined) {
          const acc = accessors[p.attributes.POSITION];
          if (acc && acc.min && acc.max) {
            meshBounds.push({ meshName: m.name || `mesh_${mIdx}`, min: acc.min, max: acc.max });
          }
        }
      });
    });

    report[file] = {
      nodesCount: nodes.length,
      allNodeNames,
      thrusterCandidates: thrusterNodes,
      meshBounds
    };
  } catch (err) {
    report[file] = { error: err.message };
  }
});

console.log(JSON.stringify(report, null, 2));
