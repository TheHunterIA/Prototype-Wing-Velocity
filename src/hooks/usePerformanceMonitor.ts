import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export type GraphicsQuality = "high" | "medium" | "low";

export interface UsePerformanceMonitorProps {
  graphicsQuality: GraphicsQuality;
  setGraphicsQuality: (q: GraphicsQuality) => void;
}

export function usePerformanceMonitor({
  graphicsQuality,
  setGraphicsQuality,
}: UsePerformanceMonitorProps) {
  const frameDeltas = useRef<{ time: number; delta: number }[]>([]);
  const mountTimeRef = useRef(performance.now());
  
  // Timers for sustained FPS conditions (accumulated milliseconds)
  const timeBelow32 = useRef<number>(0);
  const timeAbove58 = useRef<number>(0);
  const lastCheckTime = useRef<number>(performance.now());

  useFrame((state, delta) => {
    const now = performance.now();
    const timeSinceMount = now - mountTimeRef.current;

    if (timeSinceMount < 5000) {
      lastCheckTime.current = now;
      return;
    }

    let isManual = false;
    try {
      isManual = localStorage.getItem("graphicsQualityManual") === "true";
    } catch (e) {}

    if (isManual) {
      return;
    }

    frameDeltas.current.push({ time: now, delta });

    const windowStart = now - 2500;
    frameDeltas.current = frameDeltas.current.filter((f) => f.time >= windowStart);

    if (frameDeltas.current.length < 30) {
      lastCheckTime.current = now;
      return;
    }

    const totalDelta = frameDeltas.current.reduce((sum, f) => sum + f.delta, 0);
    const avgFPS = frameDeltas.current.length / totalDelta;

    const elapsed = now - lastCheckTime.current;
    lastCheckTime.current = now;

    if (graphicsQuality === "high") {
      if (avgFPS < 35) {
        timeBelow32.current += elapsed;
        if (timeBelow32.current >= 4000) {
          console.log(`[PerformanceMonitor] FPS (${avgFPS.toFixed(1)}). Ajustando para qualidade média.`);
          setGraphicsQuality("medium");
          timeBelow32.current = 0;
          frameDeltas.current = [];
        }
      } else {
        timeBelow32.current = 0;
      }
    } else if (graphicsQuality === "medium") {
      if (avgFPS < 30) {
        timeBelow32.current += elapsed;
        if (timeBelow32.current >= 4000) {
          console.log(`[PerformanceMonitor] FPS (${avgFPS.toFixed(1)}). Ajustando para qualidade baixa.`);
          setGraphicsQuality("low");
          timeBelow32.current = 0;
          frameDeltas.current = [];
        }
      } else if (avgFPS >= 58) {
        timeAbove58.current += elapsed;
        if (timeAbove58.current >= 10000) {
          console.log(`[PerformanceMonitor] FPS (${avgFPS.toFixed(1)}). Elevando para qualidade alta.`);
          setGraphicsQuality("high");
          timeAbove58.current = 0;
          frameDeltas.current = [];
        }
      }
    } else if (graphicsQuality === "low") {
      if (avgFPS >= 55) {
        timeAbove58.current += elapsed;
        if (timeAbove58.current >= 10000) {
          console.log(`[PerformanceMonitor] FPS (${avgFPS.toFixed(1)}). Elevando para qualidade média.`);
          setGraphicsQuality("medium");
          timeAbove58.current = 0;
          frameDeltas.current = [];
        }
      } else {
        timeAbove58.current = 0;
      }
    }
  });

  return null;
}
