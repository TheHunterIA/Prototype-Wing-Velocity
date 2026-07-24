// --- PIPELINE DE PRÉ-COMPILAÇÃO DE SHADERS (WARMUP) ---
// Força a GPU a compilar todos os shaders de materiais e pós-processamento antes da corrida

import * as THREE from "three";

export class ShaderWarmup {
  private static compiled = false;

  /**
   * Varre a cena 3D e força a pré-compilação do WebGL.
   */
  public static warmup(renderer: THREE.WebGLRenderer | null, scene: THREE.Scene | THREE.Group | null, camera: THREE.Camera | null) {
    if (this.compiled || !renderer || !scene || !camera) return;

    try {
      renderer.compile(scene, camera);
      this.compiled = true;
      console.log("[ShaderWarmup] Shaders de GPU pré-compilados com sucesso.");
    } catch (e) {
      console.warn("[ShaderWarmup] Erro ao pré-compilar shaders de GPU:", e);
    }
  }

  public static reset() {
    this.compiled = false;
  }
}
