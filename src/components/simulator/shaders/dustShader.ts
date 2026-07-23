export const DUST_VERTEX_SHADER = `
  uniform vec3 uShipPosition;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    vec3 pos = position;
    
    // Wave movement
    pos.y += sin(uTime * 0.15 + pos.x * 0.05 + pos.z * 0.05) * 4.0;
    pos.x += cos(uTime * 0.1 + pos.y * 0.05) * 2.0;
    
    vec3 diff = pos - uShipPosition;
    vec3 wrapped = mod(diff + vec3(400.0), 800.0) - vec3(400.0);
    vec3 finalPos = uShipPosition + wrapped;
    
    // Fade edge to prevent pop-in
    float distToEdge = min(min(400.0 - abs(wrapped.x), 400.0 - abs(wrapped.y)), 400.0 - abs(wrapped.z));
    vAlpha = smoothstep(0.0, 60.0, distToEdge) * 0.22;
    
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_PointSize = 0.85 * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const DUST_FRAGMENT_SHADER = `
  uniform vec3 uDustColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv) * 2.0;
    float alpha = smoothstep(1.0, 0.0, dist);
    gl_FragColor = vec4(uDustColor * alpha * vAlpha, alpha * vAlpha);
  }
`;
