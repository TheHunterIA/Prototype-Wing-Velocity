import * as THREE from "three";

const SHARED_VEC1 = new THREE.Vector3();
const BLACK_HOLE_POS = new THREE.Vector3(0, 0, -20000);

export interface SatelliteStyle {
  metalColor: string;
  panelColor: string;
  lightColor: string;
}

export interface AsteroidMaterialProps {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  metalness: number;
  roughness: number;
  useTexture: boolean;
}

export interface PlanetMoonSpec {
  id: string;
  distance: number;
  radius: number;
  color: string;
  speed: number;
}

export interface PlanetSpec {
  id: string;
  pos: THREE.Vector3;
  radius: number;
  color: string;
  emissive?: string;
  moons?: PlanetMoonSpec[];
}

export interface RouteBehavior {
  satelliteStyle: SatelliteStyle;
  asteroidMaterialProps: AsteroidMaterialProps;
  obstacleGeometryType: "asteroid" | "dysonScrap" | "highway" | "plasma";
  planets: (totalDist: number) => PlanetSpec[];
  calculateRingPosition: (idx: number, seed: number, ringSpacing: number, selectedRoute: any) => THREE.Vector3;
  updateHUDStatus: (
    data: any,
    currEnv: any,
    envLabel: HTMLElement | null,
    envValueText: HTMLElement | null,
    envBarContainer: HTMLElement | null,
    envBarFill: HTMLElement | null
  ) => void;
  updateTick: (
    dt: number,
    data: any,
    currentPos: THREE.Vector3,
    velocityRef: React.MutableRefObject<number>,
    currentMaxSpeed: number,
    energyRef: React.MutableRefObject<number>,
    asteroids: any[],
    trafficShips: any[],
    neonRingsRef: any,
    timer: any,
    isCurrentlyBoosting: boolean,
    resetMultiplier: () => void,
    shakeRef: React.MutableRefObject<number>,
    createExplosion: (pos: THREE.Vector3, color: string) => void,
    playSimSound: (sound: string, muted: boolean) => void,
    localMuted: boolean,
    ship: THREE.Group
  ) => void;
}

const defaultSatelliteStyle: SatelliteStyle = {
  metalColor: "#888888",
  panelColor: "#224488",
  lightColor: "#ff4400"
};

const defaultAsteroidMaterialProps: AsteroidMaterialProps = {
  color: "#6b5d52",
  emissive: "#000000",
  emissiveIntensity: 0,
  metalness: 0.15,
  roughness: 0.9,
  useTexture: true
};

const randomValHelper = (seed: number, val: number) => {
  const x = Math.sin(seed + val + 1000) * 10000;
  return x - Math.floor(x);
};

