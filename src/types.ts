export type ShipClass = "Interceptor" | "Recon" | "Fighter" | "Heavy Fighter" | "Bomber" | "Corvette" | "Dreadnought";

export interface ShipData {
  id: string;
  name: string;
  modelFile: string;
  class: ShipClass;
  description: string;
  velocidade: number;     // Vel (1 to 10)
  aceleracao: number;     // Ace (1 to 10)
  turbo: number;          // Tur (1 to 10)
  energia: number;        // Eng (1 to 10)
  massa: number;          // Mas (1 to 10)
  price: number;
  abilityName: string;
  abilityDesc: string;
  requiredLevel: number;
}

export interface SkinData {
  id: string;
  name: string;
  textureFile: string;
  colorHex: string; // Tailwind-friendly bg class or hex value for dots
  description: string;
}

export interface RouteData {
  id: string;
  name: string;
  description: string;
  image: string;
  numRings: number;
  ringSpacing: number;
  curveIntensityX: number;
  curveIntensityY: number;
  curveFrequencyX: number;
  curveFrequencyY: number;
  randomOffset: number; // How much a ring can deviate from its ideal path
  nebulaCount: number; // Number of nebulas in the scene
  asteroidDensity: number; // multiplier for count, e.g. 1.0 = normal, 2.0 = dense
  asteroidVelocity: number; // speed of moving asteroids (0 for static)
  difficulty: "Iniciante" | "Fácil" | "Médio" | "Difícil" | "Elite" | "Sobrevivência";
  totalDistance: number; // in meters (for UI display)
  ambientColor: string; // hex color of stars/fog/nebula accent
  nebulaColors?: [string, string]; // Dual tone colors for glowing nebulae
  starlightColor?: string; // Tint for background stars
  dustColor?: string; // Color of cosmic dust passing the ship
  sunLightColor?: string; // Primary directional light tint
  fogColor?: string; // Custom atmospheric fog color
  hasMovingAsteroids: boolean;
  trafficShipCount: number; // how many AI ships are cruising around
  gravityWell?: boolean; // pulls the ship slightly
  requiredLevel: number;
}

export type GraphicsQuality = "high" | "medium" | "low";

