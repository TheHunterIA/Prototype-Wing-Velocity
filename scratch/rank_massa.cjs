const fs = require('fs');
const path = require('path');

const dataContent = fs.readFileSync(path.join(__dirname, '../src/data.ts'), 'utf8');

// Extract SHIPS_DATA array
const shipsMatch = dataContent.match(/export const SHIPS_DATA: ShipData\[\] = (\[[\s\S]*?\]);/);
if (!shipsMatch) {
  console.error("Could not find SHIPS_DATA");
  process.exit(1);
}

// Simple regex parser for ship objects
const shipBlocks = shipsMatch[1].split(/\{\s*id:/).slice(1);
const ships = shipBlocks.map(block => {
  const getVal = (key) => {
    const m = block.match(new RegExp(`${key}:\\s*["']?([^"',\\n\\r]+)["']?`));
    return m ? m[1].trim() : '';
  };
  return {
    id: getVal('id'),
    name: getVal('name'),
    class: getVal('class'),
    massa: parseInt(getVal('massa'), 10),
    velocidade: parseInt(getVal('velocidade'), 10),
    aceleracao: parseInt(getVal('aceleracao'), 10),
    turbo: parseInt(getVal('turbo'), 10),
    modelFile: getVal('modelFile')
  };
});

// Load glb_volumes.json if exists
let glbVolumes = {};
try {
  const vols = JSON.parse(fs.readFileSync(path.join(__dirname, 'glb_volumes.json'), 'utf8'));
  vols.forEach(v => { glbVolumes['/' + v.file] = v.volume; });
} catch (e) {}

ships.sort((a, b) => b.massa - a.massa);

console.log("\n=== RANKING DAS NAVES POR MASSA (DO CÓDIGO src/data.ts) ===");
ships.forEach((s, idx) => {
  const vol = glbVolumes[s.modelFile] ? glbVolumes[s.modelFile].toLocaleString() : 'N/A';
  console.log(`${idx + 1}. [Massa ${s.massa}] ${s.name} (${s.id}) - Modelo: ${s.modelFile} (Vol. 3D: ${vol})`);
});
