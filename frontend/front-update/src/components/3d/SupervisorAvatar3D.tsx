import React, { useRef, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ─── 3D Avatar Sphere with initials ──────────────────
const AvatarSphere: React.FC<{ initials: string; isActive: boolean; color: string }> = ({ initials, isActive, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle rotate on idle
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
      meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.3) * 0.08;
    }
    if (ringRef.current && isActive) {
      ringRef.current.rotation.z += 0.01;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.8}>
      <group>
        {/* Active ring */}
        {isActive && (
          <mesh ref={ringRef} position={[0, 0, -0.1]}>
            <torusGeometry args={[1.3, 0.06, 16, 64]} />
            <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} transparent opacity={0.9} />
          </mesh>
        )}

        {/* Main sphere */}
        <mesh
          ref={meshRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          scale={hovered ? 1.12 : 1}
        >
          <sphereGeometry args={[1, 64, 64]} />
          <MeshDistortMaterial
            color={color}
            roughness={0.2}
            metalness={0.6}
            distort={hovered ? 0.15 : 0.05}
            speed={2}
          />
        </mesh>

        {/* Initials text */}
        <Text
          position={[0, 0, 1.05]}
          fontSize={0.7}
          color="white"
          fontWeight={700}
          anchorX="center"
          anchorY="middle"
        >
          {initials}
        </Text>
      </group>
    </Float>
  );
};

// ─── Canvas wrapper ──────────────────────────────────
interface SupervisorAvatar3DProps {
  initials: string;
  isActive: boolean;
  colorIndex?: number;
}

const COLORS = ['#213448', '#547792', '#3b5998', '#2d4a6f', '#1a3a5c'];

const SupervisorAvatar3D: React.FC<SupervisorAvatar3DProps> = ({ initials, isActive, colorIndex = 0 }) => {
  return (
    <div style={{ width: 120, height: 120, cursor: 'pointer' }}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 5]} intensity={1} />
        <pointLight position={[-3, -2, 4]} intensity={0.5} color="#547792" />
        <AvatarSphere
          initials={initials}
          isActive={isActive}
          color={COLORS[colorIndex % COLORS.length]}
        />
      </Canvas>
    </div>
  );
};

export default SupervisorAvatar3D;
