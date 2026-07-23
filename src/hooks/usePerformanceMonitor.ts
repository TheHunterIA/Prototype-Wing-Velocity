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
  const mountTimeRef = useRef(performance.now());
  
  const targetMaxDPR = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2.0);
  const minDPR = graphicsQuality === "high" ? 1.0 : 0.75;
  
  const [currentDPR, setCurrentDPR] = useState(() => targetMaxDPR);
  const debounceTimer = useRef<number | null>(null);
  const emergencySpikes = useRef(0);

  useEffect(() => {
    gl.setPixelRatio(currentDPR);
  }, [currentDPR, gl]);

  // Se a qualidade gráfica for alterada manualmente para "high", reseta o DPR para a resolução máxima
  useEffect(() => {
    if (graphicsQuality === "high") {
      setCurrentDPR(targetMaxDPR);
    }
  }, [graphicsQuality, targetMaxDPR]);

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    const timeSinceMount = now - mountTimeRef.current;

    // Durante os primeiros 5 segundos (carregamento de modelos/compilação de shaders da GPU),
    // ignora picos de frame para não derrubar a resolução no início da partida!
    if (timeSinceMount < 5000) {
      return;
    }

    // Resposta de emergência para picos sustentados em meio ao jogo
    if (delta > 300) {
      emergencySpikes.current += 1;
      if (emergencySpikes.current >= 4 && currentDPR > minDPR) {
        const newDpr = Math.max(minDPR, currentDPR - 0.25);
        setCurrentDPR(newDpr);
        debounceTimer.current = now;
        frameTimes.current = [];
        emergencySpikes.current = 0;
        console.log(`[Dynamic Resolution] Queda brusca de FPS detectada. Reduzindo DPR emergencialmente para ${newDpr.toFixed(2)}`);
      }
      return;
    } else {
      emergencySpikes.current = 0;
    }

    // Ignora picos isolados grandes (carregamentos, GC, foco da aba)
    if (delta > 150) return;

    frameTimes.current.push(delta);
    if (frameTimes.current.length > 180) {
      frameTimes.current.shift();
    }

    // Análise de performance a cada janela de amostragem
    if (frameTimes.current.length === 180 && (!debounceTimer.current || now - debounceTimer.current > 6000)) {
      const avgDelta = frameTimes.current.reduce((a, b) => a + b, 0) / 180;
      const fps = 1000 / avgDelta;

      if (fps < 45 && currentDPR > minDPR) {
        const nextDPR = Math.max(minDPR, currentDPR - 0.15);
        setCurrentDPR(nextDPR);
        debounceTimer.current = now;
        frameTimes.current = [];
        console.log(`[Dynamic Resolution] FPS baixo (${fps.toFixed(1)}). Reduzindo DPR para ${nextDPR.toFixed(2)}`);
      } else if (fps > 58.0 && currentDPR < targetMaxDPR) {
        const nextDPR = Math.min(targetMaxDPR, currentDPR + 0.15);
        setCurrentDPR(nextDPR);
        debounceTimer.current = now;
        frameTimes.current = [];
        console.log(`[Dynamic Resolution] FPS excelente (${fps.toFixed(1)}). Restaurando nitidez para ${nextDPR.toFixed(2)}`);
      }
    }
  });

  return { currentDPR };
}
