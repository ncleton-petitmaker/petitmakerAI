import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { domaines } from '../data/domaines';

const CubeFace = ({ position, rotation, title, description, image, isHovered, setHovered }) => {
  const meshRef = useRef();
  const texture = useTexture(image);
  
  // Memoize geometry and materials
  const geometry = useMemo(() => new THREE.BoxGeometry(2, 2, 0.1), []);
  const overlayGeometry = useMemo(() => new THREE.BoxGeometry(2, 2, 0.01), []);
  
  useFrame(() => {
    if (meshRef.current && isHovered) {
      meshRef.current.scale.lerp(new THREE.Vector3(1.1, 1.1, 1), 0.1);
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  return (
    <group position={new THREE.Vector3(...position)} rotation={new THREE.Euler(...rotation)}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        geometry={geometry}
      >
        <meshStandardMaterial 
          map={texture}
          transparent
          opacity={isHovered ? 1 : 0.8}
        />
        
        <group position={[0, 0, 0.06]}>
          <mesh geometry={overlayGeometry}>
            <meshBasicMaterial 
              transparent
              opacity={0.7}
              color={isHovered ? "#1E40AF" : "#1E3A8A"}
            />
          </mesh>
          
          <Text
            position={[0, 0.5, 0.01]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.8}
          >
            {title}
          </Text>
          
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.8}
          >
            {description}
          </Text>
        </group>
      </mesh>
    </group>
  );
};

const Scene = () => {
  return (
    <Canvas
      camera={{ position: [3, 3, 5], fov: 50 }}
      dpr={[1, 2]} // Optimize for different screen densities
      performance={{ min: 0.5 }} // Allow frame rate to drop for better performance
    >
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      <Cube />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxDistance={10}
        minDistance={4}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
      />
    </Canvas>
  );
};

export default Scene;