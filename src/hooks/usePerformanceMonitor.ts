import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export interface UsePerformanceMonitorProps {
  graphicsQuality: "high" | "low";
  setGraphicsQuality: (q: "high" | "low") => void;
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

    // Skip the first 5 seconds of the simulator to avoid load spikes (shader compile, model loading)
    if (timeSinceMount < 5000) {
      lastCheckTime.current = now;
      return;
    }

    // Respect manual user selection
    let isManual = false;
    try {
      isManual = localStorage.getItem("graphicsQualityManual") === "true";
    } catch (e) {}

    if (isManual) {
      return;
    }

    // Record frame delta
    frameDeltas.current.push({ time: now, delta });

    // Clean up frames older than 2.5 seconds (2500ms sliding window)
    const windowStart = now - 2500;
    frameDeltas.current = frameDeltas.current.filter((f) => f.time >= windowStart);

    // We need at least some frames to calculate average FPS
    if (frameDeltas.current.length < 30) {
      lastCheckTime.current = now;
      return;
    }

    // Calculate sliding average FPS
    const totalDelta = frameDeltas.current.reduce((sum, f) => sum + f.delta, 0);
    const avgFPS = frameDeltas.current.length / totalDelta;

    const elapsed = now - lastCheckTime.current;
    lastCheckTime.current = now;

    if (graphicsQuality === "high") {
      if (avgFPS < 32) {
        timeBelow32.current += elapsed;
        if (timeBelow32.current >= 4000) { // 4 seconds continuous
          console.log(`[PerformanceMonitor] Low FPS detected (${avgFPS.toFixed(1)}). Downgrading to low quality.`);
          setGraphicsQuality("low");
          timeBelow32.current = 0;
          timeAbove58.current = 0;
          frameDeltas.current = [];
        }
      } else {
        timeBelow32.current = 0;
      }
    } else if (graphicsQuality === "low") {
      if (avgFPS >= 58) {
        timeAbove58.current += elapsed;
        if (timeAbove58.current >= 12000) { // 12 seconds continuous
          console.log(`[PerformanceMonitor] High FPS detected (${avgFPS.toFixed(1)}). Upgrading to high quality.`);
          setGraphicsQuality("high");
          timeBelow32.current = 0;
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
