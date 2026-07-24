import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ShipData, RouteData } from "../../types";
import { getRouteBehavior } from "../../routes/routeBehaviors";
import { audioService } from "../../services/audioService";

const playSimSound = (type: any, _muted: boolean) => audioService.playSfx(type);

interface GameEngineProps {
  shipRef: React.MutableRefObject<THREE.Group | null>;
  velocityRef: React.MutableRefObject<number>;
  baseQuat: React.MutableRefObject<THREE.Quaternion>;
  isHangarActive: boolean;
  setIsHangarActive: (val: boolean) => void;
  takeoffProgressRef: React.MutableRefObject<number>;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  keysRef: React.MutableRefObject<any>;
  scoreRef: React.MutableRefObject<number>;
  multiplierRef: React.MutableRefObject<number>;
  planets: any[];
  asteroids: any[];
  satellites: any[];
  abilityActive: boolean;
  setAbilityActive: (val: boolean) => void;
  energyRef: React.MutableRefObject<number>;
  currentShip: ShipData;
  createExplosion: (pos: THREE.Vector3, color: string) => void;
  localMuted: boolean;
  shieldRef: React.MutableRefObject<number>;
  armorRef: React.MutableRefObject<number>;
  flightVectorRef: React.RefObject<HTMLDivElement>;
  setIsGameOver: (val: boolean) => void;
  setIsVictory: (val: boolean) => void;
  trafficShips: any[];
  shakeRef: React.MutableRefObject<number>;
  explosionsRef: React.MutableRefObject<any[]>;
  selectedColor: any;
  countdown: any;
  stats: any;
  neonRingsRef: React.MutableRefObject<any[]>;
  selectedRoute: RouteData;
  customRouteDataRef: React.MutableRefObject<any>;
  asteroidsChangedRef: React.MutableRefObject<boolean>;
  repulsionVelRef: React.MutableRefObject<THREE.Vector3>;
  isPaused?: boolean;
}

