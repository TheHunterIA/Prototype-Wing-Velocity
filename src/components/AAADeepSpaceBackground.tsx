import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RouteData } from '../types';

interface AAADeepSpaceBackgroundProps {
  selectedRoute: RouteData;
  graphicsQuality?: "high" | "low";
}

// ============================================================================
// VERTEX SHADER — Skybox
// ============================================================================
const SKYBOX_VERT = `
varying vec3 vDir;
void main() {
  vDir = (modelMatrix * vec4(position, 0.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// ============================================================================
// FRAGMENT SHADER — Deep Space Nebula (performance-optimised: 4-octave FBM,
// single domain-warp pass, no second sky layer)
//
// Luminance budget:
//   Background void  : ~0.01-0.03   (near-absolute black)
//   Nebula haze      : +0.04-0.08   total max ~0.11
//   Nebula body      : +0.00-0.10   total max ~0.20
//   Bright core      : +0.00-0.14   total max ~0.34
//   Galactic belt    : +0.00-0.06
//   Procedural stars :  0.0 or 0.6-1.6 (spike triggers Bloom, bg stays dark)
// → Bloom threshold 0.82 leaves nebula alone, blooms only stars/thrusters
// ============================================================================
const SKYBOX_FRAG = `
precision mediump float;

uniform vec3  uC0;       // void background
uniform vec3  uC1;       // outer haze
uniform vec3  uC2;       // cloud body
uniform vec3  uC3;       // bright core
uniform float uTime;
uniform float uDensity;
uniform float uSeed;
uniform float uPerfMode; // 1.0 = low quality (ultra-fast pass), 0.0 = high quality

varying vec3 vDir;

// ---------- fast value noise ----------
float hash(vec3 p) {
  p  = fract(p * vec3(443.8975, 441.4234, 437.1951));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(
    mix(mix(hash(i),             hash(i+vec3(1,0,0)), f.x),
        mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
        mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y),
    f.z);
}

// 3-octave FBM for main nebular structures (ultra-fast, pristine visual result)
float fbm(vec3 p) {
  float v=0.0, a=0.5;
  for (int i=0; i<3; i++) { v+=a*noise(p); p=p*2.03+vec3(1.7,9.2,3.4); a*=0.5; }
  return v;
}

// 2-octave FBM for domain warp pass
float fbmWarp(vec3 p) {
  float v=0.0, a=0.5;
  for (int i=0; i<2; i++) { v+=a*noise(p); p=p*2.03+vec3(1.7,9.2,3.4); a*=0.5; }
  return v;
}

