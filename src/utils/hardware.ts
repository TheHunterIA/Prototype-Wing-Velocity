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
    }
  } catch (e) {
    console.error("Error detecting GPU info", e);
  }

  return false;
}
