import { useRef, useMemo, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RouteData } from "../../../types";
import { getRouteBehavior } from "../../../routes/routeBehaviors";

export const DestroyedSatelliteModel = memo(function DestroyedSatelliteModel({ 
  position, 
  rotation, 
  scale, 
  selectedRoute 
}: { 
  position: [number, number, number], 
  rotation: [number, number, number], 
  scale: number, 
  selectedRoute: RouteData 
}) {
  const meshRef = useRef<THREE.Group>(null);
  useFrame((state, delta) => { 
    if (meshRef.current) { 
      meshRef.current.rotation.x += delta * 0.05; 
      meshRef.current.rotation.y += delta * 0.08; 
    } 
  });
  
  const satelliteStyle = useMemo(() => {
    return getRouteBehavior(selectedRoute.id).satelliteStyle;
  }, [selectedRoute.id]);

  return (
    <group ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 3, 8]} />
        <meshStandardMaterial color={satelliteStyle.metalColor} metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[1.5, 0, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[2, 0.1, 1]} />
        <meshStandardMaterial color={satelliteStyle.panelColor} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-1.5, 0.5, 0]} rotation={[0.5, 0, -0.4]}>
        <boxGeometry args={[2, 0.1, 1]} />
        <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.8} />
      </mesh>
      <pointLight color={satelliteStyle.lightColor} distance={25} intensity={2.0} />
    </group>
  );
});
