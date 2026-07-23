import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RouteData, ShipData } from "../../../types";
import { Language, translations } from "../../../translations";
import { getRouteBehavior } from "../../../routes/routeBehaviors";

interface TelemetryHUDProps {
  velocityRef: React.MutableRefObject<number>;
  energyRef: React.MutableRefObject<number>;
  multiplierRef?: React.MutableRefObject<number>;
  neonRingsRef?: React.MutableRefObject<any[]>;
  shipRef?: React.MutableRefObject<THREE.Group | null>;
  selectedRoute: RouteData;
  customRouteDataRef?: React.MutableRefObject<any>;
  language?: Language;
  finalTimeRef?: React.MutableRefObject<number>;
  selectedColor: any;
  shieldRef: React.MutableRefObject<number>;
  armorRef: React.MutableRefObject<number>;
  flightVectorRef?: React.RefObject<HTMLDivElement>;
  isHangarActive?: boolean;
}

const envTexts: Record<string, any> = {
  pt: {
    sectorStatus: "ESTADO DO SETOR",
    stable: "ESTÁVEL",
    engineTemp: "TEMP. MOTORES",
    iceFriction: "ATRITO DE GELO",
    outOfLine: "🔴 FORA DA LINHA!",
    excellent: "🟢 EXCELENTE",
    solarShockwave: "CHOC-WAVE SOLAR",
    waveIn: "ONDA EM: ",
    gravityWell: "GRAV. POÇO G",
    vacuumDraft: "DRAFT DE VÁCUO",
    enteringDraft: "🔥 ENTRANDO EM DRAFT",
    seekingLine: "BUSCANDO LINHA",
    iceAccumulated: "GELO ACUMULADO",
    empDischarge: "EMP DESCARGA",
    reversal: "⚡ REVERSÃO!",
    normal: "NORMAL",
    finished: "FINALIZADO",
    routeComplete: "ROTA COMPLETA ✓",
    automatedLaser: "LASER AUTOMÁTICO",
    laserActive: "🚨 LASER ATIVO",
    securePortal: "PORTAL SEGURO",
    oxygenFuel: "COMBUSTÍVEL O2",
    criticalAnomaly: "ANOMALIA AMBIENTAL CRÍTICA",
    criticalWarning: "AVISO DE EVENTO CRÍTICO",
    skillMultiplier: "MULTIPLICADOR",
    nextRing: "PRÓX. ARO",
    activeRing: "ARO ATIVO",
    distance: "DISTÂNCIA",
    totalTime: "TEMPO DE TRAJETO",
    sector: "SETOR",
    tutorial: "TUTORIAL",
    ringAlignment: "ALINHAMENTO COM ANÉIS",
    outOfTrack: "FORA DA TRILHA",
    aligned: "ALINHADO",
    shockwaveAbsorbed: "ONDA SOLAR ABSORVIDA POR ASTEROIDE ✓",
    shockwaveDevastating: "ONDA SOLAR DEVASTADORA! VELOCIDADE REDUZIDA",
    shockwaveTimerWarning: "SOMBREIE EM UM ASTEROIDE",
    attractionCritical: "CAMPO DE ATRAÇÃO CRÍTICO: ACELERAÇÃO MÁXIMA!",
    thrustersFrozen: "PROPULSORES MANOBRA CONGELADOS",
    slowControl: "CONTROLE LENTO",
    reversePolarity: "⚡ POLARIDADE REVERSA",
    invertedControls: "CONTROLES DE MANOBRA INVERTIDOS!",
    laserBarrier: "🚨 BARRIÈRE LASER EN COURS ! ESQUIVEZ !",
    o2ReserveCritical: "🔴 RESERVA DE O2 CRÍTICA",
    rechargeThroughRings: "ATRAVÉS DE AROS RECARREGA"
  },
  en: {
    sectorStatus: "SECTOR STATUS",
    stable: "STABLE",
    engineTemp: "ENGINE TEMP",
    iceFriction: "ICE FRICTION",
    outOfLine: "🔴 OUT OF LINE!",
    excellent: "🟢 EXCELLENT",
    solarShockwave: "SOLAR SHOCKWAVE",
    waveIn: "WAVE IN: ",
    gravityWell: "G-WELL GRAVITY",
    vacuumDraft: "VACUUM DRAFT",
    enteringDraft: "🔥 ENTERING DRAFT",
    seekingLine: "SEEKING LINE",
    iceAccumulated: "ICE ACCUMULATION",
    empDischarge: "EMP DISCHARGE",
    reversal: "⚡ REVERSAL!",
    normal: "NORMAL",
    finished: "FINISHED",
    routeComplete: "ROUTE COMPLETE ✓",
    automatedLaser: "AUTOMATED LASER",
    laserActive: "🚨 LASER ACTIVE",
    securePortal: "SECURE PORTAL",
    oxygenFuel: "O2 FUEL",
    criticalAnomaly: "CRITICAL ENVIRONMENTAL ANOMALY",
    criticalWarning: "CRITICAL EVENT WARNING",
    skillMultiplier: "MULTIPLIER",
    nextRing: "NEXT RING",
    activeRing: "ACTIVE RING",
    distance: "DISTANCE",
    totalTime: "TRAJECTORY TIME",
    sector: "SECTOR",
    tutorial: "TUTORIAL",
    ringAlignment: "RING ALIGNMENT",
    outOfTrack: "OUT OF TRACK",
    aligned: "ALIGNED",
    shockwaveAbsorbed: "SOLAR SHOCKWAVE ABSORBED BY ASTEROID ✓",
    shockwaveDevastating: "DEVASTATING SOLAR SHOCKWAVE! SPEED REDUCED",
    shockwaveTimerWarning: "SHADE BEHIND AN ASTEROID",
    attractionCritical: "CRITICAL ATTRACTION FIELD: MAXIMUM ACCELERATION!",
    thrustersFrozen: "MANEUVER THRUSTERS FROZEN",
    slowControl: "SLOW CONTROL",
    reversePolarity: "⚡ REVERSE POLARITY",
    invertedControls: "MANEUVER CONTROLS INVERTED!",
    laserBarrier: "🚨 LASER BARRIER IN PROGRESS! DODGE!",
    o2ReserveCritical: "🔴 O2 RESERVE CRITICAL",
    rechargeThroughRings: "RECHARGE THROUGH RINGS"
  },
  es: {
    sectorStatus: "ESTADO DEL SECTOR",
    stable: "ESTABLE",
    engineTemp: "TEMP. MOTORES",
    iceFriction: "FRICCIÓN DE HIELO",
    outOfLine: "🔴 ¡FUERA DE LÍNEA!",
    excellent: "🟢 EXCELENTE",
    solarShockwave: "ONDA DE CHOQUE SOLAR",
    waveIn: "ONDA EN: ",
    gravityWell: "POZO DE GRAVEDAD",
    vacuumDraft: "DRAFT DE VACÍO",
    enteringDraft: "🔥 ENTRANDO EN DRAFT",
    seekingLine: "BUSCANDO LÍNEA",
    iceAccumulated: "HIELO ACUMULADO",
    empDischarge: "DESCARGA EMP",
    reversal: "⚡ ¡REVERSIÓN!",
    normal: "NORMAL",
    finished: "FINALIZADO",
    routeComplete: "RUTA COMPLETADA ✓",
    automatedLaser: "LÁSER AUTOMÁTICO",
    laserActive: "🚨 LÁSER ACTIVO",
    securePortal: "PORTAL SEGURO",
    oxygenFuel: "COMBUSTIBLE O2",
    criticalAnomaly: "ANOMALÍA AMBIENTAL CRÍTICA",
    criticalWarning: "AVISO DE EVENTO CRÍTICO",
    skillMultiplier: "MULTIPLICADOR",
    nextRing: "PRÓX. ARO",
    activeRing: "ANILLO ACTIVO",
    distance: "DISTANCIA",
    totalTime: "TIEMPO DE TRAYECTO",
    sector: "SECTOR",
    tutorial: "TUTORIAL",
    ringAlignment: "ALINEACIÓN CON ANILLOS",
    outOfTrack: "FUERA DE LA PISTA",
    aligned: "ALINEADO",
    shockwaveAbsorbed: "ONDA SOLAR ABSORBIDA POR ASTEROIDE ✓",
    shockwaveDevastating: "¡ONDA SOLAR DEVASTADORA! VELOCIDAD REDUCIDA",
    shockwaveTimerWarning: "SOMBREE EN UN ASTEROIDE",
    attractionCritical: "¡CAMPO DE ATRACCIÓN CRÍTICO: ACELERACIÓN MÁXIMA!",
    thrustersFrozen: "PROPULSORES DE MANIOBRA CONGELADOS",
    slowControl: "CONTROL LENTO",
    reversePolarity: "⚡ POLARIDAD INVERSA",
    invertedControls: "¡CONTROLES DE MANIOBRA INVERTIDOS!",
    laserBarrier: "🚨 ¡BARRERA LÁSER EN CURSO! ¡ESQUIVA!",
    o2ReserveCritical: "🔴 RESERVA DE O2 CRÍTICA",
    rechargeThroughRings: "RECARGA A TRAVÉS DE LOS AROS"
  },
  fr: {
    sectorStatus: "ÉTAT DU SECTEUR",
    stable: "STABLE",
    engineTemp: "TEMP. MOTEURS",
    iceFriction: "FRICTION DE GLACE",
    outOfLine: "🔴 HORS LIGNE !",
    excellent: "🟢 EXCELLENT",
    solarShockwave: "ONDE DE CHOC SOLAIRE",
    waveIn: "ONDE DANS : ",
    gravityWell: "PUITS DE GRAVITÉ",
    vacuumDraft: "ASPIRATION DE VIDE",
    enteringDraft: "🔥 ENTRÉE EN ASPIRATION",
    seekingLine: "RECHERCHE DE LIGNE",
    iceAccumulated: "GLACE ACCUMULÉE",
    empDischarge: "DÉCHARGE EMP",
    reversal: "⚡ INVERSION !",
    normal: "NORMAL",
    finished: "TERMINÉ",
    routeComplete: "ROUTE COMPLÈTE ✓",
    automatedLaser: "LASER AUTOMATISÉ",
    laserActive: "🚨 LASER ACTIF",
    securePortal: "PORTAIL SÉCURISÉ",
    oxygenFuel: "CARBURANT O2",
    criticalAnomaly: "ANOMALIE ENVIRONNEMENTALE CRITIQUE",
    criticalWarning: "AVERTISSEMENT D'ÉVÉNEMENT CRITIQUE",
    skillMultiplier: "MULTIPLICATEUR",
    nextRing: "PROCHAIN ANNEAU",
    activeRing: "ANNEAU ACTIF",
    distance: "DISTANCE",
    totalTime: "TEMPS DE TRAJET",
    sector: "SECTEUR",
    tutorial: "TEMPS DE TRAJET",
    ringAlignment: "ALIGNEMENT DES ANNEAUX",
    outOfTrack: "HORS PISTE",
    aligned: "ALIGNÉ",
    shockwaveAbsorbed: "ONDE SOLAIRE ABSORBÉE PAR L'ASTÉROÏDE ✓",
    shockwaveDevastating: "ONDE SOLAIRE DÉVASTATRICE ! VITESSE RÉDUITE",
    shockwaveTimerWarning: "METTEZ-VOUS À L'OMBRE D'UN ASTÉROÏDE",
    attractionCritical: "CHAMP D'ATTRACTION CRITIQUE : ACCÉLÉRATION MAXIMALE !",
    thrustersFrozen: "PROPULSION DE MANOEUVRE GELÉE",
    slowControl: "CONTRÔLE LENT",
    reversePolarity: "⚡ INVERSION DE POLARITÉ",
    invertedControls: "COMMANDES DE MANOEUVRE INVERSÉES !",
    laserBarrier: "🚨 BARRIÈRE LASER EN COURS ! ESQUIVEZ !",
    o2ReserveCritical: "🔴 RÉSERVE D'O2 CRITIQUE",
    rechargeThroughRings: "RECHARGEZ VIA LES ANNEAUX"
  }
};

