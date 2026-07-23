export const SPEED_PARTICLES_VERTEX_SHADER = `
  uniform vec3 uShipPosition;
  uniform float uTravelOffset;
  uniform float uOpacity;
  attribute float aSpeed;
  varying float vAlpha;
  void main() {
    vec3 pos = position;
    
    float zDiff = pos.z - uShipPosition.z - uTravelOffset * aSpeed;
    float wrappedZ = mod(zDiff + 250.0, 500.0) - 250.0;
    
    vec3 finalPos = vec3(pos.xy + uShipPosition.xy, uShipPosition.z + wrappedZ);
    
    float distToEdge = min(250.0 - abs(wrappedZ), 90.0);
    vAlpha = smoothstep(0.0, 60.0, distToEdge) * uOpacity;
    
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    float pSize = (0.5 + aSpeed * 0.3) * (350.0 / max(1.0, -mvPosition.z));
    gl_PointSize = min(8.0, pSize);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const SPEED_PARTICLES_FRAGMENT_SHADER = `
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv) * 2.0;
    float alpha = smoothstep(1.0, 0.0, dist);
    gl_FragColor = vec4(vec3(0.70, 0.82, 0.95) * alpha * vAlpha, alpha * vAlpha);
  }
`;
