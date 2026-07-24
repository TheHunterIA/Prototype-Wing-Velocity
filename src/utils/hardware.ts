export function detectLowEndHardware(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }

  // 1. Check CPU cores
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
    return true;
  }

  // 2. Check mobile devices
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  if (isMobile) {
    return true;
  }

  // 3. Detect low-end GPU via WebGL debug info
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
        const lowEndTerms = ["intel", "swiftshader", "basic render", "software", "llvmpipe", "mali-g", "adreno 5", "adreno 610"];
        const lowerRenderer = renderer.toLowerCase();
        
        if (lowEndTerms.some(term => lowerRenderer.includes(term))) {
          return true;
        }
      }

      // 4. Benchmark de draw call — fallback quando WEBGL_debug_renderer_info está
      //    bloqueado por privacidade (Chrome 100+, Firefox). Mede o tempo de renderizar
      //    10.000 pontos; GPUs fracas demoram mais de 15ms nessa operação simples.
      try {
        const vertices = new Float32Array(10000 * 2);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const t0 = performance.now();
        gl.drawArrays(gl.POINTS, 0, 10000);
        gl.finish(); // força sincronização com a GPU
        const elapsed = performance.now() - t0;
        gl.deleteBuffer(buf);
        if (elapsed > 15) {
          return true; // GPU muito lenta
        }
      } catch (benchErr) {
        // benchmark falhou — continuar sem downgrade forçado
      }
    }
  } catch (e) {
    console.error("Error detecting GPU info", e);
  }

  return false;
}
