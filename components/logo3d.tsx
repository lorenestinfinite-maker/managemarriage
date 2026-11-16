'use client';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

function LogoScene() {
  const m1Ref = useRef<THREE.Mesh>(null);
  const m2Ref = useRef<THREE.Mesh>(null);
  const arrowGroupRef = useRef<THREE.Group>(null);
  const diamondRef = useRef<THREE.Mesh>(null);
  const diamondMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  // The 30-second sequence logic
  useFrame(({ clock }) => {
    const t = clock.elapsedTime % 30; // 30-second loop

    // 1. First 'M' Ring (Rose Gold) - Pops in from 0.0s to 0.5s
    if (m1Ref.current) {
      const scale1 = t < 0.5 ? THREE.MathUtils.lerp(0, 1, t * 2) : 1;
      m1Ref.current.scale.setScalar(scale1);
    }

    // 2. Second 'M' Ring (Bright Gold) - Pops in from 0.5s to 1.0s
    if (m2Ref.current) {
      const scale2 = t > 0.5 && t < 1.0 ? THREE.MathUtils.lerp(0, 1, (t - 0.5) * 2) : t <= 0.5 ? 0 : 1;
      m2Ref.current.scale.setScalar(scale2);
    }

    // 3. Arrow Slashes Through - Slides up and right from 1.0s to 1.5s
    if (arrowGroupRef.current) {
      if (t <= 1.0) {
        arrowGroupRef.current.position.set(-2, -2, -1);
        arrowGroupRef.current.scale.setScalar(0);
      } else if (t > 1.0 && t < 1.5) {
        const progress = (t - 1.0) * 2;
        arrowGroupRef.current.position.set(
          THREE.MathUtils.lerp(-2, 0, progress),
          THREE.MathUtils.lerp(-2, 0, progress),
          0
        );
        arrowGroupRef.current.scale.setScalar(progress);
      } else {
        arrowGroupRef.current.position.set(0, 0, 0);
        arrowGroupRef.current.scale.setScalar(1);
      }
    }

    // 4. Diamond Double Flash - Spikes at 1.8s and 2.2s, then rests for 27+ seconds
    if (diamondRef.current && diamondMaterialRef.current) {
      if (t <= 1.5) {
        diamondRef.current.scale.setScalar(0);
        diamondMaterialRef.current.emissiveIntensity = 0;
      } else {
        diamondRef.current.scale.setScalar(1);
        
        // Flash 1 (1.8s)
        if (t > 1.7 && t < 1.9) diamondMaterialRef.current.emissiveIntensity = 5;
        // Flash 2 (2.2s)
        else if (t > 2.1 && t < 2.4) diamondMaterialRef.current.emissiveIntensity = 10;
        // Resting Glow (2.4s to 30.0s)
        else diamondMaterialRef.current.emissiveIntensity = 0.5;
      }
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group scale={1.2}>
        
        {/* Left 'M' Ring (Rose Gold) */}
        <mesh ref={m1Ref} position={[-0.4, -0.2, 0.2]} rotation={[0, 0, -Math.PI / 4]}>
          <torusGeometry args={[0.6, 0.12, 16, 48, Math.PI * 1.5]} />
          <meshPhysicalMaterial color="#f43f5e" metalness={1} roughness={0.2} clearcoat={1} />
        </mesh>

        {/* Right 'M' Ring (Bright Gold) */}
        <mesh ref={m2Ref} position={[0.4, -0.2, -0.2]} rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[0.6, 0.12, 16, 48, Math.PI * 1.5]} />
          <meshPhysicalMaterial color="#fbbf24" metalness={1} roughness={0.15} clearcoat={1} />
        </mesh>

        {/* Financial Arrow */}
        <group ref={arrowGroupRef}>
          {/* Arrow Shaft */}
          <mesh position={[0.2, 0.2, 0.5]} rotation={[0, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.06, 0.06, 1.8, 16]} />
            <meshPhysicalMaterial color="#fef08a" metalness={1} roughness={0.1} />
          </mesh>
          {/* Arrow Head */}
          <mesh position={[0.85, 0.85, 0.5]} rotation={[0, 0, -Math.PI / 4]}>
            <coneGeometry args={[0.18, 0.4, 16]} />
            <meshPhysicalMaterial color="#fef08a" metalness={1} roughness={0.1} />
          </mesh>
        </group>

        {/* Diamond Tip */}
        <mesh ref={diamondRef} position={[0, 0.7, 0]}>
          <octahedronGeometry args={[0.25, 0]} />
          <meshPhysicalMaterial 
            ref={diamondMaterialRef}
            color="#ffffff" 
            metalness={0.1} 
            roughness={0} 
            transmission={0.9} 
            thickness={0.5} 
            emissive="#ffffff"
          />
        </mesh>

      </group>
    </Float>
  );
}

export default function Logo3D() {
  return (
    <div className="w-16 h-16 relative">
      <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} className="w-full h-full cursor-pointer pointer-events-none">
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={2} />
        <directionalLight position={[-5, -5, -5]} intensity={0.5} color="#f43f5e" />
        <Environment preset="studio" />
        <LogoScene />
      </Canvas>
    </div>
  );
}