// --- GERENCIADOR DE LIMPEZA E DESCARTE DE VRAM ---
// Realiza a varredura e liberação de recursos Three.js (geometrias, materiais e texturas) da GPU

import * as THREE from "three";

export class VRAMManager {
  /**
   * Varre um objeto 3D ou cena e descarrega todos os recursos da memória da GPU.
   */
  public static disposeScene(object: THREE.Object3D | null) {
    if (!object) return;

    object.traverse((child: any) => {
      // Descartar Geometrias
      if (child.geometry && typeof child.geometry.dispose === "function") {
        child.geometry.dispose();
      }

      // Descartar Materiais e suas Texturas associadas
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: THREE.Material) => this.disposeMaterial(mat));
        } else {
          this.disposeMaterial(child.material);
        }
      }
    });

    console.log("[VRAMManager] Recursos de cena descarregados da GPU com sucesso.");
  }

  private static disposeMaterial(material: THREE.Material) {
    if (!material) return;

    // Liberar texturas mapeadas no material
    Object.keys(material).forEach((prop) => {
      const value = (material as any)[prop];
      if (value && value instanceof THREE.Texture && typeof value.dispose === "function") {
        value.dispose();
      }
    });

    if (typeof material.dispose === "function") {
      material.dispose();
    }
  }
}
