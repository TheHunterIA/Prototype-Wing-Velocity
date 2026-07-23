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
  
  const isMobileDevice = typeof window !== "undefined" && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);

  const targetMaxDPR = Math.min(
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    graphicsQuality === "high" ? (isMobileDevice ? 1.25 : 1.5) : (isMobileDevice ? 0.9 : 1.0)
  );
  const minDPR = graphicsQuality === "high" ? 0.75 : 0.55;
  
  const [currentDPR, setCurrentDPR] = useState(() => targetMaxDPR);
  const debounceTimer = useRef<number | null>(null);
  const emergencySpikes = useRef(0);
  const lowFpsCount = useRef(0);

  useEffect(() => {
    gl.setPixelRatio(currentDPR);
  }, [currentDPR, gl]);

  // Se a qualidade gráfica for alterada manualmente para "high", reseta o DPR para a resolução máxima de alta qualidade
  useEffect(() => {
    setCurrentDPR(targetMaxDPR);
  }, [graphicsQuality, targetMaxDPR]);

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    const timeSinceMount = now - mountTimeRef.current;

    // Durante os primeiros 5 segundos (carregamento de modelos/compilação de shaders da GPU),
    // ignora picos de frame para não derrubar a resolução nem causar flashes ao mudar de rota!
    if (timeSinceMount < 5000) {
      return;
    }

    // Resposta de emergência para picos sustentados em meio ao jogo
    if (delta > 250) {
      emergencySpikes.current += 1;
      if (emergencySpikes.current >= 3 && currentDPR > minDPR) {
        const newDpr = Math.max(minDPR, currentDPR - 0.20);
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
    if (frameTimes.current.length > 90) {
      frameTimes.current.shift();
    }

    // Análise de performance a cada janela de amostragem (1.5s)
    if (frameTimes.current.length === 90 && (!debounceTimer.current || now - debounceTimer.current > 3000)) {
      const avgDelta = frameTimes.current.reduce((a, b) => a + b, 0) / 90;
      const fps = 1000 / avgDelta;

      if (fps < 48 && currentDPR > minDPR) {
        const nextDPR = Math.max(minDPR, currentDPR - 0.15);
        setCurrentDPR(nextDPR);
        debounceTimer.current = now;
        frameTimes.current = [];
        lowFpsCount.current += 1;

        // Se persistir muito baixo mesmo baixando o DPR, alterna para modo de baixa fidelidade automaticamente
        if (lowFpsCount.current >= 3 && graphicsQuality === "high") {
          console.log(`[Dynamic Resolution] FPS persistentemente baixo (${fps.toFixed(1)}). Alternando para modo otimizado.`);
          setGraphicsQuality("low");
          lowFpsCount.current = 0;
        }
      } else if (fps > 58.0 && currentDPR < targetMaxDPR) {
        const nextDPR = Math.min(targetMaxDPR, currentDPR + 0.15);
        setCurrentDPR(nextDPR);
        debounceTimer.current = now;
        frameTimes.current = [];
        if (fps > 59.0) lowFpsCount.current = Math.max(0, lowFpsCount.current - 1);
      }
    }
  });

  return { currentDPR };
}