void main() {
  vec3 d = normalize(vDir);

  // Slow drift
  vec3 p = d * 1.6 + vec3(uTime*0.001, uTime*0.0007, uSeed*0.05);

  float n = 0.0;
  if (uPerfMode > 0.5) {
    // Ultra-fast single-pass FBM (avoids 15+ sub-noise evaluations per fragment)
    n = clamp(fbm(p)*0.5+0.5, 0.0, 1.0);
  } else {
    // High-quality domain-warped FBM pass
    vec3 q = vec3(fbmWarp(p),
                  fbmWarp(p + vec3(5.2,1.3,2.8)),
                  fbmWarp(p + vec3(1.7,9.2,4.4)));
    float f = fbm(p + 3.2*q);
    n = clamp(f*0.5+0.5, 0.0, 1.0);
  }

  // ---- Nebula colour layers ----
  vec3 col = uC0;
  col += uC1 * 0.08 * smoothstep(0.30, 0.68, n) * uDensity;
  col += uC2 * 0.14 * smoothstep(0.52, 0.82, n) * uDensity;
  col += uC3 * 0.22 * smoothstep(0.72, 1.00, n) * pow(n, 2.5) * uDensity;

  if (uPerfMode < 0.5) {
    // Dark dust absorption lanes
    float dust = fbm(p*2.8 + vec3(12.4, 5.1+uSeed*0.2, 8.9));
    col = mix(col, uC0*0.5, smoothstep(0.60, 0.85, dust) * 0.82);
  }

  // ---- Galactic belt ----
  float belt = exp(-d.y*d.y * 14.0);
  col += uC3 * 0.09 * belt;
  col += uC2 * 0.04 * belt;

  // ---- Procedural star field ----
  vec3 sg = floor(d * 220.0);
  float sh = hash(sg);
  if (sh > 0.988) {
    float b = pow((sh-0.988)/0.012, 1.8) * (0.6 + 0.4*sin(uTime*2.2 + sh*120.0));
    col += vec3(b * 0.85);
  }

  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

// ============================================================================
// Diffraction-spike star points (large, bright, very sparse)
// ============================================================================
const STAR_VERT = `
attribute vec3  aColor;
attribute float aSize;
attribute float aPhase;
uniform   float uTime;
varying   vec3  vColor;
varying   float vTwinkle;
void main() {
  vColor   = aColor;
  vTwinkle = 0.72 + 0.28*sin(uTime*(0.45 + aPhase*0.65) + aPhase*6.283);
  vec4 mv  = modelViewMatrix * vec4(position, 1.0);
  float depth = max(10.0, -mv.z);
  gl_PointSize = min(32.0, aSize * (480.0 / depth));
  gl_Position  = projectionMatrix * mv;
}
`;

const STAR_FRAG = `
precision mediump float;
varying vec3  vColor;
varying float vTwinkle;
void main() {
  vec2  uv   = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;

  // Soft circular core
  float core  = exp(-dist*dist*26.0);
  // Horizontal anamorphic spike (wider — cinematic)
  float spikeH = exp(-uv.y*uv.y*280.0) * exp(-abs(uv.x)*4.0);
  // Vertical secondary spike (thin)
  float spikeV = exp(-uv.x*uv.x*1000.0) * exp(-abs(uv.y)*6.0);
  float spikes = spikeH*0.9 + spikeV*0.35;

  float alpha     = clamp((core + spikes)*vTwinkle, 0.0, 1.0);
  vec3  finalCol  = vColor * (core + spikes*3.2) * vTwinkle;

  gl_FragColor = vec4(finalCol, alpha);
}
`;

// ============================================================================
// React component
// ============================================================================
export const AAADeepSpaceBackground = React.memo(function AAADeepSpaceBackground(
  { selectedRoute, graphicsQuality = "high" }: AAADeepSpaceBackgroundProps
) {
  const skyRef  = useRef<THREE.ShaderMaterial>(null);
  const starRef = useRef<THREE.ShaderMaterial>(null);
  const isLowPerf = graphicsQuality === "low";

  // Per-route palette — nebula colours are deliberately dim (no blow-out)
  const palette = useMemo(() => {
    const nc = selectedRoute.nebulaColors;
    const c0 = new THREE.Color("#010208");  // void — near-absolute black
    // Outer haze at 22% luminance of route primary
    const c1 = nc ? new THREE.Color(nc[0]).multiplyScalar(0.22) : new THREE.Color("#071530");
    // Cloud body at 50%
    const c2 = nc ? new THREE.Color(nc[0]).multiplyScalar(0.50) : new THREE.Color("#0d3070");
    // Core at 80% of secondary (most saturated, brightest, but still < Bloom threshold)
    const c3 = nc ? new THREE.Color(nc[1]).multiplyScalar(0.80) : new THREE.Color("#5010b0");

    const seed    = selectedRoute.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 97;
    const density = selectedRoute.id === 'route-void' ? 0.25 : 1.0;

    return { c0, c1, c2, c3, seed, density };
  }, [selectedRoute]);

  const skyUniforms = useMemo(() => ({
    uC0:       { value: palette.c0 },
    uC1:       { value: palette.c1 },
    uC2:       { value: palette.c2 },
    uC3:       { value: palette.c3 },
    uTime:     { value: 0 },
    uDensity:  { value: palette.density },
    uSeed:     { value: palette.seed },
    uPerfMode: { value: isLowPerf ? 1.0 : 0.0 },
  }), [palette, isLowPerf]);

  React.useEffect(() => {
    if (skyRef.current) {
      skyRef.current.uniforms.uC0.value = palette.c0;
      skyRef.current.uniforms.uC1.value = palette.c1;
      skyRef.current.uniforms.uC2.value = palette.c2;
      skyRef.current.uniforms.uC3.value = palette.c3;
      skyRef.current.uniforms.uDensity.value = palette.density;
      skyRef.current.uniforms.uSeed.value = palette.seed;
      skyRef.current.uniforms.uPerfMode.value = isLowPerf ? 1.0 : 0.0;
    }
  }, [palette, isLowPerf]);

  // Diffraction stars (300 on high, 120 on low)
  const stars = useMemo(() => {
    const COUNT = isLowPerf ? 120 : 300;
    const pos   = new Float32Array(COUNT * 3);
    const col   = new Float32Array(COUNT * 3);
    const size  = new Float32Array(COUNT);
    const phase = new Float32Array(COUNT);

    const spectral = [
      new THREE.Color("#b8d0ff"), // O/B hot blue
      new THREE.Color("#dce8ff"), // B blue-white
      new THREE.Color("#f5f8ff"), // A white
      new THREE.Color("#fff4e0"), // F/G sun-like
      new THREE.Color("#ffd090"), // K orange
      new THREE.Color("#ff9060"), // M red giant
    ];
    const cdf = [0.04, 0.14, 0.36, 0.66, 0.88, 1.0];

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 20000 + Math.random() * 5000;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);

      const rnd = Math.random();
      const c   = spectral[cdf.findIndex(v => rnd < v)].clone();
      col[i*3]   = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;

      size[i]  = 6.0 + Math.pow(Math.random(), 4) * 20.0;
      phase[i] = Math.random() * 10;
    }
    return { pos, col, size, phase, COUNT };
  }, [isLowPerf]);

  const starUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (skyRef.current)  skyRef.current.uniforms.uTime.value  = t;
    if (starRef.current) starRef.current.uniforms.uTime.value = t;
  });

  return (
    <group>
      {/* ── Volumetric Skybox Dome (24-seg on low for perf, 36 on high, BackSide) ── */}
      <mesh scale={26000} renderOrder={-2000}>
        <sphereGeometry args={[1, isLowPerf ? 24 : 36, isLowPerf ? 24 : 36]} />
        <shaderMaterial
          ref={skyRef}
          vertexShader={SKYBOX_VERT}
          fragmentShader={SKYBOX_FRAG}
          uniforms={skyUniforms}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* ── Diffraction-spike star layer ── */}
      <points renderOrder={-1990}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={stars.pos}   count={stars.COUNT} itemSize={3} />
          <bufferAttribute attach="attributes-aColor"   array={stars.col}   count={stars.COUNT} itemSize={3} />
          <bufferAttribute attach="attributes-aSize"    array={stars.size}  count={stars.COUNT} itemSize={1} />
          <bufferAttribute attach="attributes-aPhase"   array={stars.phase} count={stars.COUNT} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial
          ref={starRef}
          uniforms={starUniforms}
          vertexShader={STAR_VERT}
          fragmentShader={STAR_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
});
