export const STAR_VERTEX_SHADER = `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  attribute float aBrightness;
  uniform float uTime;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = aColor;
    // Cintilação sutil: cada estrela tem uma fase própria pra não piscarem em sincronia
    vTwinkle = aBrightness * (0.78 + 0.22 * sin(uTime * (0.6 + aPhase * 0.9) + aPhase * 6.2831));
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (420.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const STAR_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    // Sprite circular suave (em vez do ponto quadrado padrão do PointsMaterial)
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv) * 2.0;
    float alpha = smoothstep(1.0, 0.0, dist);
    gl_FragColor = vec4(vColor * vTwinkle, alpha * vTwinkle);
  }
`;