export function GameEngine({
  shipRef,
  velocityRef,
  baseQuat,
  isHangarActive,
  setIsHangarActive,
  takeoffProgressRef,
  pointerRef,
  keysRef,
  scoreRef,
  multiplierRef,
  planets,
  asteroids,
  satellites,
  abilityActive,
  setAbilityActive,
  energyRef,
  currentShip,
  createExplosion,
  localMuted,
  shieldRef,
  armorRef,
  flightVectorRef,
  setIsGameOver,
  setIsVictory,
  trafficShips,
  shakeRef,
  explosionsRef,
  selectedColor,
  countdown,
  stats,
  neonRingsRef,
  selectedRoute,
  customRouteDataRef,
  asteroidsChangedRef,
  repulsionVelRef,
  isPaused = false,
}: GameEngineProps) {
  const { camera } = useThree();
  
  const cameraOffset = useRef(new THREE.Vector3(0, 2.5, 15));
  const cameraLagQuat = useRef(new THREE.Quaternion());
  const cameraLagInitialized = useRef(false);
  const collisionCooldownRef = useRef(0);

  // Performance-optimized reusable scratchpads for 60fps simulation (prevents GC stutters)
  const v_targetOff = useRef(new THREE.Vector3());
  const v_sp = useRef(new THREE.Vector3());
  const v_tcp = useRef(new THREE.Vector3());
  const v_hangarCamOffset = useRef(new THREE.Vector3());
  const v_spaceCamOffset = useRef(new THREE.Vector3());
  const v_rco = useRef(new THREE.Vector3());
  const v_targetCamPos = useRef(new THREE.Vector3());
  const v_hangarUp = useRef(new THREE.Vector3());
  const v_spaceUp = useRef(new THREE.Vector3());
  const v_hangarLookAt = useRef(new THREE.Vector3());
  const v_spaceLookAt = useRef(new THREE.Vector3());
  const q_deltaQuat = useRef(new THREE.Quaternion());
  const e_deltaEuler = useRef(new THREE.Euler());
  const v_forward = useRef(new THREE.Vector3());
  const m_tempMat = useRef(new THREE.Matrix4());
  const q_leveledQuat = useRef(new THREE.Quaternion());
  const q_rollQuat = useRef(new THREE.Quaternion());
  const v_axisZ = useRef(new THREE.Vector3(0, 0, 1));
  const v_pull = useRef(new THREE.Vector3());
  const v_fd = useRef(new THREE.Vector3());
  const v_np = useRef(new THREE.Vector3());
  const v_pushDir = useRef(new THREE.Vector3());
  const q_tempQuat = useRef(new THREE.Quaternion());
  const v_temp1 = useRef(new THREE.Vector3());
  const v_temp2 = useRef(new THREE.Vector3());
  const v_temp3 = useRef(new THREE.Vector3());
  const movementDirRef = useRef(new THREE.Vector3(0, 0, -1));

  useFrame((state, delta) => {
    const ship = shipRef.current;
    if (!ship) return;

    if (isPaused) {
      audioService.updateEngine(0, false, true);
      return;
    }

    const dt = Math.min(delta, 0.1);

    // Processar vetor de repulsão física elástica
    if (repulsionVelRef && repulsionVelRef.current && repulsionVelRef.current.lengthSq() > 0.01) {
      ship.position.addScaledVector(repulsionVelRef.current, dt);
      repulsionVelRef.current.lerp(v_temp1.current.set(0, 0, 0), dt * 7.5);
    }

    // Atualizar som do motor e turbo (Web Audio API)
    audioService.updateEngine(
      velocityRef.current,
      keysRef.current[" "] || keysRef.current.ArrowUp,
      localMuted
    );
    audioService.updateListenerPosition(ship.position);

    // Amortecimento dinâmico: os controles retornam suavemente ao centro quando não há input ativo
    const damping = Math.exp(-dt * 2.8);
    pointerRef.current.x *= damping;
    pointerRef.current.y *= damping;

    // WASD steering support (same function as mouse)
    const kbRate = 3.5 * dt;
    if (keysRef.current.w) pointerRef.current.y = Math.min(1.5, pointerRef.current.y + kbRate);
    if (keysRef.current.s) pointerRef.current.y = Math.max(-1.5, pointerRef.current.y - kbRate);
    if (keysRef.current.a) pointerRef.current.x = Math.max(-1.5, pointerRef.current.x - kbRate);
    if (keysRef.current.d) pointerRef.current.x = Math.min(1.5, pointerRef.current.x + kbRate);

    // Zona morta mínima para evitar micro-oscilações
    if (Math.abs(pointerRef.current.x) < 0.001) pointerRef.current.x = 0;
    if (Math.abs(pointerRef.current.y) < 0.001) pointerRef.current.y = 0;

    // Atualizar a posição do retículo dinâmico no HUD (60 FPS)
    const vectorEl = flightVectorRef.current;
    if (vectorEl) {
      const xPx = (pointerRef.current.x / 1.5) * 44;
      const yPx = -(pointerRef.current.y / 1.5) * 44;
      vectorEl.style.transform = `translate3d(${xPx}px, ${yPx}px, 0)`;
    }

    if (collisionCooldownRef.current > 0) collisionCooldownRef.current -= dt;

    // Penalize multiplier on damage or out-of-line
    const resetMultiplier = () => {
      if (multiplierRef.current > 1) {
        multiplierRef.current = 1;
        shakeRef.current = Math.max(shakeRef.current, 0.8);
      }
    };

    // Handle Energy & Turbo Drain/Recharge
    let isCurrentlyBoosting = abilityActive;

    const maxVelocityStat = stats?.maxVelocity || 80;
    const accelerationStat = stats?.acceleration || 50;
    const massStat = stats?.mass || 50;

    if (!isHangarActive) {
      const turboStat = stats?.turbo ?? 50;
      const energyStat = stats?.energy ?? 50;

      const massEnergyBonus = 0.8 + (massStat / 120.0) * 0.8;
      const drainTimeSeconds = (1.0 + (energyStat / 100.0) * 8.0) * massEnergyBonus;

      const massRechargeBonus = 1.0 + (massStat / 120.0) * 0.5;
      const rechargeTimeSeconds = (12.0 - (energyStat / 100.0) * 7.5) / massRechargeBonus;

      const drainPerSecond = 100.0 / drainTimeSeconds;
      const rechargePerSecond = 100.0 / rechargeTimeSeconds;

      const isAttemptingBoost =
        keysRef.current[" "] || keysRef.current.ArrowUp || keysRef.current.Shift || keysRef.current.e;

      const canStartBoost = !abilityActive && energyRef.current >= 20;
      const canContinueBoost = abilityActive && energyRef.current > 0;

      if (isAttemptingBoost && (canStartBoost || canContinueBoost)) {
        if (!abilityActive) {
          setAbilityActive(true);
          playSimSound("ability", localMuted);
          if (currentShip.id === "sparrow-01") {
            playSimSound("warp", localMuted);
          }
        }
        energyRef.current = Math.max(0, energyRef.current - drainPerSecond * dt);
        isCurrentlyBoosting = true;
      } else {
        if (abilityActive) {
          setAbilityActive(false);
        }
        energyRef.current = Math.min(100, energyRef.current + rechargePerSecond * dt);
        isCurrentlyBoosting = false;
      }
    }

    const maneuverability = 0.75 + ((120 - massStat) / 120) * 0.75;

    let effectiveManeuverability = maneuverability;
    if (customRouteDataRef && customRouteDataRef.current && selectedRoute.id === "route-ice-field") {
      const data = customRouteDataRef.current;
      if (data.ice !== undefined) {
        effectiveManeuverability = maneuverability * (1.0 - (data.ice / 100.0) * 0.7);
      }
    }

    const baseMaxSpeed = 150 + (maxVelocityStat / 100) * 280;

    const turboStat = stats?.turbo ?? 50;
    const massTurboBonus = (massStat / 120.0) * 0.6;
    const boostSpeedMultiplier = 1.6 + (turboStat / 100) * 1.4 + massTurboBonus;
    const currentMaxSpeed = isCurrentlyBoosting ? baseMaxSpeed * boostSpeedMultiplier : baseMaxSpeed;

    const massAccelBaseFactor = 1.1 - (massStat / 120.0) * 0.3;
    const baseAccelRate = (80 + (accelerationStat / 100) * 520) * massAccelBaseFactor;

    const massTurboAccelBonus = (massStat / 120.0) * 1.2;
    const boostAccelMultiplier = 1.3 + (turboStat / 100) * 1.7 + massTurboAccelBonus;
    const currentAccelRate = isCurrentlyBoosting ? baseAccelRate * boostAccelMultiplier : baseAccelRate;

    if (isHangarActive) {
      if (takeoffProgressRef.current !== 1) {
        ship.position.set(0, 0, 0);
        velocityRef.current = 0;
        baseQuat.current.identity();
        ship.quaternion.identity();
        movementDirRef.current.set(0, 0, -1);
        takeoffProgressRef.current = 1;
      }
      cameraLagInitialized.current = false;

      const targetOff = v_targetOff.current.set(0, 0, -1);
      cameraOffset.current.copy(targetOff);
      const sp = v_sp.current.copy(ship.position);
      const tcp = v_tcp.current.copy(sp).add(cameraOffset.current);
      state.camera.position.copy(tcp);
      state.camera.lookAt(sp.x, sp.y, sp.z - 100);
      return;
    }

    takeoffProgressRef.current = THREE.MathUtils.lerp(takeoffProgressRef.current, 1, dt * 1.5);
    const transitionFactor = takeoffProgressRef.current;

    let ptr = pointerRef.current.y * 1.5 * transitionFactor;
    let ytr = -pointerRef.current.x * 1.5 * transitionFactor;
    let rtr = 0;

    if (keysRef.current.w) ptr += 1.6 * transitionFactor;
    if (keysRef.current.s) ptr -= 1.6 * transitionFactor;
    if (keysRef.current.ArrowUp && !isCurrentlyBoosting) ptr += 1.6 * transitionFactor;
    if (keysRef.current.ArrowDown) ptr -= 1.6 * transitionFactor;
    if (keysRef.current.ArrowLeft) ytr -= 1.6 * transitionFactor;
    if (keysRef.current.ArrowRight) ytr += 1.6 * transitionFactor;

    if (keysRef.current.a) rtr -= 2.2 * transitionFactor;
    if (keysRef.current.d) rtr += 2.2 * transitionFactor;

    if (customRouteDataRef && customRouteDataRef.current && customRouteDataRef.current.controlGlitched) {
      ptr = -ptr;
      ytr = -ytr;
    }

    const deltaQuat = q_deltaQuat.current.setFromEuler(
      e_deltaEuler.current.set(
        ptr * dt * effectiveManeuverability,
        ytr * dt * effectiveManeuverability,
        rtr * dt * effectiveManeuverability,
        "YXZ"
      )
    );
    baseQuat.current.multiply(deltaQuat);

    if (!keysRef.current.a && !keysRef.current.d) {
      const forward = v_forward.current.set(0, 0, -1).applyQuaternion(baseQuat.current);
      if (Math.abs(forward.y) < 0.99) {
        const tempMat = m_tempMat.current.lookAt(v_temp1.current.set(0, 0, 0), forward, v_temp2.current.set(0, 1, 0));
        const leveledQuat = q_leveledQuat.current.setFromRotationMatrix(tempMat);
        baseQuat.current.slerp(leveledQuat, dt * 2.5);
      }
    }

    const tPitch = pointerRef.current.y * 0.75 * effectiveManeuverability * transitionFactor;
    const tYaw = -pointerRef.current.x * 0.4 * effectiveManeuverability * transitionFactor;
    const tRoll = -pointerRef.current.x * 0.85 * effectiveManeuverability * transitionFactor;

    const visualQuat = q_rollQuat.current.setFromEuler(e_deltaEuler.current.set(tPitch, tYaw, tRoll, "YXZ"));

    ship.quaternion.slerp(
      q_tempQuat.current.copy(baseQuat.current).multiply(visualQuat),
      dt * 7.0 * effectiveManeuverability
    );
    
    let tv = velocityRef.current;
    if (isCurrentlyBoosting) {
      if (tv > currentMaxSpeed) {
        tv = THREE.MathUtils.lerp(tv, currentMaxSpeed, dt * 1.5);
      } else {
        tv = Math.min(currentMaxSpeed, velocityRef.current + dt * currentAccelRate);
      }
    } else if (keysRef.current.s || keysRef.current.ArrowDown) {
      tv = Math.max(50, velocityRef.current - dt * currentAccelRate);
    } else {
      if (tv > baseMaxSpeed) {
        tv = THREE.MathUtils.lerp(tv, baseMaxSpeed, dt * 1.0);
      } else {
        tv = Math.min(baseMaxSpeed, velocityRef.current + dt * currentAccelRate * 0.5);
      }
    }
    velocityRef.current = tv;

    // Update moving asteroids
    if (selectedRoute.hasMovingAsteroids) {
      asteroids.forEach((a: any) => {
        if (a.velocity) {
          a.pos.addScaledVector(a.velocity, dt);
        }
      });
    }

    // UPDATE ROUTE-SPECIFIC MECHANICS IN FRAME LOOP
    if (!isHangarActive && customRouteDataRef && customRouteDataRef.current) {
      const data = customRouteDataRef.current;
      const currentPos = ship.position;

      data.warningActive = false;
      data.warningText = "";
      data.draftActive = false;
      data.controlGlitched = false;

      getRouteBehavior(selectedRoute.id).updateTick(
        dt,
        data,
        currentPos,
        velocityRef,
        currentMaxSpeed,
        energyRef,
        asteroids,
        trafficShips,
        neonRingsRef,
        state.clock.elapsedTime,
        isCurrentlyBoosting,
        resetMultiplier,
        shakeRef,
        createExplosion,
        playSimSound,
        localMuted,
        ship as any
      );
    }

    // Apply gravity well effect if active
    if (selectedRoute.gravityWell && !isHangarActive) {
      const pullStrength = 0.25;
      const pull = v_pull.current.set(-ship.position.x, -ship.position.y, 0).multiplyScalar(dt * pullStrength);
      ship.position.add(pull);
    }

    const fd = v_fd.current.set(0, 0, -1).applyQuaternion(ship.quaternion);

    const alignmentRate = 18.0 - (massStat / 120) * 11.5;
    if (!isHangarActive) {
      movementDirRef.current.lerp(fd, dt * alignmentRate).normalize();
    } else {
      movementDirRef.current.copy(fd);
    }

    const np = v_np.current.copy(ship.position).addScaledVector(movementDirRef.current, tv * dt);
    let cm = true;
    const canTakeDamage = collisionCooldownRef.current <= 0;

    // Collision with Planets
    for (let p of planets) {
      const distSq = np.distanceToSquared(p.pos);
      const minCDist = p.radius + 15;
      if (distSq < minCDist * minCDist) {
        cm = false;

        velocityRef.current = Math.max(20, velocityRef.current * 0.25);
        shakeRef.current = Math.max(0.6, 2.5 - (massStat / 120) * 1.5);

        const pushDir = v_pushDir.current.subVectors(ship.position, p.pos).normalize();
        if (pushDir.lengthSq() === 0) pushDir.set(0, 1, -1).normalize();

        ship.position.copy(p.pos).addScaledVector(pushDir, minCDist + 8.0);
        if (repulsionVelRef && repulsionVelRef.current) {
          repulsionVelRef.current.copy(pushDir).multiplyScalar(130.0);
        }

        if (canTakeDamage) {
          playSimSound("hull_hit", localMuted);
          resetMultiplier();
          collisionCooldownRef.current = 0.5;
        }
        break;
      }
    }

    // Collision with Satellites
    if (cm) {
      for (let s of satellites) {
        const sDist = s.scale * 1.5 + 4;
        if (np.distanceToSquared(s.pos) < sDist * sDist) {
          cm = false;

          velocityRef.current = Math.max(25, velocityRef.current * 0.35);
          shakeRef.current = Math.max(0.3, 1.5 - (massStat / 120) * 1.1);
          createExplosion(s.pos, "#ffffff");

          const pushDir = v_pushDir.current.subVectors(ship.position, s.pos).normalize();
          if (pushDir.lengthSq() === 0) pushDir.set(0, 1, -1).normalize();

          ship.position.copy(s.pos).addScaledVector(pushDir, sDist + 4.0);
          if (repulsionVelRef && repulsionVelRef.current) {
            repulsionVelRef.current.copy(pushDir).multiplyScalar(85.0);
          }

          if (canTakeDamage) {
            resetMultiplier();
            playSimSound("hull_hit", localMuted);
            collisionCooldownRef.current = 0.4;
          }
          break;
        }
      }
    }

    if (cm) ship.position.copy(np);

    // Optimized asteroid checking and wrapping loop
    const tempScatter = v_temp3.current;
    const shipZ = ship.position.z;
    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i];
      if (!a) continue;

      const zDiff = a.pos.z - shipZ;
      const absZDiff = Math.abs(zDiff);

      if (absZDiff < 2500) {
        const aDist = 3.6 + a.scale * 0.9;
        const distSq = ship.position.distanceToSquared(a.pos);
        if (distSq < aDist * aDist) {
          cm = false;
          velocityRef.current = Math.max(30, velocityRef.current * 0.35);

          const pushDir = v_pushDir.current.subVectors(ship.position, a.pos).normalize();
          if (pushDir.lengthSq() === 0) pushDir.set(0, 1, -1).normalize();

          ship.position.copy(a.pos).addScaledVector(pushDir, aDist + 3.0);

          if (repulsionVelRef && repulsionVelRef.current) {
            repulsionVelRef.current.copy(pushDir).multiplyScalar(95.0);
          }

          if (canTakeDamage) {
            if (
              isCurrentlyBoosting &&
              ["sparrow-03", "sparrow-06", "sparrow-17", "sparrow-20"].includes(currentShip.id)
            ) {
              createExplosion(a.pos, "#00ffea");
              playSimSound("shield_hit", localMuted);
              collisionCooldownRef.current = 0.1;
            } else {
              shakeRef.current = Math.max(0.3, 1.5 - (massStat / 120) * 1.1);
              createExplosion(ship.position, "#ff3a00");
              playSimSound("hull_hit", localMuted);
              collisionCooldownRef.current = 0.35;
            }
          }
        }
      } else if (zDiff > 25000) {
        tempScatter.set((Math.random() - 0.5) * 40000, (Math.random() - 0.5) * 15000, (Math.random() - 0.5) * 40000);
        a.pos.copy(ship.position).addScaledVector(fd, 30000 + Math.random() * 20000).add(tempScatter);
        if (asteroidsChangedRef) {
          asteroidsChangedRef.current = true;
        }
      }
    }

    if (neonRingsRef && neonRingsRef.current) {
      neonRingsRef.current.forEach((ring: any, index: number) => {
        if (!ring.passed) {
          let allPreviousPassed = true;
          for (let prevIdx = 0; prevIdx < index; prevIdx++) {
            if (!neonRingsRef.current[prevIdx].passed) {
              allPreviousPassed = false;
              break;
            }
          }

          if (allPreviousPassed) {
            const distSq = ship.position.distanceToSquared(ring.pos);
            if (distSq < ring.radius * ring.radius) {
              ring.passed = true;
              playSimSound("ability", localMuted);
              energyRef.current = Math.min(100, energyRef.current + 8);
              velocityRef.current = Math.min(currentMaxSpeed * 1.25, velocityRef.current + 150);

              if (selectedRoute.id === "route-void" && customRouteDataRef && customRouteDataRef.current) {
                customRouteDataRef.current.fuel = Math.min(100, customRouteDataRef.current.fuel + 45);
              }

              if (index === neonRingsRef.current.length - 1) {
                setTimeout(() => {
                  setIsVictory(true);
                  playSimSound("warp", localMuted);
                }, 500);
              }
            }
          }
        }
      });
    }

    // LATEUPDATE CAMERA TRACKING
    const hangarCamOffset = v_hangarCamOffset.current.set(0, 1.2, 3.5);

    const currentSpeed = velocityRef.current;
    const speedFactor = Math.max(0, Math.min(1.0, currentSpeed / currentMaxSpeed));
    const isBoost =
      keysRef.current[" "] ||
      keysRef.current.ArrowUp ||
      keysRef.current.Shift ||
      keysRef.current.e ||
      abilityActive;

    const cam = camera as THREE.PerspectiveCamera;
    if (cam.fov !== undefined) {
      const targetFov = isCurrentlyBoosting ? 82.0 : 65.0 + Math.min(14.0, speedFactor * 12.0);
      cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, dt * 6.0);
      cam.updateProjectionMatrix();
    }

    const targetSpaceZ = isBoost ? 60.0 : 40.0 + speedFactor * 10.0;

    const diveSwing = pointerRef.current.y * 14.0 * transitionFactor;
    const yawSwing = -pointerRef.current.x * 16.0 * transitionFactor;

    const spaceCamOffset = v_spaceCamOffset.current.set(yawSwing, 10.0 - diveSwing, targetSpaceZ);

    cameraOffset.current.lerpVectors(hangarCamOffset, spaceCamOffset, transitionFactor);

    if (!cameraLagInitialized.current) {
      cameraLagQuat.current.copy(baseQuat.current);
      cameraLagInitialized.current = true;
    } else {
      cameraLagQuat.current.slerp(baseQuat.current, Math.min(1, dt * 9));
    }
    const camQuat = cameraLagQuat.current;

    const rco = v_rco.current.copy(cameraOffset.current).applyQuaternion(camQuat);

    const targetCamPos = v_targetCamPos.current.copy(ship.position).add(rco);

    camera.position.copy(targetCamPos);

    const hangarUp = v_hangarUp.current.set(0, 1, 0);
    const spaceUp = v_spaceUp.current.set(0, 1, 0).applyQuaternion(camQuat);
    camera.up.copy(hangarUp.lerp(spaceUp, transitionFactor));

    const lookAtHangarVec = v_temp1.current.set(0, 0.1, -10).applyQuaternion(camQuat);
    const hangarLookAt = v_hangarLookAt.current.copy(ship.position).add(lookAtHangarVec);

    const lookAtSpaceVec = v_temp2.current.set(0, 0, -12).applyQuaternion(camQuat);
    const spaceLookAt = v_spaceLookAt.current.copy(ship.position).add(lookAtSpaceVec);

    camera.lookAt(hangarLookAt.lerp(spaceLookAt, transitionFactor));

    // Head-bob de cockpit em alta velocidade
    if (!isHangarActive && transitionFactor > 0.98) {
      const bobStrength = speedFactor * (isBoost ? 1.6 : 1.0);
      if (bobStrength > 0.01) {
        const t = state.clock.elapsedTime;
        camera.position.y += Math.sin(t * 22.0) * 0.045 * bobStrength;
        camera.position.x += Math.sin(t * 14.5 + 1.3) * 0.03 * bobStrength;
      }
    }

    if (shakeRef.current > 0.01) {
      camera.position.x += (Math.random() - 0.5) * shakeRef.current;
      camera.position.y += (Math.random() - 0.5) * shakeRef.current;
      shakeRef.current = THREE.MathUtils.lerp(shakeRef.current, 0, dt * 6);
    }

    for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
      const e = explosionsRef.current[i];
      e.life -= dt * 1.8;
      if (e.life <= 0) {
        explosionsRef.current.splice(i, 1);
        continue;
      }
      for (let j = 0; j < e.particles.length; j++) {
        const p = e.particles[j];
        v_temp1.current.copy(p.vel).multiplyScalar(dt);
        p.pos.add(v_temp1.current);
      }
    }
  });

  return null;
}
