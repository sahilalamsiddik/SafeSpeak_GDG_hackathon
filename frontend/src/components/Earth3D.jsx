import React, { useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';

const Earth = () => {
  const earthRef = useRef();
  const cloudsRef = useRef();

  // Load realistic textures from public three.js repository
  const [colorMap, normalMap, specularMap, cloudsMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'
  ]);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.001; // Earth rotation
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0012; // Clouds rotate slightly faster
    }
  });

  return (
    <group>
      {/* Realistic Earth */}
      <Sphere ref={earthRef} args={[2, 64, 64]}>
        <meshPhongMaterial
          map={colorMap}
          normalMap={normalMap}
          specularMap={specularMap}
          specular={new THREE.Color('grey')}
          shininess={50}
        />
      </Sphere>
      
      {/* Cloud Layer */}
      <Sphere ref={cloudsRef} args={[2.02, 64, 64]}>
        <meshPhongMaterial
          map={cloudsMap}
          transparent={true}
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </Sphere>
    </group>
  );
};

const Satellites = () => {
  const satellitesRef = useRef();

  // Create random satellite positions
  const satellitesCount = 300;
  const positions = new Float32Array(satellitesCount * 3);
  for (let i = 0; i < satellitesCount * 3; i += 3) {
    const r = 2.1 + Math.random() * 0.4; // Orbit radius just outside clouds
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i] = r * Math.sin(phi) * Math.cos(theta);
    positions[i+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i+2] = r * Math.cos(phi);
  }

  useFrame(() => {
    if (satellitesRef.current) {
      satellitesRef.current.rotation.y -= 0.002;
      satellitesRef.current.rotation.z += 0.001;
    }
  });

  return (
    <points ref={satellitesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={satellitesCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#FFD700"
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const Earth3D = () => {
  return (
    <div className="absolute inset-0 w-full h-full -z-10 bg-black fixed">
      {/* Moved camera closer to make Earth cover ~80% of screen height */}
      <Canvas camera={{ position: [0, 0, 3.2], fov: 60 }}>
        {/* Realistic Lighting for Space */}
        <ambientLight intensity={0.1} />
        <directionalLight position={[5, 3, 5]} intensity={1.5} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <React.Suspense fallback={null}>
          <Earth />
          <Satellites />
        </React.Suspense>
      </Canvas>
    </div>
  );
};

export default Earth3D;
