import { useState, useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";

export interface UsePerformanceMonitorProps {
  graphicsQuality: "high" | "low";
  setGraphicsQuality: (q: "high" | "low") => void;
}

export function usePerformanceMonitor({
  graphicsQuality,
  setGraphicsQuality,
}: UsePerformanceMonitorProps) {
  const { gl } = useThree();
  const frameTimes = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const [currentDPR, setCurrentDPR] = useState(() => Math.min(window.devicePixelRatio || 1, 1.5));
  const debounceTimer = useRef<number | null>(null);
  const emergencySpikes = useRef(0);

  useEffect(() => {
    gl.setPixelRatio(currentDPR);
  }, [currentDPR, gl]);

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Resposta de emergência: roda ANTES do descarte de picos isolados abaixo,
    // pois queremos reagir mesmo a deltas grandes (>150ms) quando se repetem.
    // Se o frame demorou muito mais que o normal (>300ms, ~<3.3 FPS) por 3 frames
    // seguidos, reduz a resolução imediatamente, em vez de esperar a janela de
    // 180 frames (~3s) do ajuste gradual abaixo, que é lenta demais para picos
    // de explosão/colisão simultâneos.
    if (delta > 300) {
      emergencySpikes.current += 1;
      if (emergencySpikes.current >= 3 && currentDPR > 0.6) {
        setCurrentDPR(0.6);
        debounceTimer.current = now;
        frameTimes.current = [];
        emergencySpikes.current = 0;
        console.log(`[Dynamic Resolution] Queda brusca de FPS detectada. Reduzindo DPR emergencialmente para 0.6`);
      }
      return; // Trata como pico isolado normal também (mesmo comportamento de antes)
    } else {
      emergencySpikes.current = 0;
    }

    // Ignora picos isolados grandes (carregamentos, GC, foco da aba)
    if (delta > 150) return;

    frameTimes.current.push(delta);
    // Janela de 180 frames (~3 segundos a 60 FPS) para amostragem muito mais estável
    if (frameTimes.current.length > 180) {
      frameTimes.current.shift();
    }

    // Apenas analisa a performance após coletar os 180 frames iniciais
    // Usa um debounce robusto de 8 segundos (8000ms) para evitar reajustes frenéticos
    if (frameTimes.current.length === 180 && (!debounceTimer.current || now - debounceTimer.current > 8000)) {
      const avgDelta = frameTimes.current.reduce((a, b) => a + b, 0) / 180;
      const fps = 1000 / avgDelta;

      // Zonas de FPS com histerese ampla
      if (fps < 45 && currentDPR > 0.8) {
        // Reduz a resolução para atenuar o fill-rate da GPU
        const nextDPR = Math.max(0.8, currentDPR - 0.2);
        setCurrentDPR(nextDPR);
        debounceTimer.current = now;
        frameTimes.current = [];
        console.log(`[Dynamic Resolution] FPS baixo (${fps.toFixed(1)}). Reduzindo DPR de forma conservadora para ${nextDPR.toFixed(2)}`);
      } else if (fps > 58.5 && currentDPR < Math.min(window.devicePixelRatio || 1, 1.5)) {
        // Só recupera a nitidez se o FPS estiver perfeito e de forma altamente sustentada
        const nextDPR = Math.min(Math.min(window.devicePixelRatio || 1, 1.5), currentDPR + 0.1);
        setCurrentDPR(nextDPR);
        debounceTimer.current = now;
        frameTimes.current = [];
        console.log(`[Dynamic Resolution] FPS excelente e estável (${fps.toFixed(1)}). Restaurando DPR para ${nextDPR.toFixed(2)}`);
      }
    }
  });

  return { currentDPR };
}