export function TelemetryHUD({
  velocityRef,
  energyRef,
  neonRingsRef,
  shipRef,
  selectedRoute,
  customRouteDataRef,
  language = "pt",
  finalTimeRef,
  selectedColor,
  flightVectorRef,
  isHangarActive = false,
}: TelemetryHUDProps) {
  const lang = language || "pt";
  const t = translations[lang];
  const currEnv = envTexts[lang] || envTexts.pt;

  const raceTimerRef = useRef(0);
  const raceStartedRef = useRef(false);
  const raceEndedRef = useRef(false);
  const lastTimeRef = useRef<number | null>(null);

  const velTextRef = useRef<HTMLSpanElement>(null);
  const energyLabelRef = useRef<HTMLSpanElement>(null);
  const energyTextRef = useRef<HTMLSpanElement>(null);
  const energyBarRef = useRef<HTMLDivElement>(null);
  const activeRingTextRef = useRef<HTMLSpanElement>(null);
  const activeRingDistRef = useRef<HTMLSpanElement>(null);

  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const radarDistanceTextRef = useRef<HTMLSpanElement>(null);
  const radarBadgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animFrame: number;
    raceTimerRef.current = 0;
    raceStartedRef.current = false;
    raceEndedRef.current = false;
    lastTimeRef.current = null;

    const localPosCopy = new THREE.Vector3();
    const shipQuatInverse = new THREE.Quaternion();
    const toRingWorld = new THREE.Vector3();
    const localPos = new THREE.Vector3();

    const update = () => {
      const now = performance.now();
      let dt = 0;
      if (lastTimeRef.current !== null) {
        dt = (now - lastTimeRef.current) / 1000;
      }
      lastTimeRef.current = now;

      if (velTextRef.current) {
        velTextRef.current.innerText = `${Math.max(0, Math.round(velocityRef.current * 4))}`;
      }

      const e = energyRef.current;
      const roundedE = Math.round(e);
      if (energyTextRef.current) energyTextRef.current.innerText = `${roundedE}%`;
      if (energyBarRef.current) energyBarRef.current.style.width = `${roundedE}%`;

      if (e < 25) {
        energyLabelRef.current?.classList.add("text-red-400", "animate-pulse");
        energyLabelRef.current?.classList.remove("text-emerald-400");
        energyTextRef.current?.classList.add("text-red-300");
        energyTextRef.current?.classList.remove("text-emerald-300");
        energyBarRef.current?.classList.add("bg-red-500");
        energyBarRef.current?.classList.remove("bg-emerald-400");
      } else {
        energyLabelRef.current?.classList.remove("text-red-400", "animate-pulse");
        energyLabelRef.current?.classList.add("text-emerald-400");
        energyTextRef.current?.classList.remove("text-red-300");
        energyTextRef.current?.classList.add("text-emerald-300");
        energyBarRef.current?.classList.remove("bg-red-500");
        energyBarRef.current?.classList.add("bg-emerald-400");
      }

      let activeRingIndex = -1;
      let activeRingDist = 0;
      let activeRingHex = "#a855f7";

      if (neonRingsRef && neonRingsRef.current && shipRef && shipRef.current) {
        const shipObj = shipRef.current;
        const shipPos = shipObj.position;
        const rings = neonRingsRef.current;
        for (let i = 0; i < rings.length; i++) {
          if (!rings[i].passed) {
            activeRingIndex = i;
            const ringPos = rings[i].pos;
            activeRingDist = Math.round(shipPos.distanceTo(ringPos));
            if (i === 0) {
              activeRingHex = "#10b981";
            } else if (i === rings.length - 1) {
              activeRingHex = "#ef4444";
            } else {
              activeRingHex = "#a855f7";
            }

            const shipQuat = shipObj.quaternion;
            shipQuatInverse.copy(shipQuat).invert();
            toRingWorld.subVectors(ringPos, shipPos);
            localPos.copy(toRingWorld).applyQuaternion(shipQuatInverse);
            localPosCopy.copy(localPos);
            break;
          }
        }
      }

      if (radarCanvasRef.current) {
        const canvas = radarCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const radarRadius = canvas.width / 2 - 4;

          const primaryHex = activeRingIndex === -1 ? "#10b981" : activeRingHex;

          ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
          ctx.beginPath();
          ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, radarRadius * 0.65, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, radarRadius * 0.3, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cx, cy - radarRadius);
          ctx.lineTo(cx, cy + radarRadius);
          ctx.moveTo(cx - radarRadius, cy);
          ctx.lineTo(cx + radarRadius, cy);
          ctx.stroke();

          const sweepAngle = (Date.now() / 1500) * Math.PI * 2;
          ctx.strokeStyle = "rgba(168, 85, 247, 0.12)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(sweepAngle) * radarRadius, cy + Math.sin(sweepAngle) * radarRadius);
          ctx.stroke();

          if (activeRingIndex !== -1) {
            const dx = localPosCopy.x;
            const dy = -localPosCopy.z;
            const dz = localPosCopy.y;

            const dist2D = Math.sqrt(dx * dx + dy * dy);
            const dirX = dist2D > 0.01 ? dx / dist2D : 0;
            const dirY = dist2D > 0.01 ? dy / dist2D : 0;

            const distFraction = Math.pow(Math.min(1.0, activeRingDist / 4200), 0.75);
            const diskR = radarRadius - 8;

            const baseX = cx + dirX * diskR * distFraction;
            const baseY = cy - dirY * diskR * distFraction;

            const elevY = baseY - dz * 0.012;
            const isBehind = dy < 0;

            ctx.strokeStyle = isBehind ? "rgba(239, 68, 68, 0.4)" : "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(baseX, baseY);
            ctx.lineTo(baseX, elevY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
            ctx.beginPath();
            ctx.ellipse(baseX, baseY, 3, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();

            const pulse = 0.85 + Math.sin(Date.now() / 150) * 0.15;
            const blipColor = isBehind ? "#ef4444" : primaryHex;

            ctx.shadowBlur = isBehind ? 4 : 12;
            ctx.shadowColor = blipColor;
            ctx.fillStyle = blipColor;

            ctx.beginPath();
            ctx.arc(baseX, elevY, (isBehind ? 3.5 : 4.5) * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = 6;
          ctx.shadowColor = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(cx, cy - 5);
          ctx.lineTo(cx - 4, cy + 4);
          ctx.lineTo(cx, cy + 2);
          ctx.lineTo(cx + 4, cy + 4);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      if (activeRingTextRef.current) {
        if (activeRingIndex === -1) {
          activeRingTextRef.current.innerText = currEnv.finished;
          activeRingTextRef.current.style.color = "#10b981";
          activeRingTextRef.current.classList.remove("animate-pulse");
        } else {
          activeRingTextRef.current.innerText = `${activeRingIndex + 1} / ${selectedRoute.numRings}`;
          activeRingTextRef.current.style.color = activeRingHex;

          if (activeRingIndex === selectedRoute.numRings - 1) {
            activeRingTextRef.current.classList.add("animate-pulse");
          } else {
            activeRingTextRef.current.classList.remove("animate-pulse");
          }
        }
      }

      const rings = neonRingsRef?.current || [];
      const numRings = selectedRoute.numRings;

      const firstPassed = rings[0]?.passed || raceStartedRef.current;
      const lastPassed = rings[numRings - 1]?.passed;

      if (firstPassed && !raceEndedRef.current) {
        raceStartedRef.current = true;
        if (lastPassed) {
          raceEndedRef.current = true;
          if (finalTimeRef) finalTimeRef.current = raceTimerRef.current;
        } else {
          raceTimerRef.current += dt;
          if (finalTimeRef) finalTimeRef.current = raceTimerRef.current;
        }
      }

      const formatTime = (seconds: number) => {
        if (seconds >= 60) {
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          const ms = Math.floor((seconds % 1) * 100);
          return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        } else {
          const ms = Math.floor((seconds % 1) * 100);
          return `${seconds.toFixed(2)}s`;
        }
      };

      if (activeRingDistRef.current) {
        activeRingDistRef.current.innerText = formatTime(raceTimerRef.current);
        if (raceEndedRef.current) {
          activeRingDistRef.current.style.color = "#10b981";
        } else if (raceStartedRef.current) {
          activeRingDistRef.current.style.color = "#22d3ee";
        } else {
          activeRingDistRef.current.style.color = "#a1a1aa";
        }
      }

      if (radarDistanceTextRef.current) {
        if (activeRingIndex === -1) {
          radarDistanceTextRef.current.innerText = currEnv.routeComplete;
        } else {
          radarDistanceTextRef.current.innerText = `${activeRingDist} m`;
        }
      }

      if (radarBadgeRef.current) {
        if (activeRingIndex === -1) {
          radarBadgeRef.current.style.color = "#10b981";
          radarBadgeRef.current.style.borderColor = "rgba(16, 185, 129, 0.2)";
          radarBadgeRef.current.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.15)";
        } else {
          radarBadgeRef.current.style.color = activeRingHex;
          radarBadgeRef.current.style.borderColor = `${activeRingHex}25`;
          radarBadgeRef.current.style.boxShadow = `0 0 10px ${activeRingHex}15`;
        }
      }

      const envLabel = document.getElementById("env-label");
      const envValueText = document.getElementById("env-value-text");
      const envBarContainer = document.getElementById("env-bar-container");
      const envBarFill = document.getElementById("env-bar-fill");
      const dangerAlert = document.getElementById("hud-danger-alert");
      const dangerText = document.getElementById("hud-danger-text");

      if (customRouteDataRef && customRouteDataRef.current) {
        const data = customRouteDataRef.current;

        if (dangerAlert && dangerText) {
          if (data.warningActive && data.warningText) {
            let translatedWarning = data.warningText;
            const w = data.warningText;
            if (w.includes("FORA DA LINHA") || w.includes("OUT OF LINE")) {
              translatedWarning = currEnv.outOfLine;
            } else if (w.includes("SUPERNOVA EM") || w.includes("SUPERNOVA IN")) {
              translatedWarning = `${currEnv.solarShockwave} - ${data.shockwaveTimer.toFixed(1)}s`;
            } else if (w.includes("REVERSÃO") || w.includes("REVERSAL") || w.includes("POLARIDADE REVERSA")) {
              translatedWarning = currEnv.invertedControls;
            } else if (w.includes("LASER")) {
              translatedWarning = currEnv.laserActive;
            } else if (w.includes("TEMPERATURA DOS MOTORES CRÍTICA")) {
              translatedWarning = `${currEnv.engineTemp} CRÍTICA!`;
            } else if (w.includes("FORA DA TRILHA DE POEIRA")) {
              translatedWarning = currEnv.outOfTrack;
            } else if (w.includes("ONDA SOLAR ABSORVIDA")) {
              translatedWarning = currEnv.shockwaveAbsorbed;
            } else if (w.includes("ONDA SOLAR DEVASTADORA")) {
              translatedWarning = currEnv.shockwaveDevastating;
            } else if (w.includes("SOMBREIE EM UM ASTEROIDE")) {
              translatedWarning = currEnv.shockwaveTimerWarning;
            } else if (w.includes("CAMPO DE ATRAÇÃO CRÍTICO")) {
              translatedWarning = currEnv.attractionCritical;
            } else if (w.includes("PROPULSORES MANOBRA CONGELADOS")) {
              translatedWarning = `${currEnv.thrustersFrozen} (${Math.round(data.ice)}%): ${currEnv.slowControl}`;
            } else if (w.includes("BARREIRA DE LASER EM CURSO")) {
              translatedWarning = currEnv.laserBarrier;
            } else if (w.includes("RESERVA DE O2 CRÍTICA")) {
              translatedWarning = `${currEnv.o2ReserveCritical}: ${Math.round(data.fuel)}%! ${currEnv.rechargeThroughRings}`;
            }
            dangerText.innerText = translatedWarning;
            dangerAlert.classList.remove("opacity-0", "scale-95", "translate-y-[-10px]");
            dangerAlert.classList.add("opacity-100", "scale-100", "translate-y-0");
          } else {
            dangerAlert.classList.add("opacity-0", "scale-95", "translate-y-[-10px]");
            dangerAlert.classList.remove("opacity-100", "scale-100", "translate-y-0");
          }
        }

        if (envLabel && envValueText && envBarContainer && envBarFill) {
          getRouteBehavior(selectedRoute.id).updateHUDStatus(data, currEnv, envLabel, envValueText, envBarContainer, envBarFill);
        }
      }

      animFrame = requestAnimationFrame(update);
    };

    animFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrame);
  }, [neonRingsRef, shipRef, velocityRef, energyRef, customRouteDataRef, selectedRoute, language, currEnv]);

  return (
    <>
      <style>{`
        @keyframes radar-sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes blip-glow {
          0%, 100% { transform: translate(-50%, 50%) scale(0.85); opacity: 0.7; }
          50% { transform: translate(-50%, 50%) scale(1.15); opacity: 1; }
        }
        @keyframes radar-ping {
          0% { transform: translate(-50%, 50%) scale(0.8); opacity: 0.8; }
          100% { transform: translate(-50%, 50%) scale(2.4); opacity: 0; }
        }
      `}</style>

      <div 
        id="hud-danger-alert" 
        className="absolute top-24 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-950/80 border border-red-500/30 backdrop-blur-md rounded-lg flex flex-col items-center justify-center gap-1 shadow-[0_0_25px_rgba(239,68,68,0.25)] select-none pointer-events-none transition-all duration-300 opacity-0 scale-95 z-20"
      >
        <span className="text-red-400 text-[10px] font-bold font-mono tracking-widest animate-pulse flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
          {currEnv.criticalAnomaly}
        </span>
        <span id="hud-danger-text" className="text-white text-xs font-bold font-mono tracking-wider uppercase text-center">
          {currEnv.criticalWarning}
        </span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <div className="relative flex flex-col items-center justify-center">
          <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center relative">
            <div className="absolute left-[-12px] w-3.5 h-[1px] bg-white/10" />
            <div className="absolute right-[-12px] w-3.5 h-[1px] bg-white/10" />
            <div className="absolute top-[-12px] h-3.5 w-[1px] bg-white/10" />
            <div className="absolute bottom-[-12px] h-3.5 w-[1px] bg-white/10" />
            
            <div 
              ref={flightVectorRef}
              id="flight-vector" 
              className="absolute w-4 h-4 rounded-full border flex items-center justify-center shadow-lg transition-transform duration-75 ease-out"
              style={{ 
                borderColor: selectedColor.colorHex, 
                backgroundColor: `${selectedColor.colorHex}22`,
                boxShadow: `0 0 10px ${selectedColor.colorHex}55`,
                transform: 'translate3d(0px, 0px, 0)'
              }}
            >
              <div 
                className="w-1 h-1 rounded-full" 
                style={{ backgroundColor: selectedColor.colorHex }}
              />
            </div>
            
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          
          {!document.pointerLockElement && (
            <span className="text-[8px] font-bold font-mono tracking-widest text-zinc-500 uppercase mt-3 animate-pulse">
              {t.mouseControlActive}
            </span>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-10 pointer-events-auto select-none flex flex-col items-center gap-3">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-[140px] h-[140px] relative border border-white/15 bg-black/75 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center">
            <canvas 
              ref={radarCanvasRef} 
              width={140} 
              height={140} 
              className="rounded-full"
            />
          </div>

          <div 
            ref={radarBadgeRef}
            className="px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded border border-white/5 text-[8px] font-bold font-mono tracking-widest uppercase shadow-md flex items-center gap-1.5"
          >
            <span>{currEnv.nextRing}</span>
            <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
            <span ref={radarDistanceTextRef}>--- m</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/5 w-[200px] font-mono shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[8px] tracking-wider text-zinc-400">
            <span className="font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              {t.telemetry}
            </span>
            <span className="text-[7px] text-zinc-600">SYS_OK</span>
          </div>
          
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-zinc-500 uppercase tracking-widest text-[8px]">{t.speedLabel}</span>
            <span className="font-bold text-cyan-300 flex items-center gap-0.5">
              <span ref={velTextRef}>0</span> <span className="text-[7px] text-zinc-500">km/s</span>
            </span>
          </div>

          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="flex justify-between items-center text-[8px] font-bold">
              <span ref={energyLabelRef} className="text-emerald-400 uppercase tracking-widest">{t.energy}</span>
              <span ref={energyTextRef} className="text-emerald-300">100%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
              <div 
                ref={energyBarRef}
                className="h-full bg-emerald-400 transition-all duration-150" 
                style={{ width: `100%` }} 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-1 pt-1.5 border-t border-white/5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-widest text-[8px]">{currEnv.activeRing}</span>
              <span ref={activeRingTextRef} className="font-bold font-mono tracking-wider">1 / {selectedRoute.numRings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-widest text-[8px]">{currEnv.totalTime}</span>
              <span ref={activeRingDistRef} className="font-bold font-mono text-cyan-400">0.00s</span>
            </div>
          </div>

          <div id="env-module" className="flex flex-col gap-1 mt-1 pt-1.5 border-t border-white/10 text-[10px]">
            <div className="flex justify-between items-center">
              <span id="env-label" className="text-zinc-500 uppercase tracking-widest text-[8px]">{currEnv.sector}</span>
              <span id="env-value-text" className="font-bold text-zinc-300">{currEnv.stable}</span>
            </div>
            <div id="env-bar-container" className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5 hidden">
              <div 
                id="env-bar-fill"
                className="h-full bg-purple-500 transition-all duration-75" 
                style={{ width: `0%` }} 
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default TelemetryHUD;