export const routeBehaviors: Record<string, RouteBehavior> = {

  // ============================================================================
  // 1. VÔO DE CERTIFICAÇÃO — 1 Único Planeta: TERRA com 2 Luas
  // ============================================================================
  "route-certification": {
    satelliteStyle: defaultSatelliteStyle,
    asteroidMaterialProps: defaultAsteroidMaterialProps,
    obstacleGeometryType: "asteroid",
    planets: (totalDist) => [
      {
        id: "earth",
        pos: new THREE.Vector3(-12000, 4500, -totalDist * 0.50),
        radius: 4200,
        color: "#3b82f6",
        emissive: "#1d4ed8",
        moons: [
          { id: "luna", distance: 7200, radius: 320, color: "#9ca3af", speed: 0.08 },
          { id: "station-alpha", distance: 9500, radius: 180, color: "#60a5fa", speed: 0.14 }
        ]
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      let x = 0, y = 0;
      if (idx < 2) {
        x = 0; y = 0;
      } else {
        x = Math.sin((idx - 2) * 0.65) * 380 + (randomValHelper(seed, idx * 10) - 0.5) * 40;
        y = Math.cos((idx - 2) * 0.45) * 260 + (Math.sin(seed + idx * 11) - 0.5) * 40;
      }
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer) => {
      if (envLabel && envValueText && envBarContainer) {
        envLabel.innerText = currEnv.sectorStatus;
        envValueText.innerText = "TUTORIAL";
        envValueText.style.color = "#a1a1aa";
        envBarContainer.classList.add("hidden");
      }
    },
    updateTick: () => {}
  },

  // ============================================================================
  // 2. CINTURÃO DE ASTEROIDES ALPHA — 1 Único Planeta: MARTE com 2 Luas
  // ============================================================================
  "route-asteroid-alpha": {
    satelliteStyle: defaultSatelliteStyle,
    asteroidMaterialProps: defaultAsteroidMaterialProps,
    obstacleGeometryType: "asteroid",
    planets: (totalDist) => [
      {
        id: "mars",
        pos: new THREE.Vector3(-14000, 4800, -totalDist * 0.45),
        radius: 4500,
        color: "#c2410c",
        emissive: "#78350f",
        moons: [
          { id: "phobos", distance: 7500, radius: 240, color: "#78716c", speed: 0.18 },
          { id: "deimos", distance: 10200, radius: 180, color: "#a8a29e", speed: 0.11 }
        ]
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.75) * 580 + Math.sin(idx * 1.5) * 160 + (randomValHelper(seed, idx * 10) - 0.5) * 60;
      const y = Math.cos(idx * 0.60) * 420 + (Math.sin(seed + idx * 11) - 0.5) * 60;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer) => {
      if (envLabel && envValueText && envBarContainer) {
        envLabel.innerText = currEnv.sectorStatus;
        envValueText.innerText = currEnv.stable;
        envValueText.style.color = "#10b981";
        envBarContainer.classList.add("hidden");
      }
    },
    updateTick: () => {}
  },

  // ============================================================================
  // 3. VIA LÁCTEA EXPRESSA — 1 Único Planeta: ASTRAEA (OCEANO) com 2 Luas
  // ============================================================================
  "route-highway": {
    satelliteStyle: defaultSatelliteStyle,
    asteroidMaterialProps: defaultAsteroidMaterialProps,
    obstacleGeometryType: "highway",
    planets: (totalDist) => [
      {
        id: "ocean-world",
        pos: new THREE.Vector3(15000, -5500, -totalDist * 0.55),
        radius: 5200,
        color: "#0d9488",
        emissive: "#134e4a",
        moons: [
          { id: "tide-moon", distance: 8800, radius: 350, color: "#5eead4", speed: 0.08 },
          { id: "nereid", distance: 11500, radius: 220, color: "#99f6e4", speed: 0.13 }
        ]
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.35) * 750 + (randomValHelper(seed, idx * 10) - 0.5) * 50;
      const y = Math.cos(idx * 0.28) * 520 + (Math.sin(seed + idx * 11) - 0.5) * 50;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer, envBarFill) => {
      if (envLabel && envValueText && envBarContainer && envBarFill) {
        envLabel.innerText = currEnv.vacuumDraft;
        const active = data.draftActive;
        envValueText.innerText = active ? currEnv.enteringDraft : currEnv.seekingLine;
        envValueText.style.color = active ? "#10b981" : "#64748b";
        envBarContainer.classList.add("hidden");
      }
    },
    updateTick: (dt, data, currentPos, velocityRef, currentMaxSpeed, energyRef, _asteroids, trafficShips) => {
      let foundDraft = false;
      for (let ts of trafficShips) {
        SHARED_VEC1.subVectors(currentPos, ts.pos);
        const distSq = SHARED_VEC1.lengthSq();
        if (distSq < 460 * 460) {
          const isBehind = SHARED_VEC1.z > 0;
          const lateralOffsetSq = SHARED_VEC1.x * SHARED_VEC1.x + SHARED_VEC1.y * SHARED_VEC1.y;
          if (isBehind && lateralOffsetSq < 45 * 45) { foundDraft = true; break; }
        }
      }
      if (foundDraft) {
        data.draftActive = true;
        velocityRef.current = Math.min(currentMaxSpeed * 1.35, velocityRef.current + dt * 500);
        energyRef.current   = Math.min(100, energyRef.current + dt * 24);
      }
    }
  },

  // ============================================================================
  // 4. VÓRTICE DA NEBULOSA DE ÓRION — 1 Único Planeta: ORION PRIME (ROXO) com 3 Luas
  // ============================================================================
  "route-orion-nebula": {
    satelliteStyle: {
      metalColor: "#1e1b4b",
      panelColor: "#a855f7",
      lightColor: "#d8b4fe"
    },
    asteroidMaterialProps: {
      color: "#3b0764",
      emissive: "#d8b4fe",
      emissiveIntensity: 2.5,
      metalness: 0.3,
      roughness: 0.4,
      useTexture: false
    },
    obstacleGeometryType: "asteroid",
    planets: (totalDist) => [
      {
        id: "gas-giant-purple",
        pos: new THREE.Vector3(16000, -4000, -totalDist * 0.50),
        radius: 5800,
        color: "#a855f7",
        emissive: "#4c1d95",
        moons: [
          { id: "volcanic-moon", distance: 9500, radius: 400, color: "#dc2626", speed: 0.13 },
          { id: "ionized-moon", distance: 13000, radius: 260, color: "#c084fc", speed: 0.08 },
          { id: "plasma-shard", distance: 16500, radius: 180, color: "#f472b6", speed: 0.16 }
        ]
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 1.1) * 720 + Math.cos(idx * 0.5) * 220 + (randomValHelper(seed, idx * 10) - 0.5) * 100;
      const y = Math.sin(idx * 0.85) * 520 + (Math.sin(seed + idx * 11) - 0.5) * 100;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer, envBarFill) => {
      if (envLabel && envValueText && envBarContainer && envBarFill) {
        envLabel.innerText = currEnv.engineTemp;
        const temp = data.heat || 0;
        envValueText.innerText = `${Math.round(temp)}°C`;
        envValueText.style.color = temp > 80 ? "#ef4444" : temp > 50 ? "#f97316" : "#38bdf8";
        envBarContainer.classList.remove("hidden");
        envBarFill.className = `h-full transition-all duration-150 ${temp > 80 ? "bg-red-500" : temp > 50 ? "bg-orange-500" : "bg-sky-400"}`;
        envBarFill.style.width = `${temp}%`;
      }
    },
    updateTick: (dt, data, currentPos, velocityRef, _currentMaxSpeed, _energyRef, _asteroids, _trafficShips, _neonRingsRef, _timer, isCurrentlyBoosting, resetMultiplier, shakeRef, createExplosion, playSimSound, localMuted) => {
      if (isCurrentlyBoosting) {
        data.heat = Math.min(100, data.heat + dt * 25);
      } else {
        data.heat = Math.max(0, data.heat - dt * 8);
      }
      if (data.heat > 80) {
        data.warningActive = true;
        data.warningText = "TEMPERATURA DOS MOTORES CRÍTICA: DESATIVE TURBO!";
        velocityRef.current = Math.max(40, velocityRef.current - dt * 150);
        resetMultiplier();
        shakeRef.current = Math.max(shakeRef.current, 0.45);
        if (Math.random() < dt) {
          SHARED_VEC1.set((Math.random() - 0.5) * 4, -1, (Math.random() - 0.5) * 4).add(currentPos);
          createExplosion(SHARED_VEC1, "#ef4444");
          playSimSound("hull_hit", localMuted);
        }
      }
    }
  },

  // ============================================================================
  // 5. CAMPOS GLACIAIS DE EUROPA — 1 Único Planeta: EUROPA com 2 Luas
  // ============================================================================
  "route-ice-field": {
    satelliteStyle: {
      metalColor: "#bae6fd",
      panelColor: "#e0f2fe",
      lightColor: "#38bdf8"
    },
    asteroidMaterialProps: {
      color: "#e0f2fe",
      emissive: "#0284c7",
      emissiveIntensity: 1.0,
      metalness: 0.1,
      roughness: 0.1,
      useTexture: true
    },
    obstacleGeometryType: "asteroid",
    planets: (totalDist) => [
      {
        id: "europa",
        pos: new THREE.Vector3(-14000, 5000, -totalDist * 0.45),
        radius: 4800,
        color: "#e0f2fe",
        emissive: "#0284c7",
        moons: [
          { id: "ice-shard", distance: 8000, radius: 280, color: "#bae6fd", speed: 0.17 },
          { id: "cryo-core", distance: 11000, radius: 200, color: "#7dd3fc", speed: 0.11 }
        ]
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.85) * 620 + (randomValHelper(seed, idx * 10) - 0.5) * 80;
      const y = Math.cos(idx * 0.85) * 480 + (Math.sin(seed + idx * 11) - 0.5) * 80;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer, envBarFill) => {
      if (envLabel && envValueText && envBarContainer && envBarFill) {
        envLabel.innerText = currEnv.iceAccumulated;
        const iceVal = data.ice || 0;
        envValueText.innerText = `${Math.round(iceVal)}%`;
        envValueText.style.color = iceVal > 65 ? "#ef4444" : iceVal > 30 ? "#38bdf8" : "#e2e8f0";
        envBarContainer.classList.remove("hidden");
        envBarFill.className = `h-full transition-all duration-150 ${iceVal > 65 ? "bg-red-500 animate-pulse" : "bg-sky-400"}`;
        envBarFill.style.width = `${iceVal}%`;
      }
    },
    updateTick: (dt, data, currentPos, _velocityRef, _currentMaxSpeed, _energyRef, _asteroids, _trafficShips, neonRingsRef) => {
      let nearRing = false;
      if (neonRingsRef && neonRingsRef.current) {
        for (let r of neonRingsRef.current) {
          if (!r.passed && currentPos.distanceToSquared(r.pos) < 220 * 220) { nearRing = true; break; }
        }
      }
      if (nearRing) { data.ice = Math.max(0, data.ice - dt * 250); }
      else { data.ice = Math.min(100, data.ice + dt * 5.8); }
      if (data.ice > 65) {
        data.warningActive = true;
        data.warningText = `PROPULSORES MANOBRA CONGELADOS (${Math.round(data.ice)}%): CONTROLE LENTO`;
      }
    }
  },

  // ============================================================================
  // 6. SILÊNCIO DO VAZIO — 1 Único Planeta: NOXUS (SOMBRIO) com 2 Luas
  // ============================================================================
  "route-void": {
    satelliteStyle: defaultSatelliteStyle,
    asteroidMaterialProps: defaultAsteroidMaterialProps,
    obstacleGeometryType: "asteroid",
    planets: (totalDist) => [
      {
        id: "noxus",
        pos: new THREE.Vector3(16000, 7000, -totalDist * 0.60),
        radius: 4200,
        color: "#475569",
        emissive: "#1e293b",
        moons: [
          { id: "umbra", distance: 7500, radius: 240, color: "#94a3b8", speed: 0.12 },
          { id: "eclipse-fragment", distance: 10500, radius: 160, color: "#cbd5e1", speed: 0.18 }
        ]
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.50) * 1500 + (randomValHelper(seed, idx * 10) - 0.5) * 100;
      const y = Math.cos(idx * 0.40) * 1100 + (Math.sin(seed + idx * 11) - 0.5) * 100;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer, envBarFill) => {
      if (envLabel && envValueText && envBarContainer && envBarFill) {
        envLabel.innerText = currEnv.oxygenFuel;
        const fuelVal = data.fuel || 100;
        envValueText.innerText = `${Math.round(fuelVal)}%`;
        envValueText.style.color = fuelVal < 28 ? "#ef4444" : "#34d399";
        envBarContainer.classList.remove("hidden");
        envBarFill.className = `h-full transition-all duration-150 ${fuelVal < 28 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`;
        envBarFill.style.width = `${fuelVal}%`;
      }
    },
    updateTick: (dt, data, _currentPos, velocityRef, _currentMaxSpeed, _energyRef, _asteroids, _trafficShips, _neonRingsRef, _timer, _isCurrentlyBoosting, _resetMultiplier, shakeRef, _createExplosion, playSimSound, localMuted) => {
      data.fuel = Math.max(0, data.fuel - dt * 5.5);
      if (data.fuel < 28) {
        data.warningActive = true;
        data.warningText = `🔴 RESERVA DE O2 CRÍTICA: ${Math.round(data.fuel)}%! ATRAVESSAR AROS RECARREGA`;
        if (data.fuel <= 0) {
          velocityRef.current = Math.max(10, velocityRef.current - dt * 250);
          shakeRef.current = Math.max(shakeRef.current, 0.4);
          if (Math.random() < dt) { playSimSound("hull_hit", localMuted); }
        }
      }
    }
  },

  // ============================================================================
  // 7. ANÉIS TÁTICOS DE SATURNO — 1 Único Planeta: SATURNO com 4 Luas
  // ============================================================================
  "route-saturn-rings": {
    satelliteStyle: defaultSatelliteStyle,
    asteroidMaterialProps: {
      color: "#e0f2fe",
      emissive: "#38bdf8",
      emissiveIntensity: 1.2,
      metalness: 0.2,
      roughness: 0.15,
      useTexture: true
    },
    obstacleGeometryType: "asteroid",
    planets: (totalDist) => [
      {
        id: "saturn",
        pos: new THREE.Vector3(0, 7000, -totalDist * 0.65),
        radius: 6500,
        color: "#fef08a",
        emissive: "#854d0e",
        moons: [
          { id: "titan", distance: 11000, radius: 500, color: "#d97706", speed: 0.06 },
          { id: "enceladus", distance: 15000, radius: 280, color: "#e0f2fe", speed: 0.10 },
          { id: "mimas", distance: 19000, radius: 180, color: "#94a3b8", speed: 0.14 },
          { id: "rhea", distance: 23000, radius: 320, color: "#cbd5e1", speed: 0.04 }
        ]
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.95) * 880 + (randomValHelper(seed, idx * 10) - 0.5) * 90;
      const y = Math.cos(idx * 0.95) * 680 + (Math.sin(seed + idx * 11) - 0.5) * 90;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, _currEnv, envLabel, envValueText, envBarContainer) => {
      if (envLabel && envValueText && envBarContainer) {
        envLabel.innerText = "ALINHAMENTO COM ANÉIS";
        const isOut = data.warningActive;
        envValueText.innerText = isOut ? "FORA DA TRILHA" : "ALINHADO";
        envValueText.style.color = isOut ? "#ef4444" : "#10b981";
        envBarContainer.classList.add("hidden");
      }
    },
    updateTick: (dt, data, currentPos, velocityRef, _currentMaxSpeed, _energyRef, _asteroids, _trafficShips, _neonRingsRef, _timer, _isCurrentlyBoosting, resetMultiplier, shakeRef, createExplosion, playSimSound, localMuted) => {
      const lateralDist = Math.sqrt(currentPos.x * currentPos.x + currentPos.y * currentPos.y);
      if (lateralDist > 300) {
        data.warningActive = true;
        data.warningText = "FORA DA TRILHA DE POEIRA! ATRITO CORROSIVO";
        velocityRef.current = Math.max(40, velocityRef.current - dt * 180);
        resetMultiplier();
        shakeRef.current = Math.max(shakeRef.current, 0.9);
        if (Math.random() < dt * 4) {
          SHARED_VEC1.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 2).add(currentPos);
          createExplosion(SHARED_VEC1, "#3b82f6");
          playSimSound("shield_hit", localMuted);
        }
      }
    }
  },

  // ============================================================================
  // 8. TORMENTA ENERGÉTICA (PLASMA) — 1 Único Planeta: MAGNETAR com 2 Luas
  // ============================================================================
  "route-plasma": {
    satelliteStyle: {
      metalColor: "#4c1d95",
      panelColor: "#8b5cf6",
      lightColor: "#c084fc"
    },
    asteroidMaterialProps: {
      color: "#2e1065",
      emissive: "#8b5cf6",
      emissiveIntensity: 3.0,
      metalness: 0.2,
      roughness: 0.5,
      useTexture: false
    },
    obstacleGeometryType: "plasma",
    planets: (totalDist) => [
      {
        id: "magnetic-world",
        pos: new THREE.Vector3(-15000, -5000, -totalDist * 0.50),
        radius: 5000,
        color: "#7c3aed",
        emissive: "#4c1d95",
        moons: [
          { id: "charged-moon-a", distance: 8000, radius: 320, color: "#a78bfa", speed: 0.20 },
          { id: "charged-moon-b", distance: 11000, radius: 200, color: "#ddd6fe", speed: 0.12 }
        ]
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 1.35) * 820 + (randomValHelper(seed, idx * 10) - 0.5) * 160;
      const y = Math.cos(idx * 1.10) * 650 + (Math.sin(seed + idx * 11) - 0.5) * 160;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer) => {
      if (envLabel && envValueText && envBarContainer) {
        envLabel.innerText = currEnv.empDischarge;
        const active = data.controlGlitched;
        envValueText.innerText = active ? currEnv.reversal : currEnv.normal;
        envValueText.style.color = active ? "#ef4444" : "#10b981";
        envBarContainer.classList.add("hidden");
      }
    },
    updateTick: (dt, data) => {
      data.plasmaTimer -= dt;
      if (data.plasmaTimer <= 0) { data.plasmaTimer = 14.0; }
      if (data.plasmaTimer < 3.5) {
        data.controlGlitched = true;
        data.warningActive = true;
        data.warningText = "⚡ POLARIDADE REVERSA: CONTROLES DE MANOBRA INVERTIDOS!";
      }
    }
  },

  // ============================================================================
  // 9. REMANESCENTE DE SUPERNOVA — 1 Único Planeta: IGNIS com 2 Luas
  // ============================================================================
  "route-supernova": {
    satelliteStyle: {
      metalColor: "#292524",
      panelColor: "#78716c",
      lightColor: "#ef4444"
    },
    asteroidMaterialProps: {
      color: "#1c1917",
      emissive: "#ef4444",
      emissiveIntensity: 4.5,
      metalness: 0.1,
      roughness: 0.9,
      useTexture: false
    },
    obstacleGeometryType: "asteroid",
    planets: (totalDist) => [
      {
        id: "scorched-world",
        pos: new THREE.Vector3(14000, -4000, -totalDist * 0.45),
        radius: 4600,
        color: "#ea580c",
        emissive: "#7c2d12",
        moons: [
          { id: "cinder-moon", distance: 7500, radius: 300, color: "#f97316", speed: 0.22 },
          { id: "magma-shard", distance: 10500, radius: 180, color: "#ef4444", speed: 0.14 }
        ]
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 1.2) * 800 + Math.cos(idx * 2.1) * 200 + (randomValHelper(seed, idx * 10) - 0.5) * 140;
      const y = Math.sin(idx * 1.4) * 620 + (Math.sin(seed + idx * 11) - 0.5) * 140;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer, envBarFill) => {
      if (envLabel && envValueText && envBarContainer && envBarFill) {
        envLabel.innerText = currEnv.solarShockwave;
        const timerVal = data.shockwaveTimer || 15;
        envValueText.innerText = `${timerVal.toFixed(1)}s`;
        envValueText.style.color = timerVal < 4.5 ? "#ef4444" : "#f59e0b";
        envBarContainer.classList.remove("hidden");
        envBarFill.className = `h-full transition-all duration-150 ${timerVal < 4.5 ? "bg-red-500 animate-pulse" : "bg-amber-500"}`;
        envBarFill.style.width = `${(timerVal / 15.0) * 100}%`;
      }
    },
    updateTick: (dt, data, currentPos, velocityRef, _currentMaxSpeed, _energyRef, asteroids, _trafficShips, _neonRingsRef, _timer, _isCurrentlyBoosting, resetMultiplier, shakeRef, createExplosion, playSimSound, localMuted) => {
      data.shockwaveTimer -= dt;
      if (data.shockwaveTimer <= 0) {
        data.shockwaveTimer = 15.0;
        let shieldedByAsteroid = false;
        for (let a of asteroids) {
          if (currentPos.distanceToSquared(a.pos) < 250 * 250) { shieldedByAsteroid = true; break; }
        }
        if (shieldedByAsteroid) {
          data.warningActive = true;
          data.warningText = "ONDA SOLAR ABSORVIDA POR ASTEROIDE ✓";
          playSimSound("ability", localMuted);
        } else {
          data.warningActive = true;
          data.warningText = "ONDA SOLAR DEVASTADORA! VELOCIDADE REDUZIDA";
          playSimSound("explosion", localMuted);
          shakeRef.current = 4.0;
          createExplosion(currentPos, "#f97316");
          velocityRef.current = Math.max(30, velocityRef.current - 220);
          resetMultiplier();
        }
      } else if (data.shockwaveTimer < 4.5) {
        data.warningActive = true;
        data.warningText = `ONDA DE CHOQUE EM: ${data.shockwaveTimer.toFixed(1)}s! SOMBREIE EM UM ASTEROIDE`;
      }
    }
  },

  // ============================================================================
  // 10. HORIZONTE DE EVENTOS — 1 Único Planeta: SINGULARITY PLANET com 2 Luas
  // ============================================================================
  "route-black-hole": {
    satelliteStyle: {
      metalColor: "#0f172a",
      panelColor: "#312e81",
      lightColor: "#818cf8"
    },
    asteroidMaterialProps: {
      color: "#0f172a",
      emissive: "#4338ca",
      emissiveIntensity: 3.5,
      metalness: 0.5,
      roughness: 0.1,
      useTexture: false
    },
    obstacleGeometryType: "asteroid",
    planets: (totalDist) => [
      {
        id: "doomed-planet",
        pos: new THREE.Vector3(-15000, -4000, -totalDist * 0.50),
        radius: 4800,
        color: "#312e81",
        emissive: "#1e1b4b",
        moons: [
          { id: "tidal-fragment", distance: 7500, radius: 280, color: "#818cf8", speed: 0.30 },
          { id: "graviton-node", distance: 10500, radius: 180, color: "#c7d2fe", speed: 0.18 }
        ]
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing, selectedRoute) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const numRings = selectedRoute?.numRings || 22;
      const spiralFactor = 1.0 + (idx / numRings) * 0.8;
      const x = Math.sin(idx * 1.1) * 980 * spiralFactor + (randomValHelper(seed, idx * 10) - 0.5) * 120;
      const y = Math.cos(idx * 1.1) * 780 * spiralFactor + (Math.sin(seed + idx * 11) - 0.5) * 120;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer, envBarFill) => {
      if (envLabel && envValueText && envBarContainer && envBarFill) {
        envLabel.innerText = currEnv.gravityWell;
        const gForce = data.heat || 1.0;
        envValueText.innerText = `${gForce.toFixed(1)} G`;
        envValueText.style.color = gForce > 4.0 ? "#ef4444" : gForce > 2.0 ? "#f97316" : "#a78bfa";
        envBarContainer.classList.remove("hidden");
        envBarFill.className = `h-full transition-all duration-150 ${gForce > 4.0 ? "bg-red-600" : "bg-purple-500"}`;
        envBarFill.style.width = `${Math.min(100, (gForce / 12) * 100)}%`;
      }
    },
    updateTick: (dt, data, currentPos, _velocityRef, _currentMaxSpeed, _energyRef, _asteroids, _trafficShips, _neonRingsRef, _timer, _isCurrentlyBoosting, _resetMultiplier, shakeRef, _createExplosion, _playSimSound, _localMuted, ship) => {
      const distToBHSq = currentPos.distanceToSquared(BLACK_HOLE_POS);
      const distToBH   = Math.sqrt(distToBHSq);
      const gravityFactor = Math.max(1.0, 50000 / (distToBH + 100));
      data.heat = gravityFactor;
      if (distToBH < 16000) {
        data.warningActive = true;
        data.warningText = "CAMPO DE ATRAÇÃO CRÍTICO: ACELERAÇÃO MÁXIMA!";
        SHARED_VEC1.subVectors(BLACK_HOLE_POS, currentPos).normalize();
        ship.position.addScaledVector(SHARED_VEC1, dt * gravityFactor * 25);
        shakeRef.current = Math.max(shakeRef.current, gravityFactor * 0.05);
      }
    }
  },

  // ============================================================================
  // 11. SUCATA DE DYSON — 1 Único Planeta: APEX DYSON CORE com 2 Luas
  // ============================================================================
  "route-dyson": {
    satelliteStyle: {
      metalColor: "#451a03",
      panelColor: "#d97706",
      lightColor: "#f97316"
    },
    asteroidMaterialProps: {
      color: "#292524",
      emissive: "#d97706",
      emissiveIntensity: 1.5,
      metalness: 0.8,
      roughness: 0.3,
      useTexture: false
    },
    obstacleGeometryType: "dysonScrap",
    planets: (totalDist) => [
      {
        id: "dyson-core",
        pos: new THREE.Vector3(0, -9000, -totalDist * 0.55),
        radius: 6000,
        color: "#ca8a04",
        emissive: "#713f12",
        moons: [
          { id: "scrap-station-a", distance: 9000, radius: 320, color: "#f59e0b", speed: 0.07 },
          { id: "refinery-node", distance: 12000, radius: 220, color: "#d97706", speed: 0.12 }
        ]
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.90) * 650 + Math.cos(idx * 1.8) * 180 + (randomValHelper(seed, idx * 10) - 0.5) * 100;
      const y = Math.cos(idx * 0.90) * 550 + (Math.sin(seed + idx * 11) - 0.5) * 100;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer) => {
      if (envLabel && envValueText && envBarContainer) {
        envLabel.innerText = currEnv.automatedLaser;
        const active = data.warningActive;
        envValueText.innerText = active ? currEnv.laserActive : currEnv.securePortal;
        envValueText.style.color = active ? "#ef4444" : "#10b981";
        envBarContainer.classList.add("hidden");
      }
    },
    updateTick: (dt, data, _currentPos, velocityRef, _currentMaxSpeed, _energyRef, _asteroids, _trafficShips, _neonRingsRef, timer, _isCurrentlyBoosting, _resetMultiplier, _shakeRef, _createExplosion, playSimSound, localMuted) => {
      const cycle = Math.sin(timer.getElapsedTime() * 3.5);
      if (cycle > 0.4) {
        data.warningActive = true;
        data.warningText = "🚨 BARREIRA DE LASER EM CURSO! DESVIE!";
        if (Math.random() < dt * 0.4) {
          velocityRef.current = Math.max(30, velocityRef.current - dt * 120);
          playSimSound("shield_hit", localMuted);
        }
      }
    }
  }
};

export function getRouteBehavior(routeId: string): RouteBehavior {
  return routeBehaviors[routeId] || routeBehaviors["route-asteroid-alpha"];
}
