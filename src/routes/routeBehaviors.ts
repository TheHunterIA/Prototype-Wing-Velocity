import * as THREE from "three";

const SHARED_VEC1 = new THREE.Vector3();
const SHARED_VEC2 = new THREE.Vector3();
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
  "route-certification": {
    satelliteStyle: defaultSatelliteStyle,
    asteroidMaterialProps: defaultAsteroidMaterialProps,
    obstacleGeometryType: "asteroid",
    planets: (totalDist) => [
      { 
        id: "earth", 
        pos: new THREE.Vector3(-9000, 1800, -totalDist * 0.45), 
        radius: 4500, 
        color: "#3b82f6", 
        emissive: "#1e3a8a",
        moons: [
          { id: "moon", distance: 7000, radius: 250, color: "#9ca3af", speed: 0.1 }
        ]
      },
      { 
        id: "sun", 
        pos: new THREE.Vector3(40000, 10000, -totalDist * 0.7), 
        radius: 8000, 
        color: "#fbbf24", 
        emissive: "#f59e0b" 
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      let x = 0;
      let y = 0;
      if (idx < 5) {
        x = 0;
        y = 0;
      } else {
        const factor = (idx - 4) / 5;
        x = Math.sin((idx - 4) * 0.9) * 200 * factor;
        y = Math.cos((idx - 4) * 0.7) * 150 * factor;
        x += (randomValHelper(seed, idx * 10) - 0.5) * 120 * factor;
        y += (Math.sin(seed + idx * 11) - 0.5) * 120 * factor;
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

  "route-asteroid-alpha": {
    satelliteStyle: defaultSatelliteStyle,
    asteroidMaterialProps: defaultAsteroidMaterialProps,
    obstacleGeometryType: "asteroid",
    planets: (totalDist) => [
      { 
        id: "mars", 
        pos: new THREE.Vector3(-9000, 1500, -totalDist * 0.45), 
        radius: 3500, 
        color: "#ca8a04", 
        emissive: "#78350f",
        moons: [
          { id: "phobos", distance: 5500, radius: 150, color: "#78716c", speed: 0.15 }
        ]
      },
      { 
        id: "sun", 
        pos: new THREE.Vector3(30000, 8000, -totalDist * 0.7), 
        radius: 6500, 
        color: "#ea580c", 
        emissive: "#7c2d12" 
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.25) * 250 + (randomValHelper(seed, idx * 10) - 0.5) * 80;
      const y = Math.cos(idx * 0.15) * 150 + (Math.sin(seed + idx * 11) - 0.5) * 80;
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
        id: "jupiter", 
        pos: new THREE.Vector3(12000, -2000, -totalDist * 0.5), 
        radius: 6000, 
        color: "#a855f7", 
        emissive: "#4c1d95" 
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.7) * 600 + (randomValHelper(seed, idx * 10) - 0.5) * 180;
      const y = Math.cos(idx * 0.7) * 450 + (Math.sin(seed + idx * 11) - 0.5) * 180;
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
    updateTick: (dt, data, currentPos, velocityRef, currentMaxSpeed, energyRef, asteroids, trafficShips, neonRingsRef, timer, isCurrentlyBoosting, resetMultiplier, shakeRef, createExplosion, playSimSound, localMuted) => {
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
        pos: new THREE.Vector3(0, 0, -totalDist * 0.55), 
        radius: 8000, 
        color: "#e2e8f0" 
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.95) * 650 + (randomValHelper(seed, idx * 10) - 0.5) * 100;
      const y = Math.cos(idx * 0.2) * 150 + (Math.sin(seed + idx * 11) - 0.5) * 80;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer, envBarFill) => {
      if (envLabel && envValueText && envBarContainer && envBarFill) {
        envLabel.innerText = currEnv.solarShockwave; // wait, let's look at Saturn Rings: custom HUD is just stable or warning
        envLabel.innerText = "ALINHAMENTO COM ANÉIS";
        const isOut = data.warningActive;
        envValueText.innerText = isOut ? "FORA DA TRILHA" : "ALINHADO";
        envValueText.style.color = isOut ? "#ef4444" : "#10b981";
        envBarContainer.classList.add("hidden");
      }
    },
    updateTick: (dt, data, currentPos, velocityRef, currentMaxSpeed, energyRef, asteroids, trafficShips, neonRingsRef, timer, isCurrentlyBoosting, resetMultiplier, shakeRef, createExplosion, playSimSound, localMuted) => {
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
        id: "collapsing-star", 
        pos: new THREE.Vector3(-14000, 3000, -totalDist * 0.75), 
        radius: 4000, 
        color: "#f43f5e", 
        emissive: "#e11d48" 
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.45) * 550 + (randomValHelper(seed, idx * 10) - 0.5) * 350;
      const y = Math.sin(idx * 1.3) * 950 + (Math.sin(seed + idx * 11) - 0.5) * 350;
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
    updateTick: (dt, data, currentPos, velocityRef, currentMaxSpeed, energyRef, asteroids, trafficShips, neonRingsRef, timer, isCurrentlyBoosting, resetMultiplier, shakeRef, createExplosion, playSimSound, localMuted) => {
      data.shockwaveTimer -= dt;
      if (data.shockwaveTimer <= 0) {
        data.shockwaveTimer = 15.0; // Reset
        
        let shieldedByAsteroid = false;
        for (let a of asteroids) {
          const distSq = currentPos.distanceToSquared(a.pos);
          if (distSq < 250 * 250) {
            shieldedByAsteroid = true;
            break;
          }
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

          velocityRef.current = Math.max(30, velocityRef.current - 220); // Forte desaceleração
          resetMultiplier();
        }
      } else if (data.shockwaveTimer < 4.5) {
        data.warningActive = true;
        data.warningText = `ONDA DE CHOQUE EM: ${data.shockwaveTimer.toFixed(1)}s! SOMBREIE EM UM ASTEROIDE`;
      }
    }
  },

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
        id: "singularity", 
        pos: new THREE.Vector3(0, 0, -20000), 
        radius: 2000, 
        color: "#000000", 
        emissive: "#090514" 
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing, selectedRoute) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const progress = idx / selectedRoute.numRings;
      const radius = 1600 * (1.15 - progress);
      const x = Math.sin(idx * 1.4) * radius;
      const y = Math.cos(idx * 1.4) * radius;
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
    updateTick: (dt, data, currentPos, velocityRef, currentMaxSpeed, energyRef, asteroids, trafficShips, neonRingsRef, timer, isCurrentlyBoosting, resetMultiplier, shakeRef, createExplosion, playSimSound, localMuted, ship) => {
      const distToBHSq = currentPos.distanceToSquared(BLACK_HOLE_POS);
      const distToBH = Math.sqrt(distToBHSq);
      const gravityFactor = Math.max(1.0, 50000 / (distToBH + 100));
      data.heat = gravityFactor; // valor G
      
      if (distToBH < 16000) {
        data.warningActive = true;
        data.warningText = "CAMPO DE ATRAÇÃO CRÍTICO: ACELERAÇÃO MÁXIMA!";
        SHARED_VEC1.subVectors(BLACK_HOLE_POS, currentPos).normalize();
        ship.position.addScaledVector(SHARED_VEC1, dt * gravityFactor * 25);
        shakeRef.current = Math.max(shakeRef.current, gravityFactor * 0.05);
      }
    }
  },

  "route-highway": {
    satelliteStyle: defaultSatelliteStyle,
    asteroidMaterialProps: defaultAsteroidMaterialProps,
    obstacleGeometryType: "highway",
    planets: (totalDist) => [
      { 
        id: "coruscant-like", 
        pos: new THREE.Vector3(-15000, -4000, -totalDist * 0.4), 
        radius: 8000, 
        color: "#1e293b", 
        emissive: "#0f172a" 
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.05) * 80 + (randomValHelper(seed, idx * 10) - 0.5) * 20;
      const y = Math.cos(idx * 0.05) * 80 + (Math.sin(seed + idx * 11) - 0.5) * 20;
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
    updateTick: (dt, data, currentPos, velocityRef, currentMaxSpeed, energyRef, asteroids, trafficShips, neonRingsRef, timer, isCurrentlyBoosting, resetMultiplier, shakeRef, createExplosion, playSimSound, localMuted) => {
      let foundDraft = false;
      for (let ts of trafficShips) {
        SHARED_VEC1.subVectors(currentPos, ts.pos);
        const distSq = SHARED_VEC1.lengthSq();
        if (distSq < 460 * 460) {
          const isBehind = SHARED_VEC1.z > 0;
          const lateralOffsetSq = SHARED_VEC1.x * SHARED_VEC1.x + SHARED_VEC1.y * SHARED_VEC1.y;
          if (isBehind && lateralOffsetSq < 45 * 45) {
            foundDraft = true;
            break;
          }
        }
      }

      if (foundDraft) {
        data.draftActive = true;
        velocityRef.current = Math.min(currentMaxSpeed * 1.35, velocityRef.current + dt * 500);
        energyRef.current = Math.min(100, energyRef.current + dt * 24);
      }
    }
  },

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
        pos: new THREE.Vector3(12000, 1000, -totalDist * 0.4), 
        radius: 4000, 
        color: "#e0f2fe" 
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.3) * 350 + (randomValHelper(seed, idx * 10) - 0.5) * 120;
      const y = Math.cos(idx * 0.2) * 250 + (Math.sin(seed + idx * 11) - 0.5) * 120;
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
    updateTick: (dt, data, currentPos, velocityRef, currentMaxSpeed, energyRef, asteroids, trafficShips, neonRingsRef, timer, isCurrentlyBoosting) => {
      let nearRing = false;
      if (neonRingsRef && neonRingsRef.current) {
        for (let r of neonRingsRef.current) {
          if (!r.passed && currentPos.distanceToSquared(r.pos) < 220 * 220) {
            nearRing = true;
            break;
          }
        }
      }

      if (nearRing) {
        data.ice = Math.max(0, data.ice - dt * 250);
      } else {
        data.ice = Math.min(100, data.ice + dt * 5.8);
      }

      if (data.ice > 65) {
        data.warningActive = true;
        data.warningText = `PROPULSORES MANOBRA CONGELADOS (${Math.round(data.ice)}%): CONTROLE LENTO`;
      }
    }
  },

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
        id: "plasma-sun", 
        pos: new THREE.Vector3(-25000, -8000, -totalDist * 0.8), 
        radius: 8000, 
        color: "#c084fc", 
        emissive: "#581c87" 
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 1.25) * 800 + (randomValHelper(seed, idx * 10) - 0.5) * 350;
      const y = Math.cos(idx * 0.95) * 700 + (Math.sin(seed + idx * 11) - 0.5) * 350;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer, envBarFill) => {
      if (envLabel && envValueText && envBarContainer && envBarFill) {
        envLabel.innerText = currEnv.empDischarge;
        const active = data.controlGlitched;
        envValueText.innerText = active ? currEnv.reversal : currEnv.normal;
        envValueText.style.color = active ? "#ef4444" : "#10b981";
        envBarContainer.classList.add("hidden");
      }
    },
    updateTick: (dt, data, currentPos, velocityRef, currentMaxSpeed, energyRef, asteroids, trafficShips, neonRingsRef, timer, isCurrentlyBoosting, resetMultiplier, shakeRef, createExplosion, playSimSound, localMuted) => {
      data.plasmaTimer -= dt;
      if (data.plasmaTimer <= 0) {
        data.plasmaTimer = 14.0;
      }

      if (data.plasmaTimer < 3.5) {
        data.controlGlitched = true;
        data.warningActive = true;
        data.warningText = "⚡ POLARIDADE REVERSA: CONTROLES DE MANOBRA INVERTIDOS!";
      }
    }
  },

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
        pos: new THREE.Vector3(0, -12000, -totalDist * 0.5), 
        radius: 9500, 
        color: "#ca8a04" 
      }
    ],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.35) * 400 + (randomValHelper(seed, idx * 10) - 0.5) * 450;
      const y = Math.cos(idx * 0.35) * 400 + (Math.sin(seed + idx * 11) - 0.5) * 450;
      return new THREE.Vector3(x, y, baseZ);
    },
    updateHUDStatus: (data, currEnv, envLabel, envValueText, envBarContainer, envBarFill) => {
      if (envLabel && envValueText && envBarContainer && envBarFill) {
        envLabel.innerText = currEnv.automatedLaser;
        const active = data.warningActive;
        envValueText.innerText = active ? currEnv.laserActive : currEnv.securePortal;
        envValueText.style.color = active ? "#ef4444" : "#10b981";
        envBarContainer.classList.add("hidden");
      }
    },
    updateTick: (dt, data, currentPos, velocityRef, currentMaxSpeed, energyRef, asteroids, trafficShips, neonRingsRef, timer, isCurrentlyBoosting, resetMultiplier, shakeRef, createExplosion, playSimSound, localMuted) => {
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
  },

  "route-void": {
    satelliteStyle: defaultSatelliteStyle,
    asteroidMaterialProps: defaultAsteroidMaterialProps,
    obstacleGeometryType: "asteroid",
    planets: () => [],
    calculateRingPosition: (idx, seed, ringSpacing) => {
      const baseZ = -4000 - (idx * ringSpacing);
      const x = Math.sin(idx * 0.25) * 1600;
      const y = Math.cos(idx * 0.2) * 1200;
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
    updateTick: (dt, data, currentPos, velocityRef, currentMaxSpeed, energyRef, asteroids, trafficShips, neonRingsRef, timer, isCurrentlyBoosting, resetMultiplier, shakeRef, createExplosion, playSimSound, localMuted) => {
      data.fuel = Math.max(0, data.fuel - dt * 5.5);
      
      if (data.fuel < 28) {
        data.warningActive = true;
        data.warningText = `🔴 RESERVA DE O2 CRÍTICA: ${Math.round(data.fuel)}%! ATRAVÉS DE AROS RECARREGA`;
        if (data.fuel <= 0) {
          velocityRef.current = Math.max(10, velocityRef.current - dt * 250);
          shakeRef.current = Math.max(shakeRef.current, 0.4);
          if (Math.random() < dt) {
            playSimSound("hull_hit", localMuted);
          }
        }
      }
    }
  }
};

export function getRouteBehavior(routeId: string): RouteBehavior {
  return routeBehaviors[routeId] || routeBehaviors["route-asteroid-alpha"];
}
